import { RpcNode } from '../../shared/RpcNode';
import { SQSMessage } from 'sqs-consumer';
import { RouterCaller } from '../infrastructure/router-caller';
import {
  SwapRequest,
  TransactionsRepository,
} from '../../persistence/domain/transactions-repository';
import { Logger } from '../../shared/domain/logger';

interface QuoteSwap {
  toChainId: string;
  srcToken: string;
  dstToken: string;
  bridgeAmountOut: string;
  minAmountOut: string;
}

export default class TransactionConsumer {
  constructor(
    private readonly routerCaller: RouterCaller,
    private readonly repository: TransactionsRepository,
    private readonly logger: Logger,
  ) {}

  async process(message: SQSMessage) {
    const body = JSON.parse(message.Body);
    const txHash = body.txHash;

    this.logger.log('Processing message w/ txHash ' + txHash);

    // Get details from Multichain API
    const tx = await this.repository.getTx(txHash);

    // If tx doesnt exist on the DB, something wrong happened
    if (tx === null) {
      throw new Error('!! Tx not indexed !!');
    }

    if (!tx.bridged || !tx.bridgeAmountOut) {
      throw new Error('Tx not bridged yet');
    }

    const router = body.router;
    const receiver = body.receiver;
    const toChainId = body.toChain;
    const srcToken = body.srcToken;
    const dstToken = body.dstToken;
    const minAmountOut = body.minAmount;

    const swapDetails = await this.getSwapDetails({
      toChainId: toChainId,
      srcToken: srcToken,
      dstToken: dstToken,
      bridgeAmountOut: tx.bridgeAmountOut,
      minAmountOut: minAmountOut,
    });

    await this.routerCaller.call({
      rpcNode: RpcNode[toChainId],
      routerAddress: router,
      receiverAddress: receiver,
      txHash: txHash,
      swap: swapDetails,
    });

    this.logger.log('Tx executed');
  }

  /**
   * Computes the swap details given the job
   * @param swap
   * @private
   */
  private async getSwapDetails(swap: QuoteSwap) {
    this.logger.log('Quoting swap ', swap);
    const swapOrder = await this.repository.quoteSwap(<SwapRequest>{
      chainId: swap.toChainId,
      tokenIn: swap.srcToken,
      tokenOut: swap.dstToken,
      amountIn: swap.bridgeAmountOut,
      minAmountOut: swap.minAmountOut,
    });

    const fixGas = this.getFunctionEstimateGas();
    const estimatedGas = fixGas + swapOrder.estimatedGas;

    return {
      providerCode: swapOrder.providerCode,
      amountIn: swap.bridgeAmountOut,
      tokenIn: swapOrder.tokenIn,
      tokenOut: swapOrder.tokenOut,
      estimatedGas: estimatedGas,
      data: swapOrder.data,
      required: swapOrder.required,
    };
  }

  private getFunctionEstimateGas() {
    return 500000;
  }
}

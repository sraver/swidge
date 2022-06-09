import { HttpClient } from '../../../shared/http/httpClient';
import {
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionsRepository,
  SwapRequest,
} from '../../domain/TransactionsRepository';
import { ConfigService } from '../../../config/config.service';
import { Inject } from '@nestjs/common';
import { Class } from '../../../shared/Class';
import { SwapOrder } from '../../domain/SwapOrder';

export class TransactionsRepositoryImpl implements TransactionsRepository {
  constructor(
    private readonly configService: ConfigService,
    @Inject(Class.HttpClient) private readonly httpClient: HttpClient,
  ) {}

  /**
   * Store a newly created transaction
   * @param payload
   */
  public async create(payload: CreateTransactionPayload): Promise<void> {
    await this.httpClient.post(`${this.configService.apiUrl}/transaction`, {
      txHash: payload.txHash,
      walletAddress: payload.walletAddress,
      routerAddress: payload.routerAddress,
      fromChainId: payload.fromChainId,
      toChainId: payload.toChainId,
      srcToken: payload.srcToken,
      bridgeTokenIn: payload.bridgeTokenIn,
      bridgeTokenOut: payload.bridgeTokenOut,
      dstToken: payload.dstToken,
      amount: payload.amountIn.toString(),
    });
  }

  /**
   * Store an existent transaction
   * @param payload
   */
  public async update(payload: UpdateTransactionPayload): Promise<void> {
    await this.httpClient.put(
      `${this.configService.apiUrl}/transaction/${payload.txHash}`,
      {
        bridgeAmountIn: payload.bridgeAmountIn ? payload.bridgeAmountIn : '',
        bridgeAmountOut: payload.bridgeAmountOut ? payload.bridgeAmountOut : '',
        amountOut: payload.amountOut ? payload.amountOut : '',
        bridged: payload.bridged ? payload.bridged.getTime() : '',
        completed: payload.completed ? payload.completed.getTime() : '',
      },
    );
  }

  /**
   * Quote the required data for a swap
   * @param request
   */
  public async quoteSwap(request: SwapRequest): Promise<SwapOrder> {
    const response = await this.httpClient.get<{
      code: string;
      tokenIn: string;
      tokenOut: string;
      data: string;
      required: boolean;
    }>(
      `${this.configService.apiUrl}/quote/swap` +
      `?chainId=${request.chainId}` +
      `&tokenIn=${request.tokenIn}` +
      `&tokenOut=${request.tokenOut}` +
      `&amountIn=${request.amountIn.toString()}`,
    );

    return new SwapOrder(
      Number(response.code),
      response.tokenIn,
      response.tokenOut,
      response.data,
      response.required,
    );
  }

  /**
   * Fetch the current router address
   */
  public async getRouterAddress(): Promise<string> {
    const response = await this.httpClient.get<{
      address: string;
    }>(`${this.configService.apiUrl}/address/router`);

    return response.address;
  }
}
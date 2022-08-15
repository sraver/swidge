import { Aggregator } from '../aggregator';
import { AggregatorRequest } from '../aggregator-request';
import LIFI, { Step } from '@lifi/sdk';
import { BigInteger } from '../../../shared/domain/big-integer';
import { TransactionDetails } from '../../../shared/domain/transaction-details';
import { Route } from '../../../shared/domain/route';
import { RouteStep } from '../../../shared/domain/route-step';
import { Token } from '../../../shared/domain/token';
import { InsufficientLiquidity } from '../../../swaps/domain/insufficient-liquidity';
import { ProviderDetails } from '../../../shared/domain/provider-details';
import { RouteResume } from '../../../shared/domain/route-resume';

export class LiFi implements Aggregator {
  private enabledChains: string[];
  private client: LIFI;

  constructor() {
    this.enabledChains = [];
    this.client = new LIFI();
  }

  isEnabledOn(fromChainId: string, toChainId: string): boolean {
    return this.enabledChains.includes(fromChainId) && this.enabledChains.includes(toChainId);
  }

  /**
   * Entrypoint to quote a Route from Li.fi
   * @param request
   */
  async execute(request: AggregatorRequest): Promise<Route> {
    try {
      const response = await this.client.getQuote({
        fromChain: request.fromChain,
        fromToken: request.fromToken.address,
        toChain: request.toChain,
        toToken: request.toToken.address,
        fromAmount: request.amountIn.toString(),
        fromAddress: '0x0000000000000000000000000000000000000000',
        slippage: request.slippage / 100,
      });

      const transactionDetails = new TransactionDetails(
        response.transactionRequest.to,
        response.estimate.approvalAddress,
        response.transactionRequest.data.toString(),
        BigInteger.fromString(response.transactionRequest.value.toString()),
        BigInteger.fromString(response.transactionRequest.gasLimit.toString()),
        BigInteger.fromString(response.transactionRequest.gasPrice.toString()),
      );

      const steps = this.createSteps(response);

      const resume = new RouteResume(
        request.fromChain,
        request.toChain,
        request.fromToken,
        request.toToken,
        request.amountIn,
        BigInteger.fromString(response.estimate.toAmount),
        BigInteger.fromString(response.estimate.toAmountMin),
      );

      return new Route(resume, transactionDetails, steps);
    } catch (e) {
      throw new InsufficientLiquidity();
    }
  }

  /**
   * Create the steps of the route
   * @param step
   * @private
   */
  private createSteps(step: Step): RouteStep[] {
    let steps = [];

    switch (step.type) {
      case 'swap':
        steps.push(this.createStep(step));
        break;
      case 'cross':
        steps.push(this.createStep(step));
        break;
      case 'lifi':
        steps = step.includedSteps.map((s) => this.createStep(s));
        break;
    }

    return steps;
  }

  /**
   * Create a single step
   * @param step
   * @private
   */
  private createStep(step: Step): RouteStep {
    const fromToken = new Token(
      step.action.fromToken.name,
      step.action.fromToken.address,
      step.action.fromToken.decimals,
      step.action.fromToken.symbol,
    );
    const toToken = new Token(
      step.action.toToken.name,
      step.action.toToken.address,
      step.action.toToken.decimals,
      step.action.toToken.symbol,
    );

    let feeInUSD = 0;
    // include all the fees from the step
    if (step.estimate.gasCosts) {
      for (const entry of step.estimate.gasCosts) {
        feeInUSD += Number(entry.amountUSD);
      }
    }
    if (step.estimate.feeCosts) {
      for (const entry of step.estimate.feeCosts) {
        feeInUSD += Number(entry.amountUSD);
      }
    }

    let type;
    switch (step.type) {
      case 'swap':
        type = RouteStep.TYPE_SWAP;
        break;
      case 'cross':
        type = RouteStep.TYPE_SWAP;
        break;
    }

    const details = new ProviderDetails(step.toolDetails.name, step.toolDetails.logoURI);

    return new RouteStep(
      type,
      details,
      fromToken,
      toToken,
      BigInteger.fromString(step.estimate.fromAmount),
      BigInteger.fromString(step.estimate.toAmount),
      feeInUSD.toString(),
    );
  }
}
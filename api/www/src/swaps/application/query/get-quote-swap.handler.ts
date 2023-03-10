import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuoteSwapQuery } from './get-quote-swap.query';
import { Inject } from '@nestjs/common';
import { TokenDetailsFetcher } from '../../../shared/infrastructure/TokenDetailsFetcher';
import { Class } from '../../../shared/Class';
import { ZeroEx } from '../../domain/providers/zero-ex';
import { HttpClient } from '../../../shared/infrastructure/http/httpClient';
import { Exchanges } from '../../domain/exchanges';
import { ExchangeProviders } from '../../domain/providers/exchange-providers';
import { Sushiswap } from '../../domain/providers/sushiswap';
import { LastSwapComputer } from '../../domain/last-swap-computer';
import { BigInteger } from '../../../shared/domain/big-integer';
import { LastSwapComputeRequest } from '../../domain/last-swap-compute-request';
import { SwapOrder } from '../../domain/swap-order';
import { SushiPoolsTheGraph } from '../../infrastructure/theGraph/sushi-pools-the-graph';

@QueryHandler(GetQuoteSwapQuery)
export class GetQuoteSwapHandler implements IQueryHandler<GetQuoteSwapQuery> {
  private swapComputer: LastSwapComputer;

  constructor(
    @Inject(Class.HttpClient) private readonly httpClient: HttpClient,
    @Inject(Class.TokenDetailsFetcher) private readonly tokenDetailsFetcher: TokenDetailsFetcher,
    @Inject(Class.SushiPairsTheGraph) private readonly theGraph: SushiPoolsTheGraph,
  ) {
    const exchanges = new Exchanges([
      [ExchangeProviders.ZeroEx, new ZeroEx(httpClient)],
      [ExchangeProviders.Sushi, new Sushiswap(theGraph)],
    ]);
    this.swapComputer = new LastSwapComputer(exchanges);
  }

  /**
   * Entrypoint
   * @param query
   */
  async execute(query: GetQuoteSwapQuery): Promise<SwapOrder> {
    const srcToken = await this.tokenDetailsFetcher.fetch(query.srcToken, query.chainId);
    const dstToken = await this.tokenDetailsFetcher.fetch(query.dstToken, query.chainId);
    const amountIn = BigInteger.fromString(query.amount);
    const minAmountOut = BigInteger.fromString(query.minAmountOut);

    const swapRequest = new LastSwapComputeRequest(
      query.chainId,
      srcToken,
      dstToken,
      amountIn,
      minAmountOut,
    );

    return this.swapComputer.compute(swapRequest);
  }
}

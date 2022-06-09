import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetQuoteSwapQuery } from './get-quote-swap.query';
import { GetSwapOrder } from './get-swap-order';
import { SwapRequest } from '../../domain/SwapRequest';
import { BigInteger } from '../../../shared/domain/BigInteger';
import { SwapOrder } from '../../domain/SwapOrder';
import { Inject } from '@nestjs/common';
import { TokenDetailsFetcher } from '../../../shared/infrastructure/TokenDetailsFetcher';
import { Class } from '../../../shared/Class';

@QueryHandler(GetQuoteSwapQuery)
export class GetQuoteSwapHandler implements IQueryHandler<GetQuoteSwapQuery> {
  constructor(
    private readonly swapQuery: GetSwapOrder,
    @Inject(Class.TokenDetailsFetcher)
    private readonly tokenDetailsFetcher: TokenDetailsFetcher,
  ) {}

  async execute(query: GetQuoteSwapQuery): Promise<SwapOrder> {
    const srcToken = await this.tokenDetailsFetcher.fetch(
      query.srcToken,
      query.chainId,
    );
    const dstToken = await this.tokenDetailsFetcher.fetch(
      query.dstToken,
      query.chainId,
    );
    const request = new SwapRequest(
      query.chainId,
      srcToken,
      dstToken,
      BigInteger.fromBigNumber(query.amount),
    );

    return await this.swapQuery.execute(request);
  }
}
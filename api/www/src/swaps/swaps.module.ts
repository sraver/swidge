import { Module } from '@nestjs/common';
import httpClientProvider from '../shared/infrastructure/http/httpClient.provider';
import { GetSwapQuoteController } from './infrastructure/controllers/get-swap-quote.controller';
import { CqrsModule } from '@nestjs/cqrs';
import { GetQuoteSwapHandler } from './application/query/get-quote-swap.handler';
import tokenDetailsFetcherProvider from '../shared/infrastructure/TokenDetailsFetcher.provider';
import cachedHttpClientProvider from '../shared/infrastructure/http/cachedHttpClient.provider';
import sushiPairsRepositoryProvider from './infrastructure/database/repositories/sushi-pairs.repository.provider';
import { UpdateSushiPairsController } from './infrastructure/controllers/update-sushi-pairs.controller';
import { UpdateSushiPairsHandler } from './application/command/update-sushi-pairs.handler';
import sushiPoolsTheGraphProvider from './infrastructure/theGraph/sushi-pools-the-graph.provider';

@Module({
  imports: [CqrsModule],
  controllers: [GetSwapQuoteController, UpdateSushiPairsController],
  providers: [
    GetQuoteSwapHandler,
    UpdateSushiPairsHandler,
    httpClientProvider(),
    cachedHttpClientProvider(),
    tokenDetailsFetcherProvider(),
    sushiPairsRepositoryProvider(),
    sushiPoolsTheGraphProvider(),
  ],
})
export class SwapsModule {}

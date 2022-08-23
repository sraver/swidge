import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Class } from '../../../shared/Class';
import { Logger } from '../../../shared/domain/logger';
import { AggregatorProviders } from '../../domain/providers/aggregator-providers';
import { ConfigService } from '../../../config/config.service';
import CheckTxStatusQuery from './check-tx-status-query';
import { ViaExchange } from '../../domain/providers/via-exchange';
import { StatusCheckResponse } from '../../domain/status-check';
import { ExternalAggregator } from 'src/aggregators/domain/aggregator';
import { Rango } from '../../domain/providers/rango';
import { CachedPriceFeedFetcher } from '../../../shared/domain/cached-price-feed-fetcher';
import { CachedGasPriceFetcher } from '../../../shared/domain/cached-gas-price-fetcher';
import { LiFi } from '../../domain/providers/liFi';

@QueryHandler(CheckTxStatusQuery)
export class CheckTxStatusHandler implements IQueryHandler<CheckTxStatusQuery> {
  private aggregators: Map<string, ExternalAggregator>;

  constructor(
    private readonly configService: ConfigService,
    @Inject(Class.PriceFeedFetcher) private readonly priceFeedFetcher: CachedPriceFeedFetcher,
    @Inject(Class.GasPriceFetcher) private readonly gasPriceFetcher: CachedGasPriceFetcher,
    @Inject(Class.Logger) private readonly logger: Logger,
  ) {
    this.aggregators = new Map<string, ExternalAggregator>([
      [AggregatorProviders.LiFi, LiFi.create()],
      [
        AggregatorProviders.Via,
        ViaExchange.create(configService.getViaApiKey(), gasPriceFetcher, priceFeedFetcher),
      ],
      [AggregatorProviders.Rango, Rango.create(configService.getRangoApiKey(), priceFeedFetcher)],
    ]);
  }

  async execute(query: CheckTxStatusQuery): Promise<StatusCheckResponse> {
    return this.aggregators.get(query.aggregatorId).checkStatus({
      fromChain: query.fromChain,
      toChain: query.toChain,
      txHash: query.txHash,
      trackingId: query.trackingId,
    });
  }
}
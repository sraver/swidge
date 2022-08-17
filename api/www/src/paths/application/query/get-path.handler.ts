import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPathQuery } from './get-path.query';
import { TokenDetailsFetcher } from '../../../shared/infrastructure/TokenDetailsFetcher';
import { Inject } from '@nestjs/common';
import { Class } from '../../../shared/Class';
import { PathComputer } from '../../domain/path-computer';
import { PriceFeedFetcher } from '../../../shared/infrastructure/PriceFeedFetcher';
import { GasPriceFetcher } from '../../../shared/infrastructure/GasPriceFetcher';
import { Route } from '../../../shared/domain/route';
import { Bridges } from '../../../bridges/domain/bridges';
import { Multichain } from '../../../bridges/domain/providers/multichain';
import { HttpClient } from '../../../shared/infrastructure/http/httpClient';
import { CachedHttpClient } from '../../../shared/infrastructure/http/cachedHttpClient';
import { BridgeProviders } from '../../../bridges/domain/providers/bridge-providers';
import { Exchanges } from '../../../swaps/domain/exchanges';
import { ExchangeProviders } from '../../../swaps/domain/providers/exchange-providers';
import { ZeroEx } from '../../../swaps/domain/providers/zero-ex';
import { Sushiswap } from '../../../swaps/domain/providers/sushiswap';
import { SushiPairsRepository } from '../../../swaps/domain/sushi-pairs-repository';
import { Aggregators } from '../../../aggregators/domain/aggregators';
import { AggregatorProviders } from '../../../aggregators/domain/providers/aggregator-providers';
import { LiFi } from '../../../aggregators/domain/providers/liFi';
import { Logger } from '../../../shared/domain/logger';
import { ViaExchange } from '../../../aggregators/domain/providers/via-exchange';
import { ConfigService } from '../../../config/config.service';

@QueryHandler(GetPathQuery)
export class GetPathHandler implements IQueryHandler<GetPathQuery> {
  private pathComputer: PathComputer;

  constructor(
    private readonly configService: ConfigService,
    @Inject(Class.HttpClient) private readonly httpClient: HttpClient,
    @Inject(Class.CachedHttpClient) private readonly cachedHttpClient: CachedHttpClient,
    @Inject(Class.TokenDetailsFetcher) private readonly tokenDetailsFetcher: TokenDetailsFetcher,
    @Inject(Class.PriceFeedFetcher) private readonly priceFeedFetcher: PriceFeedFetcher,
    @Inject(Class.GasPriceFetcher) private readonly gasPriceFetcher: GasPriceFetcher,
    @Inject(Class.SushiPairsRepository) private readonly sushiPairsRepository: SushiPairsRepository,
    @Inject(Class.Logger) private readonly logger: Logger,
  ) {
    const bridges = new Bridges([
      [BridgeProviders.Multichain, new Multichain(cachedHttpClient)]
    ]);


    const exchanges = new Exchanges([
      [ExchangeProviders.ZeroEx, new ZeroEx(httpClient)],
      [ExchangeProviders.Sushi, new Sushiswap(httpClient, sushiPairsRepository)],
    ]);

    const aggregators = new Aggregators([
      [AggregatorProviders.LiFi, new LiFi()],
      [AggregatorProviders.Via, ViaExchange.create(configService.getViaApiKey())],
    ]);

    this.pathComputer = new PathComputer(
      exchanges,
      bridges,
      aggregators,
      tokenDetailsFetcher,
      priceFeedFetcher,
      gasPriceFetcher,
      logger,
    );
  }

  async execute(query: GetPathQuery): Promise<Route[]> {
    return this.pathComputer.compute(query);
  }
}

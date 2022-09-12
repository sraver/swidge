import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Class } from '../../../shared/Class';
import { Logger } from '../../../shared/domain/logger';
import { MetadataProviderAggregator } from 'src/aggregators/domain/aggregator';
import GetMetadataQuery from './get-metadata-query';
import { AggregatorProviders } from '../../../aggregators/domain/providers/aggregator-providers';
import { LiFi } from '../../../aggregators/domain/providers/liFi';
import Metadata from '../../domain/Metadata';
import { Rango } from '../../../aggregators/domain/providers/rango';
import { ConfigService } from '../../../config/config.service';

@QueryHandler(GetMetadataQuery)
export class GetMetadataHandler implements IQueryHandler<GetMetadataQuery> {
  private aggregators: Map<string, MetadataProviderAggregator>;
  private cache: Metadata | undefined;
  private deadline: number | undefined;
  private readonly CACHE_TIME = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    @Inject(Class.Logger) private readonly logger: Logger,
  ) {
    this.aggregators = new Map<string, MetadataProviderAggregator>([
      [AggregatorProviders.LiFi, LiFi.create(logger)],
      [AggregatorProviders.Rango, Rango.create(configService.getRangoApiKey(), logger)],
    ]);
  }

  async execute(): Promise<Metadata> {
    this.logger.log('Fetching metadata...');

    if (this.isCached()) {
      this.logger.log('Cached meta');
      return this.cache;
    }

    const metadata = new Metadata();
    let isEligibleForCache = true;
    for (const aggregator of this.aggregators.values()) {
      const meta = await aggregator.getMetadata();
      metadata.includeAggregatorMetadata(meta);
      isEligibleForCache =
        isEligibleForCache && meta.chains.length !== 0 && meta.tokens.length !== 0;
    }

    if (isEligibleForCache) {
      this.logger.log('Stored meta on cache');
      this.cache = metadata;
      this.deadline = this.getDeadline();
    }

    return metadata;
  }

  /**
   * Checks if result is cached and still valid
   * @private
   */
  private isCached(): boolean {
    if (!this.cache) {
      return false;
    }
    return new Date().getTime() < this.deadline;
  }

  /**
   * Computes the deadline given the current time
   * @private
   */
  private getDeadline(): number {
    return new Date().getTime() + this.CACHE_TIME;
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { PathsModule } from './paths/paths.module';
import { SwapsModule } from './swaps/swaps.module';
import databaseConfiguration from './config/database.configuration';
import { TokensModule } from './tokens/tokens.module';
import { AggregatorsModule } from './aggregators/aggregators.module';
import { MetadataModule } from './metadata/metadata.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfiguration()),
    HealthModule,
    PathsModule,
    SwapsModule,
    TokensModule,
    AggregatorsModule,
    MetadataModule,
  ],
})
export class AppModule {}

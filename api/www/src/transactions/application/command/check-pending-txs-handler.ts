import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '../../../config/config.service';
import { ExternalAggregator } from '../../../aggregators/domain/aggregator';
import { AggregatorProviders } from '../../../aggregators/domain/providers/aggregator-providers';
import { Rango } from '../../../aggregators/domain/providers/rango';
import { LiFi } from '../../../aggregators/domain/providers/liFi';
import {
  ExternalTransactionStatus,
  StatusCheckResponse,
} from '../../../aggregators/domain/status-check';
import { Inject } from '@nestjs/common';
import { Class } from '../../../shared/Class';
import { TransactionsRepository } from '../../domain/TransactionsRepository';
import { Logger } from '../../../shared/domain/logger';
import { CheckPendingTxsCommand } from './check-pending-txs-command';
import { Transaction } from '../../domain/Transaction';
import { TransactionStep } from '../../domain/TransactionStep';

@CommandHandler(CheckPendingTxsCommand)
export class CheckPendingTxsHandler implements ICommandHandler<CheckPendingTxsCommand> {
  private aggregators: Map<string, ExternalAggregator>;

  constructor(
    private readonly configService: ConfigService,
    @Inject(Class.TransactionRepository) private readonly repository: TransactionsRepository,
    @Inject(Class.Logger) private readonly logger: Logger,
  ) {
    this.aggregators = new Map<string, ExternalAggregator>([
      [AggregatorProviders.LiFi, LiFi.create(logger)],
      [AggregatorProviders.Rango, Rango.create(configService.getRangoApiKey(), logger)],
    ]);
  }

  /**
   * Entrypoint
   */
  async execute(): Promise<void> {
    const txs = await this.repository.getPending();

    for (const tx of txs.items<Transaction[]>()) {
      await this.checkTx(tx);
    }
  }

  private async checkTx(tx: Transaction) {
    try {
      this.logger.log(`Rechecking ${tx.id}...`);

      const lastStep = tx.lastStep();
      const status = await this.checkTxStatus(lastStep);

      if (status.status !== ExternalTransactionStatus.Pending) {
        lastStep
          .markAsCompleted(new Date())
          .setDestinationTxHash(status.dstTxHash)
          .setDestinationToken(status.toToken)
          .setAmountOut(status.amountOut)
          .setStatus(status.status);

        tx.updateLastStep(lastStep);

        await this.repository.update(tx);

        this.logger.log(`${tx.id} finished w/ status ${status.status}`);
      } else {
        this.logger.log(`${tx.id} still pending`);
      }
    } catch (e) {
      this.logger.error(`Rechecking ${tx.id} failed: ${e}`);
    }
  }

  /**
   * fetches te status of a tx from the provider
   * @private
   * @param step
   */
  private async checkTxStatus(step: TransactionStep): Promise<StatusCheckResponse> {
    return this.aggregators.get(step.aggregatorId).checkStatus({
      fromChain: step.fromChainId,
      toChain: step.toChainId,
      txHash: step.originTxHash,
      trackingId: step.trackingId,
    });
  }
}

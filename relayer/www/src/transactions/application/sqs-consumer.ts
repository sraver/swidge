import { CustomLogger } from '../../logger/CustomLogger';
import { Inject } from '@nestjs/common';
import { Class } from '../../shared/Class';
import { TransactionsRepository } from '../domain/TransactionsRepository';
import * as https from 'https';
import * as http from 'http';
import { Consumer, SQSMessage } from 'sqs-consumer';
import { SQS } from 'aws-sdk';
import { ConfigService } from '../../config/config.service';
import { TransactionProcessor } from './transaction-processor';
import { TransactionJob } from '../domain/TransactionJob';

export class SqsConsumer {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
    private readonly transactionProcessor: TransactionProcessor,
    @Inject(Class.TransactionsRepository)
    private readonly repository: TransactionsRepository,
  ) {}

  /**
   * Starts a consumer of transaction jobs
   */
  public async start() {
    const consumer = Consumer.create({
      queueUrl: this.configService.sqsQueueUrl,
      messageAttributeNames: ['All'],
      handleMessage: async (message: SQSMessage) => {
        const txHash = message.MessageAttributes.txHash.StringValue;
        this.logger.log('Processing message w/ txHash ' + txHash);

        // Get details from Multichain API
        const tx = await this.repository.getTx(txHash);

        // If tx doesnt exist on the DB, something wrong happened
        if (tx === null) {
          throw new Error('!! Tx not indexed !!');
        }

        if (!tx.bridged || !tx.bridgeAmountOut) {
          throw new Error('Tx not bridged yet');
        }

        // If tx is found, finish process
        const transactionJob: TransactionJob = {
          txHash: txHash,
          router: message.MessageAttributes.router.StringValue,
          srcToken: message.MessageAttributes.srcToken.StringValue,
          dstToken: message.MessageAttributes.dstToken.StringValue,
          toChainId: message.MessageAttributes.toChain.StringValue,
          walletAddress: message.MessageAttributes.wallet.StringValue,
          bridgeAmountOut: tx.bridgeAmountOut,
        };
        await this.transactionProcessor.execute(transactionJob);
      },
      sqs: new SQS({
        region: this.configService.region,
        accessKeyId: this.configService.accessKey,
        secretAccessKey: this.configService.secret,
        httpOptions: {
          agent: this.getAgent(),
        },
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    consumer.on('error', (err) => {
      self.logger.error(err);
    });

    consumer.on('processing_error', (err) => {
      self.logger.log('processing_error ', err.message);
    });

    consumer.on('message_processed', (msg) => {
      self.logger.log('message_processed ', msg);
    });

    consumer.start();
  }

  private getAgent() {
    if (this.configService.isProduction) {
      return new https.Agent({
        keepAlive: true,
      });
    }

    return new http.Agent({
      keepAlive: true,
    });
  }
}

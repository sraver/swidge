import { Body, Controller, Post, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { PostTxExecutedDto } from './post-tx-executed-dto';
import { ExecutedTxCommand } from '../../application/command/executed-tx-command';

@Controller()
export class PostTxExecutedController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('tx-executed')
  async build(@Body() params: PostTxExecutedDto, @Res() res: Response) {
    const command = new ExecutedTxCommand(
      params.txId,
      params.txHash,
      params.aggregatorId,
      params.fromChainId,
      params.toChainId,
      params.fromAddress,
      params.toAddress,
      params.fromToken,
      params.toToken,
      params.amountIn,
      params.trackingId,
    );

    this.commandBus.execute<ExecutedTxCommand, void>(command);

    return res.json({
      status: 'ok',
    });
  }
}

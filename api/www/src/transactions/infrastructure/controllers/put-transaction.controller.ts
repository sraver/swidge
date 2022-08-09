import { Body, Controller, Put, Res, SetMetadata } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { CustomController } from '../../../shared/infrastructure/CustomController';
import { UpdateTransactionCommand } from '../../application/command/update-transaction.command';
import {
  AUTH_GUARD_CONFIG,
  AuthGuardConfig,
} from '../../../shared/infrastructure/AuthGuard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateTransactionDto } from './update-transaction-dto';

@Controller()
export class PutTransactionController extends CustomController {
  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  @Put('/transaction')
  @ApiBearerAuth()
  @SetMetadata(AUTH_GUARD_CONFIG, { protected: true } as AuthGuardConfig)
  async postTransaction(@Body() body: UpdateTransactionDto, @Res() res: Response) {
    const command = new UpdateTransactionCommand(
      body.txHash,
      body.destinationTxHash,
      body.amountOut,
      body.bridgeAmountIn,
      body.bridgeAmountOut,
      body.bridged,
      body.completed,
    );

    await this.commandBus.execute(command);

    return res.status(200).send();
  }
}

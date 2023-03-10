import { Controller, Get, Query, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetQuoteSwapQuery } from '../../application/query/get-quote-swap.query';
import { Response } from 'express';
import { SwapOrder } from '../../domain/swap-order';

@Controller()
export class GetSwapQuoteController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('/quote/swap')
  async getSwapQuote(
    @Query('chainId') chainId: string,
    @Query('tokenIn') tokenIn: string,
    @Query('tokenOut') tokenOut: string,
    @Query('amountIn') amountIn: string,
    @Query('minAmountOut') minAmountOut: string,
    @Res() res: Response,
  ) {
    const query = new GetQuoteSwapQuery(chainId, tokenIn, tokenOut, amountIn, minAmountOut);

    const order = await this.queryBus.execute<GetQuoteSwapQuery, SwapOrder>(query);

    return res.json({
      code: order.providerCode,
      tokenIn: order.tokenIn.address,
      tokenOut: order.tokenOut.address,
      data: order.data,
      estimatedGas: order.estimatedGas.toString(),
      required: order.required,
    });
  }
}

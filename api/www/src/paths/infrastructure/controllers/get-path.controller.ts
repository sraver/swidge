import { Controller, Get, Query, Res } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Response } from 'express';
import { GetPathQuery } from '../../application/query/get-path.query';
import { Path } from '../../domain/Path';
import { GetPathDto } from './GetPathDto';
import { Token } from '../../../shared/domain/Token';

@Controller()
export class GetPathController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('path')
  async getPossiblePath(@Query() getPathDto: GetPathDto, @Res() res: Response) {
    const query = new GetPathQuery(
      getPathDto.fromChainId,
      getPathDto.toChainId,
      getPathDto.srcToken,
      getPathDto.dstToken,
      getPathDto.amount,
    );

    const path = await this.queryBus.execute<GetPathQuery, Path>(query);

    return res.json({
      router: path.router,
      amountOut: path.amountOut,
      originSwap: {
        code: path.originSwap.providerCode,
        tokenIn: this.mapTokenDetails(path.originSwap.tokenIn),
        tokenOut: this.mapTokenDetails(path.originSwap.tokenOut),
        data: path.originSwap.data,
        required: path.originSwap.required,
        amountOut: path.originSwap.buyAmountDecimal,
      },
      bridge: {
        tokenIn: this.mapTokenDetails(path.bridging.tokenIn),
        tokenOut: this.mapTokenDetails(path.bridging.tokenOut),
        toChainId: path.bridging.toChainId,
        data: path.bridging.data,
        required: path.bridging.required,
        amountOut: path.bridging.amountOutDecimal,
      },
      destinationSwap: {
        tokenIn: this.mapTokenDetails(path.destinationSwap.tokenIn),
        tokenOut: this.mapTokenDetails(path.destinationSwap.tokenOut),
        required: path.destinationSwap.required,
      },
    });
  }

  private mapTokenDetails(token: Token) {
    return {
      name: token.name,
      address: token.address,
    };
  }
}
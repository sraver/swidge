export class UpdateTransactionCommand {
  constructor(
    readonly txHash: string,
    readonly amountOut: string,
    readonly bridgeAmountIn: string,
    readonly bridgeAmountOut: string,
    readonly bridged: string,
    readonly completed: string,
  ) {}
}

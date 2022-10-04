export interface TransactionsList {
    transactions: Transaction[]
}

export interface Transaction {
    originTxHash: string
    status: string
    date: string
    fromChain: string
    toChain: string
    srcAsset: string
    dstAsset: string
    amountIn: string
    amountOut: string
    destinationTxHash: string
}

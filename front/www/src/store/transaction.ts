import { acceptHMRUpdate, defineStore } from 'pinia'
import Route, { TransactionDetails } from '@/domain/paths/path'
import { useWeb3Store } from '@/store/web3'
import { useRoutesStore } from '@/store/routes'
import { useMetadataStore } from '@/store/metadata'
import swidgeApi from '@/api/swidge-api'
import { TransactionStatus } from '@/api/models/get-status-check'
import { TxExecutedRequest } from '@/api/models/post-tx-executed'
import { ethers } from 'ethers'
import { Tx } from '@/domain/transactions/transactions'

export const useTransactionStore = defineStore('transaction', {
    state: () => ({
        mainTx: undefined as undefined | TransactionDetails,
        approvalContract: undefined as undefined | string,
        executingRoute: undefined as undefined | Route,
        trackingId: '',
        statusCheckInterval: 0,
        txId: '',
        currentNonce: 0,
        list: [] as Tx[]
    }),
    getters: {
        getMainTx(): TransactionDetails | undefined {
            return this.mainTx
        },
        getTxFromList(state) {
            return (txId: string): Tx | undefined => {
                return state.list.find(tx => tx.id === txId)
            }
        }
    },
    actions: {
        /**
         * Fetches the callData for the main tx
         */
        async fetchMainTx() {
            const web3Store = useWeb3Store()
            const routesStore = useRoutesStore()
            const srcToken = routesStore.getOriginToken()
            const dstToken = routesStore.getDestinationToken()
            if (!srcToken || !dstToken) {
                throw new Error('Some token is not selected')
            }
            const route = routesStore.getSelectedRoute
            const details = await swidgeApi.getMainTx({
                aggregatorId: route.aggregator.id,
                routeId: route.aggregator.routeId,
                fromChainId: routesStore.getOriginChainId,
                toChainId: routesStore.getDestinationChainId,
                srcTokenAddress: srcToken.address,
                srcTokenSymbol: srcToken.symbol,
                srcTokenDecimals: srcToken.decimals.toString(),
                dstTokenAddress: dstToken.address,
                dstTokenSymbol: dstToken.symbol,
                dstTokenDecimals: dstToken.decimals.toString(),
                amount: routesStore.getAmountIn,
                slippage: Number(routesStore.getSlippage),
                senderAddress: web3Store.account,
                receiverAddress: routesStore.receiverAddress,
            })
            this.mainTx = details.tx
            this.trackingId = details.trackingId
            this.approvalContract = details.approvalContract
        },
        /**
         * process that executes the selected route
         */
        executeRoute: async function (route: Route) {
            this.executingRoute = route
            if (!this.mainTx) {
                await this.fetchMainTx()
            }
            if (!this.mainTx) {
                throw new Error('failed fetching tx')
            }
            const web3Store = useWeb3Store()
            await web3Store.approveIfRequired({
                token: route.resume.tokenIn.address,
                spender: this.approvalContract,
                amount: ethers.utils.parseUnits(route.resume.amountIn, route.resume.tokenIn.decimals).toString()
            })
            return web3Store.sendMainTransaction(this.mainTx)
        },
        /**
         * Informs the provider the tx has been executed
         */
        async informExecutedTx(txHash: string) {
            const web3Store = useWeb3Store()
            const routesStore = useRoutesStore()
            const route = this.executingRoute
            if (!route) {
                throw new Error('no executing route')
            }
            if (!this.mainTx) {
                throw new Error('something very wrong, what did we execute then?')
            }
            this.txId = route.id
            const amountIn = ethers.utils.parseUnits(route.resume.amountIn, route.resume.tokenIn.decimals).toString()
            const amountOut = ethers.utils.parseUnits(route.resume.amountOut, route.resume.tokenOut.decimals).toString()

            const request = {
                txId: this.txId,
                txHash: txHash,
                aggregatorId: route.aggregator.id,
                fromChainId: route.resume.fromChain,
                toChainId: route.resume.toChain,
                fromAddress: web3Store.account,
                toAddress: routesStore.receiverAddress,
                fromToken: route.resume.tokenIn.address,
                toToken: route.resume.tokenOut.address,
                amountIn: amountIn,
                trackingId: this.trackingId,
            }

            // immediately store in local array
            this.addTxToLocalList(request, amountOut, route.resume.executionTime)
            this.executingRoute = undefined

            // inform backend about tx
            swidgeApi.informExecutedTx(request)
                .catch(() => {
                    // if request failed, store on localstorage
                    // and start retrying until success
                    storePendingTx(request)
                    this.startRetryingSendingPendingTxs()
                })
        },
        /**
         * used to check if pending txs to be stored
         * and fire an interval to try to store them until success
         */
        startRetryingSendingPendingTxs() {
            const pendingTxs = getStoredPendingTxs()
            // if pending txs to inform to backend, start trying
            if (pendingTxs.length > 0) {
                setInterval(this.retrySendingPendingTxs, 5000)
            }
        },
        /**
         * tries to store all pending executed txs until success
         */
        retrySendingPendingTxs() {
            const pendingTxs = getStoredPendingTxs()
            // for every pending tx, try to inform
            pendingTxs.forEach((params) => {
                swidgeApi.informExecutedTx(params)
                    .then(() => {
                        // when successful make sure its on the list
                        // and remove pending
                        this.addTxToLocalList(params)
                        removePendingTx(params)
                    })
            })
        },
        /**
         * adds a tx to the local list
         * @param params
         * @param expectedAmount
         * @param executionTime
         */
        addTxToLocalList(params: TxExecutedRequest, expectedAmount = '', executionTime = 0) {
            const tx = this.list.find(tx => tx.id === params.txId)
            if (!tx) {
                // store only if not existent
                this.list.unshift({
                    id: params.txId,
                    originTxHash: params.txHash,
                    destinationTxHash: '',
                    status: params.fromChainId === params.toChainId
                        ? TransactionStatus.Success
                        : TransactionStatus.Pending,
                    date: new Date().toString(),
                    fromChain: params.fromChainId,
                    toChain: params.toChainId,
                    srcAsset: params.fromToken,
                    dstAsset: params.toToken,
                    amountIn: params.amountIn,
                    amountOut: expectedAmount,
                    expectedTime: executionTime
                })
            }
        },
        /**
         * Sets an interval to check the status of the TX until it succeeds or fails
         */
        startCheckingStatus: function () {
            this.statusCheckInterval = window.setInterval(() => {
                swidgeApi.checkTxStatus({
                    txId: this.txId,
                }).then(response => {
                    const metadataStore = useMetadataStore()
                    if (response.status !== TransactionStatus.Pending) {
                        this.setTransactionResult(response.txId, response.status, response.amountOut, response.dstTxHash)
                        this.stopCheckingStatus()
                        if (response.status === TransactionStatus.Success) {
                            metadataStore.fetchBalances()
                        }
                    }
                })
            }, 5000)
        },
        /**
         * updates the ongoing transaction
         * @param txId
         * @param status
         * @param amountOut
         * @param txHash
         */
        setTransactionResult: function (txId: string, status: TransactionStatus, amountOut: string, txHash: string) {
            this.list = this.list.map(tx => {
                if (tx.id == txId) {
                    tx.status = status
                    tx.amountOut = amountOut
                    tx.destinationTxHash = txHash
                }
                return tx
            })
        },
        /**
         * stops the interval
         */
        stopCheckingStatus: function () {
            clearInterval(this.statusCheckInterval)
        },
        /**
         * fetches and stores the current nonce of the wallet to have the correct count
         */
        setCurrentNonce: async function () {
            const web3Store = useWeb3Store()
            this.currentNonce = await web3Store.getCurrentNonce()
        },
        /**
         * increment the current nonce
         */
        incrementNonce: function () {
            this.currentNonce = this.currentNonce + 1
        },
        /**
         * fetches and loads the list of the wallet txs
         */
        fetchTransactions: function (address: string) {
            swidgeApi.getTransactions(address).then(
                (transactions) => {
                    this.list = transactions
                }
            )
        }
    }
})

const PENDING_TXS_STORAGE_KEY = 'swidge_pending_txs'

function storePendingTx(params: TxExecutedRequest) {
    const pendingRequests = getStoredPendingTxs()
    pendingRequests.push(params)
    storePendingTxs(pendingRequests)
}

function getStoredPendingTxs(): TxExecutedRequest[] {
    const rawPendingTxs = localStorage.getItem(PENDING_TXS_STORAGE_KEY)
    return rawPendingTxs
        ? JSON.parse(rawPendingTxs)
        : []
}

function storePendingTxs(txs: TxExecutedRequest[]) {
    localStorage.setItem(PENDING_TXS_STORAGE_KEY, JSON.stringify(txs))
}

function removePendingTx(tx: TxExecutedRequest) {
    const pendingRequests = getStoredPendingTxs()
    const filtered = pendingRequests.filter((current) => {
        return (
            current.aggregatorId !== tx.aggregatorId &&
            current.fromChainId !== tx.fromChainId &&
            current.toChainId !== tx.toChainId &&
            current.fromAddress !== tx.fromAddress &&
            current.toAddress !== tx.toAddress &&
            current.fromToken !== tx.fromToken &&
            current.amountIn !== tx.amountIn &&
            current.txHash !== tx.txHash &&
            current.trackingId !== tx.trackingId
        )
    })
    storePendingTxs(filtered)
}

if (import.meta.hot)
    import.meta.hot.accept(acceptHMRUpdate(useTransactionStore, import.meta.hot))

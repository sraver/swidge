import { acceptHMRUpdate, defineStore } from 'pinia'
import { ApprovalTransactionDetails, TransactionDetails } from '@/domain/paths/path'
import { useTokensStore } from '@/store/tokens'
import { useWeb3Store } from '@/store/web3'
import swidgeApi from '@/api/swidge-api'
import { useRoutesStore } from '@/store/routes'
import { TransactionStatus } from '@/api/models/get-status-check'

export const useTransactionStore = defineStore('transaction', {
    state: () => ({
        approvalTx: undefined as undefined | ApprovalTransactionDetails,
        mainTx: undefined as undefined | TransactionDetails,
        trackingId: '',
        statusCheckInterval: 0,
        txHash: '',
        currentNonce: 0,
    }),
    getters: {
        getApprovalTx(): ApprovalTransactionDetails | undefined {
            return this.approvalTx
        },
        getMainTx(): TransactionDetails | undefined {
            return this.mainTx
        },
    },
    actions: {
        /**
         * Fetches the callData for the approval tx
         */
        async fetchApprovalTx() {
            const web3Store = useWeb3Store()
            const routesStore = useRoutesStore()
            const route = routesStore.getSelectedRoute
            this.approvalTx = await swidgeApi.getApprovalTx({
                aggregatorId: route.aggregator.id,
                routeId: route.aggregator.routeId,
                senderAddress: web3Store.account
            })
        },
        /**
         * Fetches the callData for the main tx
         */
        async fetchMainTx() {
            const web3Store = useWeb3Store()
            const routesStore = useRoutesStore()
            const route = routesStore.getSelectedRoute
            this.mainTx = await swidgeApi.getMainTx({
                aggregatorId: route.aggregator.id,
                routeId: route.aggregator.routeId,
                senderAddress: web3Store.account,
                receiverAddress: web3Store.account,
            })
        },
        /**
         * Fetches the callData of both required transactions to execute the swidge
         * @param amount
         */
        async fetchBothTxs(amount: string) {
            const tokensStore = useTokensStore()
            const web3Store = useWeb3Store()
            const routesStore = useRoutesStore()
            const route = routesStore.getSelectedRoute
            const txs = await swidgeApi.getBothTxs({
                aggregatorId: route.aggregator.id,
                fromChainId: tokensStore.getOriginChainId,
                toChainId: tokensStore.getDestinationChainId,
                srcToken: tokensStore.getOriginTokenAddress,
                dstToken: tokensStore.getDestinationTokenAddress,
                amount: amount,
                slippage: Number(routesStore.getSlippage),
                senderAddress: web3Store.account,
                receiverAddress: web3Store.account
            })
            this.trackingId = txs.trackingId
            this.approvalTx = txs.approvalTx
            this.mainTx = txs.mainTx
        },
        /**
         * Informs the provider the tx has been executed
         */
        informExecutedTx(txHash: string) {
            this.txHash = txHash
            const web3Store = useWeb3Store()
            const routesStore = useRoutesStore()
            const route = routesStore.getSelectedRoute
            swidgeApi.informExecutedTx({
                aggregatorId: route.aggregator.id,
                fromAddress: web3Store.account,
                toAddress: web3Store.account,
                txHash: this.txHash,
                trackingId: this.trackingId,
            })
        },
        /**
         * Sets an interval to check the status of the TX until it succeeds or fails
         */
        startCheckingStatus: function () {
            this.statusCheckInterval = window.setInterval(() => {
                const routesStore = useRoutesStore()
                const tokensStore = useTokensStore()
                const route = routesStore.getSelectedRoute
                swidgeApi.checkTxStatus({
                    aggregatorId: route.aggregator.id,
                    fromChainId: tokensStore.getOriginChainId,
                    toChainId: tokensStore.getDestinationChainId,
                    txHash: this.txHash,
                    trackingId: this.trackingId,
                }).then(response => {
                    if (response.status === TransactionStatus.Success) {
                        const routesStore = useRoutesStore()
                        routesStore.completeRoute()
                        clearInterval(this.statusCheckInterval)
                    } else if (response.status === TransactionStatus.Failed) {
                        // TODO do something
                    }
                })
            }, 5000)
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
        incrementNonce: async function () {
            this.currentNonce = this.currentNonce + 1
        },
    }
})

if (import.meta.hot)
    import.meta.hot.accept(acceptHMRUpdate(useTransactionStore, import.meta.hot))

import { acceptHMRUpdate, defineStore } from 'pinia'
import SwidgeAPI from '@/api/swidge-api'
import Route from '@/domain/paths/path'
import { ethers } from 'ethers'
import { useTokensStore } from '@/store/tokens'
import { useWeb3Store } from '@/store/web3'
import { useTransactionStore } from '@/store/transaction';

export const useRoutesStore = defineStore('routes', {
    state: () => ({
        routes: [] as Route[],
        selectedRoute: 0,
        slippage: '2',
        gas: 'medium',
    }),
    getters: {
        getSelectedRoute(): Route {
            return this.routes[this.selectedRoute]
        },
        getSlippage(): string {
            return this.slippage
        },
        getGas(): string {
            return this.gas
        },
    },
    actions: {
        /**
         * Fetches the routes for a specific path
         * @param amount
         * @param slippage
         */
        async quotePath(amount: string, slippage: number) {
            const tokensStore = useTokensStore()
            const web3Store = useWeb3Store()
            this.routes = await SwidgeAPI.getQuote({
                fromChainId: tokensStore.getOriginChainId,
                srcToken: tokensStore.getOriginTokenAddress,
                toChainId: tokensStore.getDestinationChainId,
                dstToken: tokensStore.getDestinationTokenAddress,
                amount: amount,
                slippage: slippage,
                senderAddress: web3Store.account || ethers.constants.AddressZero,
                receiverAddress: web3Store.account || ethers.constants.AddressZero
            })
            this.selectRoute(0) // selects the top route
        },
        /**
         * Marks the route `index` as selected
         * @param index
         */
        selectRoute(index: number) {
            const transactionStore = useTransactionStore()
            this.selectedRoute = index
            const route = this.getSelectedRoute
            transactionStore.trackingId = route.aggregator.trackingId
            transactionStore.approvalTx = route.approvalTx
            transactionStore.mainTx = route.tx
        },
        /**
         * Sets as completed the first step of the selected route
         */
        completeFirstStep() {
            this.routes[this.selectedRoute].steps[0].completed = true
        },
        /**
         * Sets as completed the whole selected route
         */
        completeRoute() {
            this.routes[this.selectedRoute].steps.forEach(step => {
                step.completed = true
            })
            this.routes[this.selectedRoute].completed = true
        },
        setSlippage(value: string) {
            this.slippage = value
        },
        setGas(value: string) {
            this.gas = value
        }
    }
})

if (import.meta.hot)
    import.meta.hot.accept(acceptHMRUpdate(useRoutesStore, import.meta.hot))

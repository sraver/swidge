<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'
import { useWeb3Store } from '@/store/web3'
import { useRoutesStore } from '@/store/routes'
import { useTransactionStore } from '@/store/transaction'
import { useMetadataStore } from '@/store/metadata'
import { storeToRefs } from 'pinia'
import { useToast } from 'vue-toastification'
import ModalNetworkAndTokenSelect from '@/components/Modals/ModalNetworkAndTokenSelect.vue'
import ModalTransactionStatus from '@/components/Modals/ModalTransactionStatus.vue'
import ModalSettings from '@/components/Modals/ModalSettings.vue'
import { TxHash } from '@/domain/wallets/IWallet'
import SendingBox from '@/components/SendingBox.vue'
import ReceivingBox from '@/components/ReceivingBox.vue'
import AdjustmentsIcon from './svg/AdjustmentIcon.vue'
import ReloadIcon from '@/components/svg/ReloadIcon.vue'
import ActionButton from '@/components/Buttons/ActionButton.vue'
import FromToArrow from '@/components/Buttons/FromToArrow.vue'
import { IToken } from '@/domain/metadata/Metadata'
import RecipientUserCard from '@/components/RecipientUserCard.vue'
import { indexedErrors } from '@/api/models/get-quote'
import AmountFormatter from '@/domain/shared/AmountFormatter'

const web3Store = useWeb3Store()
const routesStore = useRoutesStore()
const transactionStore = useTransactionStore()
const { isValidReceiverAddress } = storeToRefs(routesStore)
const { isConnected } = storeToRefs(web3Store)
const toast = useToast()
const gtm = useGtm()

const isModalTokensOpen = ref(false)
const isSourceChainToken = ref(false)
const isExecuteButtonDisabled = ref(true)
const isModalStatusOpen = ref(false)
const statusModalTxId = ref<string>('')
const isSettingsModalOpen = ref(false)
const showTransactionAlert = ref(false)
const transactionAlertMessage = ref<string>('')
const isExecutingTransaction = ref<boolean>(false)

const reloadTimeout = ref<ReturnType<typeof setTimeout> | undefined>(undefined)

const buttonLabel = computed({
    get: () => {
        if (!web3Store.isConnected) {
            return 'Connect wallet'
        } else if (showTransactionAlert.value) {
            return transactionAlertMessage.value
        } else if (isExecutingTransaction.value) {
            return 'Executing'
        } else {
            return 'Swidge'
        }
    },
    set: () => null,
})

const setButtonAlert = (text: string) => {
    transactionAlertMessage.value = text
    showTransactionAlert.value = true
}

const unsetButtonAlert = () => {
    transactionAlertMessage.value = ''
    showTransactionAlert.value = false
}

const emitEventGTMTransaction = () => {
    const token = routesStore.getOriginToken()
    const amount = routesStore.getAmountIn
    const dollarAmount = Number(amount) * Number(token?.price)
    const fixedAmount = AmountFormatter.format(dollarAmount.toString())
    gtm?.trackEvent({
        event: 'transaction',
        value: fixedAmount,
    })
}

watch(isValidReceiverAddress, (isValid) => {
    if (!isValid) {
        setButtonAlert('Invalid receiver')
    } else {
        unsetButtonAlert()
    }
})

watch(isConnected, (connected) => {
    if (connected) {
        tryToQuote()
    }
})

const destinationChainSelected = computed({
    get: () => {
        return routesStore.getDestinationChainId
    },
    set: () => null,
})

/**
 * Handles the update of the amount on the origin amount
 */
const handleSourceInputChanged = () => {
    tryToQuote()
}

/**
 * Handles the opening of the token selection modal
 * @param isSource
 */
const handleOpenTokenList = (isSource: boolean) => {
    isSourceChainToken.value = isSource
    isModalTokensOpen.value = true
}

/**
 * Handles selection of a token from the selection modal
 * @param token
 */
const handleUpdateTokenFromModal = (token: IToken) => {
    const selectedOriginChainId = routesStore.getOriginChainId
    const selectedDestinationChainId = routesStore.getDestinationChainId
    const selectedOriginTokenAddress = routesStore.getOriginTokenAddress
    const selectedDestinationTokenAddress =
        routesStore.getDestinationTokenAddress

    if (isSourceChainToken.value) {
        // If the origin network is being chosen
        if (selectedOriginChainId != token.chainId) {
            // If network and token of source and destination are the same, switch inputs instead of setting new ones.
            if (
                token.chainId == selectedDestinationChainId &&
                token.address == selectedDestinationTokenAddress
            ) {
                switchHandlerFunction()
            } else {
                updateOriginToken(token)
            }
        } else {
            updateOriginToken(token)
        }
    } else {
        if (
            token.chainId == selectedOriginChainId &&
            token.address == selectedOriginTokenAddress
        ) {
            switchHandlerFunction()
        } else {
            // Update token details
            routesStore.selectDestinationToken(token.chainId, token.address)
        }
    }

    // Check if we can quote
    tryToQuote()

    // Close modal
    isModalTokensOpen.value = false
}

/**
 * Updates the selected origin token
 * @param token
 */
const updateOriginToken = async (token: IToken) => {
    const originTokenAddress = routesStore.getOriginTokenAddress
    const originTokenChainId = routesStore.getOriginChainId
    // If user selected a different token, update
    if (
        originTokenAddress !== token.address ||
        originTokenChainId !== token.chainId
    ) {
        // Update token details
        routesStore.selectOriginToken(token.chainId, token.address)
        // Reset amount
        routesStore.setAmountIn('')
        // Check user's token balance
    }
}

/**
 * Sets the transition variable switchDestinationChain to Current source Chain info
 */
const switchHandlerFunction = () => {
    routesStore.switchTokens()
    routesStore.setAmountIn('')
    isExecuteButtonDisabled.value = true
}

const loadingRoutes = () => {
    return routesStore.loadingRoutes
}

/**
 * Quotes the possible path for a given pair and amount
 */
const tryToQuote = async () => {
    if (
        !routesStore.bothTokensSelected ||
        Number(routesStore.getAmountIn) === 0
    ) {
        return
    }
    unsetButtonAlert()
    clearTimeout(reloadTimeout.value)

    isExecuteButtonDisabled.value = true

    try {
        await routesStore.quotePath()

        const thereAreRoutes = routesStore.getAllRoutes.length > 0
        if (!thereAreRoutes) {
            isExecuteButtonDisabled.value = false
        } else if (
            Number(routesStore.getAmountIn) >
            Number(routesStore.getSelectedTokenBalance)
        ) {
            setButtonAlert('Insufficient Balance')
        } else {
            isExecuteButtonDisabled.value = false
        }
    } catch (e: unknown) {
        onQuotingError(e as Error)
    } finally {
        reloadTimeout.value = setTimeout(tryToQuote, 15000)
    }
}

/**
 * What to do when quoting fails
 * @param e
 */
const onQuotingError = (e: Error) => {
    const errorMessage = indexedErrors[e.message] ?? 'Unhandled error!'
    setButtonAlert(errorMessage)
    isExecuteButtonDisabled.value = true
}

/**
 * Executes the transaction process
 */
const onExecuteTransaction = async () => {
    clearTimeout(reloadTimeout.value)
    const route = routesStore.getSelectedRoute
    if (!route) {
        throw new Error('No route')
    }
    if (!routesStore.isValidReceiverAddress) {
        // should never happen because button should be disabled
        // but better safe than sorry
        throw new Error('Invalid receiver address')
    }

    // Make sure on the correct chain
    await web3Store.switchToNetwork(route.resume.fromChain)
    await transactionStore.setCurrentNonce()

    // Start execution
    setExecutingButton()
    const toastId = toast.success('Starting execution...', { timeout: false })

    const promise = transactionStore.executeRoute(route)

    await promise
        .then((txHash: TxHash) => {
            toast.dismiss(toastId)
            onInitialTxCompleted(txHash)
            openTransactionStatusModal(route.id)
            emitEventGTMTransaction()
        })
        .catch((error) => {
            console.log(error)
            toast.dismiss(toastId)
            toast.error('Transaction failed')
            closeModalStatus()
        })
        .finally(() => {
            unsetExecutingButton()
        })
}

/**
 * Manages the process once the tx has been executed
 * @param txHash
 */
const onInitialTxCompleted = (txHash: TxHash) => {
    transactionStore.informExecutedTx(txHash)
    if (routesStore.isCrossChainRoute) {
        transactionStore.startCheckingStatus()
    } else {
        useMetadataStore().fetchBalances()
    }
}

/**
 * Sets the button to `executing` mode
 */
const setExecutingButton = () => {
    isExecutingTransaction.value = true
    isExecuteButtonDisabled.value = true
}

/**
 * Unsets the button from `executing` mode
 */
const unsetExecutingButton = () => {
    isExecutingTransaction.value = false
    isExecuteButtonDisabled.value = false
}

/**
 * Opens the transaction status modal after an executed transaction
 */
const openTransactionStatusModal = (txId: string) => {
    isModalStatusOpen.value = true
    statusModalTxId.value = txId
}

/**
 * Closes the transaction status modal,
 * closing also all the listeners set on the providers
 */
const closeModalStatus = () => {
    isModalStatusOpen.value = false
    statusModalTxId.value = ''
}

const handleChangedReceiver = (address: string) => {
    routesStore.setReceiverAddress(address)
    tryToQuote()
}
</script>

<template>
    <div
        class="flex flex-col gap-3 px-3 md:mt-[20px] w-full max-w-md rounded-xl"
    >
        <div
            class="flex justify-end gap-2 py-2 h-[var(--settings-line-height)]"
        >
            <ReloadIcon
                class="w-5 h-5 cursor-pointer"
                :class="
                    reloadTimeout && !loadingRoutes()
                        ? 'animate-[spin_1.5s_ease-in-out_infinite]'
                        : ''
                "
                @click="tryToQuote"
            />
            <AdjustmentsIcon
                class="w-5 h-5 cursor-pointer"
                @click="isSettingsModalOpen = true"
            />
        </div>
        <div class="flex flex-col">
            <SendingBox
                @input-changed="handleSourceInputChanged"
                @select-token="() => handleOpenTokenList(true)"
            />
            <FromToArrow @switch-tokens="switchHandlerFunction"/>
            <ReceivingBox @select-token="() => handleOpenTokenList(false)"/>
        </div>
        <RecipientUserCard
            v-if="destinationChainSelected"
            @changed-receiver="handleChangedReceiver"
        />
        <ActionButton
            :text="buttonLabel"
            :disabled="isExecuteButtonDisabled"
            :on-click="onExecuteTransaction"
        />
    </div>

    <ModalNetworkAndTokenSelect
        :is-modal-open="isModalTokensOpen"
        :is-origin="isSourceChainToken"
        @close-modal="isModalTokensOpen = false"
        @update-token="handleUpdateTokenFromModal($event)"
    />
    <ModalSettings
        :is-open="isSettingsModalOpen"
        @close-modal="isSettingsModalOpen = false"
    />
    <ModalTransactionStatus
        :show="isModalStatusOpen"
        :tx-id="statusModalTxId"
        @close-modal="closeModalStatus"
    />
</template>

<script setup lang="ts">
import {
    Popover,
    PopoverButton,
    PopoverPanel,
    TabGroup,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Switch
} from '@headlessui/vue'
import { NATIVE_COIN_ADDRESS, useWeb3Store } from '@/store/web3'
import { storeToRefs } from 'pinia'
import { useMetadataStore } from '@/store/metadata'
import { useTransactionStore } from '@/store/transaction'
import { computed, ref } from 'vue'
import { ethers } from 'ethers'
import TokenLogo from '@/components/Icons/TokenLogo.vue'
import ChainLogo from '@/components/Icons/ChainLogo.vue'
import { IToken } from '@/domain/metadata/Metadata'
import Address from '@/domain/shared/address'
import AmountFormatter from '@/domain/shared/AmountFormatter'
import CopyButton from '@/components/Buttons/CopyButton.vue'
import TransactionStatus from '@/components/Header/TransactionStatus.vue'

const web3Store = useWeb3Store()
const metadataStore = useMetadataStore()
const transactionsStore = useTransactionStore()
const { account } = storeToRefs(web3Store)

const showSmallBalances = ref(true)

const disconnect = () => {
    web3Store.disconnect()
}

const tokens = computed({
    get: () => {
        return metadataStore.balances
            .filter(token => {
                const amount = ethers.utils.formatUnits(token.balance.toString(), token.decimals)
                const dollarValue = Number(amount) * Number(token.price)
                return showSmallBalances.value || dollarValue >= 1
            })
            .sort((a, b) => {
                const amountA = ethers.utils.formatUnits(a.balance.toString(), a.decimals)
                const dollarValueA = Number(amountA) * Number(a.price)
                const amountB = ethers.utils.formatUnits(b.balance.toString(), b.decimals)
                const dollarValueB = Number(amountB) * Number(b.price)
                if (dollarValueA > dollarValueB) {
                    return -1
                } else if (dollarValueB > dollarValueA) {
                    return 1
                } else {
                    return 0
                }
            })
    },
    set: () => null
})

const emptyTokens = computed({
    get: () => {
        return tokens.value.length === 0
    },
    set: () => null
})

const getChainLogo = (chainId: string) => {
    const chain = metadataStore.getChain(chainId)
    return chain ? chain.logo : ''
}

const createShortAddress = (address: string): string => {
    return new Address(address).shortFormat()
}

const createShorterAddress = (address: string): string => {
    return new Address(address).extraShortFormat()
}

const formattedBalance = (token: IToken) => {
    return AmountFormatter.format(ethers.utils.formatUnits(token.balance.toString(), token.decimals))
}

const formattedUsdValue = (token: IToken) => {
    const amount = ethers.utils.formatUnits(token.balance.toString(), token.decimals)
    const dollarValue = Number(amount) * Number(token.price)
    return AmountFormatter.format(dollarValue.toFixed(2))
}

const getSelectedChainLogo = () => {
    return getChainLogo(web3Store.selectedNetworkId)
}

const getNativeCoinAmount = () => {
    const token = metadataStore.getToken(web3Store.selectedNetworkId, NATIVE_COIN_ADDRESS)
    if (!token) {
        return '0.0'
    }
    const amount = AmountFormatter.format(ethers.utils.formatEther(token.balance), 4)
    return `${amount} ${token.symbol}`
}
</script>

<template>
    <Popover>
        <PopoverButton class="header-button">
            <div class="hidden sm:inline flex justify-between items-center gap-1">
                <img :src="getSelectedChainLogo()" class="w-5 h-5 rounded-full inline"/>
                {{ getNativeCoinAmount() }}
            </div>
            <div class="flex justify-between gap-2 rounded-xl sm:pr-2 sm:bg-[#54545F]">
                <img src="../../assets/metamask.svg" class="w-5"/>
                {{ createShorterAddress(account) }}
            </div>
        </PopoverButton>

        <PopoverPanel
            class="absolute left-1/2 -translate-x-1/2 xs:right-2 xs:left-auto xs:translate-x-0 bg-black
            rounded-lg top-12 px-2 py-1 w-80 z-50 gradient-border-header-main-hover account-bg-gradient
            max-h-[90%] overflow-hidden"
        >
            <div class="flex flex-col">
                <div class="flex flex-row justify-between">
                    <div class="flex justify-start items-center gap-2">
                        <img src="../../assets/metamask.svg" class="w-5"/>
                        {{ createShortAddress(account) }}
                        <CopyButton :content="account"/>
                        <a :href="`https://blockscan.com/address/${account}`" target="_blank">
                            <img src="../../assets/explorer.svg"/>
                        </a>
                    </div>
                    <div class="">
                        <img
                            src="../../assets/disconnect.svg"
                            class="cursor-pointer"
                            @click="disconnect"/>
                    </div>
                </div>
                <div class="flex flex-col">
                    <TabGroup>
                        <TabList class="flex space-x-1 p-1">
                            <Tab v-slot="{ selected }" as="template">
                                <button
                                    class="tab-button"
                                    :class="{ 'selected': selected }"
                                >
                                    Assets
                                </button>
                            </Tab>
                            <Tab v-slot="{ selected }" as="template">
                                <button
                                    class="tab-button"
                                    :class="{ 'selected': selected }"
                                >
                                    History
                                </button>
                            </Tab>
                        </TabList>
                        <TabPanels>
                            <TabPanel class="">
                                <div
                                    v-if="emptyTokens"
                                    class="my-2 py-3 justify-center flex">
                                    We couldn't find assets
                                </div>
                                <div v-else>
                                    <div class="w-full items-center flex mb-3 gap-2">
                                        <Switch
                                            v-model="showSmallBalances"
                                            :class="showSmallBalances ? 'bg-blue-600' : 'bg-gray-200'"
                                            class="relative inline-flex h-4 w-10 items-center rounded-full"
                                        >
                                        <span
                                            :class="showSmallBalances ? 'translate-x-6' : 'translate-x-1'"
                                            class="inline-block h-3 w-3 transform rounded-full bg-[#543E71] transition"
                                        />
                                        </Switch>
                                        <span class="text-xs">Hide small balances</span>
                                    </div>
                                    <div
                                        class="flex flex-col gap-2"
                                        :class="{'h-[500px] overflow-auto overflow-x-hidden': !emptyTokens}">
                                        <div
                                            v-for="(token, index) in tokens"
                                            :key="index"
                                            class="flex flex-row justify-start py-1 pl-2">
                                            <div class="relative w-7">
                                                <TokenLogo
                                                    :token-logo="token.logo"
                                                    :chain-logo="token.logo"
                                                    size="28"
                                                />
                                                <ChainLogo :logo="getChainLogo(token.chainId)" size="14"/>
                                            </div>
                                            <div class="flex w-full justify-center gap-3">
                                                <div class="w-3/5 text-right relative">
                                                    {{ formattedBalance(token) }}
                                                    <span class="absolute top-[13px] right-0 text-[8px]">~ $ {{
                                                            formattedUsdValue(token)
                                                        }}</span>
                                                </div>
                                                <div class="w-2/5 text-left">
                                                    {{ token.symbol }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPanel>
                            <TabPanel
                                class="my-2"
                                :class="{'h-[500px] overflow-auto overflow-x-hidden': transactionsStore.list.length > 0}"
                            >
                                <div
                                    v-if="transactionsStore.list.length > 0"
                                    class="flex flex-col gap-2">
                                    <TransactionStatus
                                        v-for="(tx, index) in transactionsStore.list"
                                        :key="index"
                                        :transaction="tx"
                                    />
                                </div>
                                <div
                                    v-else
                                    class="py-3 justify-center flex"
                                >
                                    No transactions yet
                                </div>
                            </TabPanel>
                        </TabPanels>
                    </TabGroup>
                </div>
            </div>
        </PopoverPanel>
    </Popover>
</template>


<script setup lang='ts'>
import { ref } from 'vue'
import TokenDisplay from './TokenDisplay.vue'
import NetworkAndTokenNothingFound from './NetworkAndTokenNothingFound.vue'
import Spinner from 'vue-spinner/src/ScaleLoader.vue'
import { IChain, IToken } from '@/domain/metadata/Metadata'

const props = defineProps<{
    chainList: IChain[]
    tokens: IToken[]
    selectedNetworkId: string
    searchTerm: string
    isOrigin: boolean
    customTokens: boolean
    loadingCustomTokens: boolean
}>()
const emits = defineEmits<{
    (event: 'set-token', token: IToken): void
    (event: 'import-token', token: IToken): void
    (event: 'scroll-bottomed'): void
}>()

const listDiv = ref<HTMLElement | null>(null)

const clickOnToken = (token: IToken) => {
    if (props.customTokens) {
        emits('import-token', token)
    } else {
        emits('set-token', token)
    }
}

const getChain = (chainId: string) => {
    return props.chainList.find((chain) => chain.id === chainId)
}

const onScroll = (e: Event) => {
    const { scrollTop, offsetHeight, scrollHeight } = e.target as any
    if ((scrollTop + offsetHeight) >= scrollHeight) {
        emits('scroll-bottomed')
    }
}

const scrollToTop = () => {
    if (listDiv.value) {
        listDiv.value.scrollTop = 0
    }
}

defineExpose({
    scrollToTop
})
</script>

<template>
    <div class="text-lg font-roboto">
        <div class="flex gap-6 items-center">
            <span>Select Token:</span>
            <span
                v-if="selectedNetworkId !== '' || searchTerm !== ''"
                class="text-sm font-extralight mt-1 ml-auto">Balance</span>
        </div>
        <div
            ref="listDiv"
            class="h-80 w-full overflow-y-auto"
            @scroll="onScroll">
            <NetworkAndTokenNothingFound
                v-if="selectedNetworkId === '' && searchTerm === ''"
            />
            <ul
                v-else
                class="text-base flex flex-col mt-6">
                <li
                    v-for="(token, index) in tokens"
                    :key="index"
                    class="hover:bg-cards-background-dark-grey py-3 rounded-xl cursor-pointer"
                    @click="() => clickOnToken(token)"
                >
                    <TokenDisplay
                        :token="token"
                        :chain="getChain(token.chainId)"
                    />
                </li>
            </ul>
            <div v-if="loadingCustomTokens">
                <Spinner color="#5b5b5b"/>
            </div>
        </div>
    </div>
</template>

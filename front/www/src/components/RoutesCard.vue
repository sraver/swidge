<script setup lang="ts">
import { computed } from 'vue'
import DollarSign from './svg/DollarSign.vue'
import { ClockIcon } from '@heroicons/vue/outline'
import ProviderIcon from '@/components/Icons/ProviderIcon.vue'
import Route from '@/domain/paths/path'
import RouteCardOutputValue from '@/components/RouteCardOutputValue.vue'
import SwapIcon from './svg/SwapIcon.vue'
import Toolip from '@/components/Toolip.vue'

const props = defineProps<{
    route: Route
    selectedId: string
}>()

const emits = defineEmits<{
    (event: 'select-route', index: string): void
}>()

/**
 * when a click happens on the domain of the route card
 * @param event
 */
const onClick = (event: Event) => {
    if (!(event.target instanceof HTMLElement)) return
    emits('select-route', props.route.id)
}

/**
 * converts the seconds to a readable string
 * @param seconds
 */
const getExecutionTime = (seconds: number) => {
    if (seconds < 60) {
        return seconds.toFixed(0) + 's'
    } else {
        const minutes = seconds / 60
        return minutes.toFixed(0) + 'm'
    }
}

const tag = computed({
    get: () => {
        if (props.route.tags.length === 0) {
            return ''
        } else if (props.route.tags.length > 1) {
            return 'Best'
        } else {
            return props.route.tags[0].toString()
        }
    },
    set: () => null
})

const isSelected = computed({
    get: () => {
        return props.route.id === props.selectedId
    },
    set: () => null
})

const totalExecutionTime = computed({
    get: () => {
        return getExecutionTime(props.route.resume.executionTime)
    },
    set: () => null
})

</script>


<template>
    <div
        class="route-card"
        :class="{'selected' : isSelected}"
        @click="onClick"
    >
        <div v-if="isSelected" class="absolute -right-1 -top-1 bg-[#633767] rounded-3xl">
            <img
                src="../assets/check.svg"
                class="h-4 w-4 m-[2px]"/>
        </div>
        <div
            v-if="route.tags.length > 0"
            class="route-tag text-xl font-semibold"
        >
            {{ tag }}
        </div>
        <div class="route-details ml-2 my-3 justify-between">
            <RouteCardOutputValue
                :amount-in="route.resume.amountIn"
                :amount-out="route.resume.amountOut"
            />
            <div class="flex grid grid-cols-2 grid-rows-2 ">
                <div class="flex text-sm justify-center items-center">
                    <ClockIcon class="h-6 stroke-1"/>
                </div>
                <div class="flex text-sm field--execution-time justify-center items-center">
                    {{ totalExecutionTime }}
                </div>
                <div class="flex text-ellipsis text-sme justify-center items-center">
                    <DollarSign class="h-8 w-[10px] stroke-1"/>
                </div>
                <div class="flex text-ellipsis text-sm field--global-fee justify-center items-center">
                    ${{ Number(route.fees.amountInUsd).toFixed(2) }}
                </div>
            </div>
            <div class="relative flex flex-row w-1/3">
                <div class="flex items-center ">
                    <Toolip text="Providers">
                        <SwapIcon class="stroke-1 h-6 w-6 ml-2"/>
                    </Toolip>
                </div>
                <div class="flex items-center justify-center ml-4">
                    <div
                        v-for="(step, index) in route.providers"
                        :key="index"
                        :class="'z-'+index"
                        class="flex-1 flex-row -top-[3px] w-6 h-6 -ml-1 shadow-inner">
                        <ProviderIcon
                            :name="step.name"
                            :logo="step.logo"
                        />
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

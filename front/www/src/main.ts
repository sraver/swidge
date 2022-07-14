import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { createHead } from '@vueuse/head'
import generatedRoutes from 'virtual:generated-pages'
import { createPinia } from 'pinia'
import { createGtm } from '@gtm-support/vue-gtm'

import '@/styles/index.css'

const routes = setupLayouts(generatedRoutes)
const head = createHead()
const pinia = createPinia()

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App)

app.use(
    createGtm({
        id: 'GTM-K4SVQQD',
        queryParams: {
            // Add URL query string when loading gtm.js with GTM ID (required when using custom environments)
            gtm_auth: 'AB7cDEf3GHIjkl-MnOP8qr',
            gtm_preview: 'env-4',
            gtm_cookies_win: 'x',
        },
        defer: false, // Script can be set to `defer` to speed up page load at the cost of less accurate results (in case visitor leaves before script is loaded, which is unlikely but possible). Defaults to false, so the script is loaded `async` by default
        compatibility: false, // Will add `async` and `defer` to the script tag to not block requests for old browsers that do not support `async`
        nonce: '2726c7f26c', // Will add `nonce` to the script tag
        enabled: true, // defaults to true. Plugin can be disabled by setting this to false for Ex: enabled: !!GDPR_Cookie (optional)
        debug: false, // Whether or not display console logs debugs (optional)
        loadScript: false, // Whether or not to load the GTM Script (Helpful if you are including GTM manually, but need the dataLayer functionality in your components) (optional)
        vueRouter: router, // Pass the router instance to automatically sync with router (optional)
        ignoredViews: [], // Don't trigger events for specified router names (optional)
        trackOnNextTick: false, // Whether or not call trackView in Vue.nextTick
    }),
)

app.use(pinia)
app.use(router)
app.use(head)
app.mount('#app')



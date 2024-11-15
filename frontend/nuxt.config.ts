import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@wagmi/vue/nuxt'],
  compatibilityDate: '2024-11-12',
  ssr: false, // Disable SSR globally
  //plugins: ['~/plugins/wagmi.ts', '~/plugins/walletRegistration.ts'], // Include both plugins
})
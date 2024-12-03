import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/configuration/nuxt-config
// https://stackoverflow.com/questions/71951915/nuxt3-nuxt-directory-not-found-404-on-github-pages
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@wagmi/vue/nuxt', '@nuxt/fonts'],
  compatibilityDate: '2024-11-12',
  ssr: false,
  nitro: {
    preset: 'static', // Use the static Nitro preset
  },
  app: {
    // Set the base URL to the repository name for GitHub Pages
    baseURL: '/vote/',
  },
})
import { http, cookieStorage, createConfig, createStorage } from '@wagmi/vue';
import { mainnet, optimism, sepolia, hardhat } from '@wagmi/vue/chains'; // Import localhost
import { injected, metaMask, walletConnect } from '@wagmi/vue/connectors';

export const config = createConfig({
  chains: [mainnet, sepolia, optimism, hardhat], // Add localhost to the list of chains
  connectors: [
    injected(),
    // walletConnect({
    //   projectId: process.env.NUXT_PUBLIC_WC_PROJECT_ID!,
    // }),
    metaMask(),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  //ssr: true,
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'), 
    [sepolia.id]: http(),
    [mainnet.id]: http(),    
    [optimism.id]: http(),
  },
});

declare module '@wagmi/vue' {
  interface Register {
    config: typeof config;
  }
}

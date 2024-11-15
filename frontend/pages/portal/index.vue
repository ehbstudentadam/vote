<template>
  <div class="connect-wallet">
    <div v-if="!isConnected">
      <h2>Please connect your wallet to continue</h2>
      <div class="connect-buttons">
        <button
          v-for="connector in connectors"
          :key="connector.id"
          @click="connectWallet(connector)"
        >
          Connect with {{ connector.name }}
        </button>
      </div>
      <p v-if="connectionError" class="error">{{ connectionError }}</p>
    </div>
    <div v-else>
      <p>Wallet connected: {{ address }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAccount, useConnect } from '@wagmi/vue';

// Initialize Vue Router
const router = useRouter();

// Wagmi hooks
const { address, isConnected } = useAccount();
const { connectors, connectAsync, error: wagmiError } = useConnect();
const connectionError = ref(null);

// Watch for changes in the connection status
watch(isConnected, (connected) => {
  if (connected) {
    router.push('/'); // Redirect to the root path when connected
  }
});

// Function to handle wallet connection
const connectWallet = async (connector) => {
  connectionError.value = null;
  try {
    await connectAsync({ connector });
  } catch (err) {
    connectionError.value = wagmiError?.message || 'Failed to connect';
  }
};
</script>

<style scoped>
.connect-wallet {
  text-align: center;
}

.connect-buttons button {
  margin: 0.5rem;
}

.error {
  color: red;
}
</style>

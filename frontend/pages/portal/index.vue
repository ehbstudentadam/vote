<template>
  <div class="connect-wallet">
    <div v-if="!isConnected">
      <h2>Please connect your wallet to continue</h2>
      <div class="connect-buttons">
        <button v-for="connector in connectors" :key="connector.id" @click="connectWallet(connector)">
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
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccount, useConnect } from '@wagmi/vue';

// Initialize Vue Router
const router = useRouter();

// Wagmi hooks
const { address, isConnected } = useAccount();
const { connectors, connectAsync, error: wagmiError } = useConnect();
const connectionError = ref(null);

// Redirect to '/' if the wallet is connected
onMounted(() => {
  if (isConnected.value) {
    router.push('/');
  }
});

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
/* General styles */
.connect-wallet {
  font-family: 'Roboto Mono', monospace;
  text-align: center;
  padding: 2rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: #333;
}

/* Button container */
.connect-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

/* Button styles */
.connect-buttons button {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  color: #333;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 400;
  text-transform: uppercase;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  width: 200px;
}

.connect-buttons button:hover {
  background-color: #333;
  border-color: #333;
  color: #fff;
}

/* Error message */
.error {
  color: red;
  font-size: 0.9rem;
  margin-top: 1rem;
}
</style>

// ~/middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { readContract } from '@wagmi/core';
import { config } from '~/wagmi'; // Your wagmiConfig utility
import UserRegistrationArtifact from '~/artifacts/UserRegistration.json';
import { useAccount } from '@wagmi/vue';
import { watch } from 'vue';

// Extract the ABI from the contract artifact
const UserRegistrationABI = UserRegistrationArtifact.abi;
const userRegistrationContractAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

// Function to check registration status
function checkRegistrationStatus(address: string): Promise<'user' | 'instance' | 'not-registered'> {
  return new Promise((resolve) => {
    let status: 'user' | 'instance' | 'not-registered' = 'not-registered';

    // Read 'isUser' status
    readContract(config, {
      address: userRegistrationContractAddress,
      abi: UserRegistrationABI,
      functionName: 'isUser',
      args: [address],
    })
      .then((isUser) => {
        if (isUser) {
          status = 'user';
        }
      })
      .catch((error) => {
        console.error('Error checking isUser status:', error);
      })
      .finally(() => {
        // Read 'isInstance' status
        readContract(config, {
          address: userRegistrationContractAddress,
          abi: UserRegistrationABI,
          functionName: 'isInstance',
          args: [address],
        })
          .then((isInstance) => {
            if (isInstance) {
              status = 'instance';
            }
          })
          .catch((error) => {
            console.error('Error checking isInstance status:', error);
          })
          .finally(() => {
            resolve(status); // Resolve the status after both checks
          });
      });
  });
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { address, isConnected } = useAccount();

  // Watch for wallet disconnection and redirect to the portal if disconnected
  watch(isConnected, (connected) => {
    if (!connected) {
      navigateTo('/portal');
    }
  });

  // Redirect to the portal if the wallet is not connected
  if (!isConnected.value) {
    return navigateTo('/portal');
  }

  // If no address is available, redirect to the registration page
  if (!address.value) {
    return navigateTo('/portal');
  }

  // Check registration status
  const status = await checkRegistrationStatus(address.value);

  // Handle redirection based on the user status
  if (status === 'user' && to.path === '/register') {
    return navigateTo('/'); // Redirect registered users to the dashboard
  }

  if (status === 'instance' && to.path === '/register') {
    return navigateTo('/'); // Redirect registered instances to their dashboard
  }

  if (status === 'not-registered' && to.path !== '/register') {
    return navigateTo('/register'); // Redirect unregistered users to the registration page
  }
});

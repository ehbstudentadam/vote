// ~/middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { readContract } from '@wagmi/core';
import { config } from '~/wagmi';
import UserRegistrationArtifact from '~/artifacts/UserRegistration.json';
import { useAccount } from '@wagmi/vue';
import { watch } from 'vue';

// Extract the ABI from the contract artifact
const UserRegistrationABI = UserRegistrationArtifact.abi;
const userRegistrationContractAddress = import.meta.env.VITE_USER_REGISTRATION_ADDRESS;

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
      account: address as `0x${string}`,
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
          account: address as `0x${string}`,
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
    return navigateTo('/voter');
  }

  if (status === 'instance' && to.path === '/register') {
    return navigateTo('/dashboard/instance'); 
  }

  if (status === 'not-registered' && to.path !== '/register') {
    return navigateTo('/register');
  }

  if (status === 'instance') {
    return navigateTo('/dashboard/instance');
  }

  if (status === 'user') {
    return navigateTo('/dashboard/voter');
  }


});

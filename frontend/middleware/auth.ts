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

  console.log('Connected address:', address.value);

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

  console.log('auth status: ', status)

  // Handle redirection based on the user status
  if (status === 'user' && to.path === '/register') {
    return navigateTo('/voter'); // Redirect registered users to the dashboard
  }

  if (status === 'instance' && to.path === '/register') {
    return navigateTo('/dashboard/instance'); // Redirect registered instances to their dashboard
  }

  if (status === 'not-registered' && to.path !== '/register') {
    return navigateTo('/register'); // Redirect unregistered users to the registration page
  }

  if (status === 'instance') {
    return navigateTo('/dashboard/instance'); // Redirect registered users to the dashboard
  }

  if (status === 'user') {
    return navigateTo('/dashboard/voter'); // Redirect registered users to the dashboard
  }


});

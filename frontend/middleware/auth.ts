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

  // Redirect to /portal if the wallet is not connected
  if (!isConnected.value || !address.value) {
    return navigateTo('/portal');
  }

  // Check registration status
  const status = await checkRegistrationStatus(address.value);

  // Define path restrictions for user and instance roles
  const voterRestictionPaths = ['/', '/register', '/dashboard/instance', '/polls/new'];
  const instanceRestricitonPaths = ['/', '/register', '/dashboard/voter', '/polls/[pollId]/vote'];

  // Redirect users based on their status and the current path
  if (status === 'not-registered' && to.path !== '/register') {
    return navigateTo('/register');
  }

  if (status === 'user' && voterRestictionPaths.includes(to.path) && to.path !== '/dashboard/voter') {
    return navigateTo('/dashboard/voter');
  }

  if (status === 'instance' && instanceRestricitonPaths.includes(to.path) && to.path !== '/dashboard/instance') {
    return navigateTo('/dashboard/instance');
  }

  // If the user is already on their correct dashboard, no further action is needed
  if ((status === 'user' && to.path === '/dashboard/voter') ||
    (status === 'instance' && to.path === '/dashboard/instance')) {
    return;
  }
});

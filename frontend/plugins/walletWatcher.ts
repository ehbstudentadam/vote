import { watch } from 'vue';
import { useAccount } from '@wagmi/vue';
import { useRouter } from '#app';

export default defineNuxtPlugin(() => {
    const { isConnected } = useAccount();
    const router = useRouter();

    // Watch for disconnection
    watch(isConnected, (connected) => {
        if (!connected) {
            router.push('/portal');
        }
    });
});

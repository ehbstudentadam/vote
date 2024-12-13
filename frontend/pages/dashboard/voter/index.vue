<template>
    <div class="voter-dashboard">
        <!-- Title and Subtitle -->
        <div class="title-container">
            <h1>Hello {{ voterData.name || "Loading..." }}</h1>
            <p>Subscribe to a Poll and Vote!</p>
        </div>

        <!-- Poll List -->
        <div class="polls-container">
            <div v-for="(poll, index) in polls" :key="index" class="poll-row" :class="{ eligible: poll.isEligible }"
                @click="goToPoll(poll.address)">
                <div class="poll-title">{{ poll.title }}</div>
                <div class="poll-info">
                    <div>Voters: {{ poll.voterCount }}</div>
                    <div>Final Date: {{ poll.endDate }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
definePageMeta({
    middleware: 'auth',
});

import { ref, onMounted } from 'vue';
import { readContract } from '@wagmi/core';
import { useRouter } from 'vue-router';
import { config } from '~/wagmi';
import UserRegistrationArtifact from '~/artifacts/UserRegistration.json';
import PollFactoryArtifact from '~/artifacts/PollFactory.json';
import PollArtifact from '~/artifacts/Poll.json';
import SubscriptionArtifact from '~/artifacts/Subscription.json';

// Contract details
const userRegistrationABI = UserRegistrationArtifact.abi;
const userRegistrationAddress = import.meta.env.VITE_USER_REGISTRATION_ADDRESS;

const pollFactoryABI = PollFactoryArtifact.abi;
const pollFactoryAddress = import.meta.env.VITE_POLL_FACTORY_ADDRESS;

const subscriptionABI = SubscriptionArtifact.abi;
const subscriptionAddress = import.meta.env.VITE_SUBSCRIPTION_ADDRESS;

const pollABI = PollArtifact.abi;

// Vue refs for state management
const voterData = ref({ name: '', age: '', isActive: false });
const polls = ref([]);
const loading = ref(false);

// Wallet connection
import { useAccount } from '@wagmi/vue';
const { address, isConnected } = useAccount();
const router = useRouter();

// Fetch voter data
const fetchVoterData = () => {
    readContract(config, {
        address: userRegistrationAddress,
        abi: userRegistrationABI,
        functionName: 'users',
        args: [address.value],
    })
        .then((data) => {
            if (Array.isArray(data)) {
                voterData.value.name = data[0] || 'Unknown';
                voterData.value.age = data[1] || 'N/A';
                voterData.value.isActive = data[3] || false;
            } else {
                console.warn('Unexpected format for voter data:', data);
            }
        })
        .catch((error) => {
            console.error('Error fetching voter data:', error);
        });
};

// Fetch all polls
const fetchPollAddresses = (callback) => {
    readContract(config, {
        address: pollFactoryAddress,
        abi: pollFactoryABI,
        functionName: 'getPollCount',
    })
        .then((count) => {
            const totalPolls = Number(count);
            const pollAddresses = [];
            let completed = 0;

            if (totalPolls === 0) {
                callback([]);
            }

            for (let i = 0; i < totalPolls; i++) {
                readContract(config, {
                    address: pollFactoryAddress,
                    abi: pollFactoryABI,
                    functionName: 'allPolls',
                    args: [i],
                })
                    .then((pollAddress) => {
                        pollAddresses.push(pollAddress);
                        completed++;
                        if (completed === totalPolls) {
                            callback(pollAddresses);
                        }
                    })
                    .catch((error) => {
                        console.error(`Error fetching poll address for index ${i}:`, error);
                        completed++;
                        if (completed === totalPolls) {
                            callback(pollAddresses);
                        }
                    });
            }
        })
        .catch((error) => {
            console.error('Error fetching poll count:', error);
            callback([]);
        });
};

const fetchPollDetails = (pollAddress, callback) => {
    const pollDetails = {};
    readContract(config, {
        address: pollAddress,
        abi: pollABI,
        functionName: 'pollTitle',
    })
        .then((title) => {
            pollDetails.title = title || 'Unknown';
            return readContract(config, {
                address: pollAddress,
                abi: pollABI,
                functionName: 'endDate',
            });
        })
        .then((endDate) => {
            const endDateTimestamp = Number(endDate) * 1000; // Convert to milliseconds
            pollDetails.endDate = endDate
                ? new Date(endDateTimestamp).toLocaleString()
                : 'N/A';

            // Check if the poll is finalized by date
            const now = Date.now();
            pollDetails.isFinalized = endDateTimestamp < now;

            return readContract(config, {
                address: pollAddress,
                abi: pollABI,
                functionName: 'getTotalOptions',
            });
        })
        .then((totalOptions) => {
            const total = Number(totalOptions) || 0;
            let voterCount = 0;
            let completed = 0;

            if (total === 0) {
                pollDetails.voterCount = 0;
                return checkEligibility();
            }

            for (let i = 0; i < total; i++) {
                readContract(config, {
                    address: pollAddress,
                    abi: pollABI,
                    functionName: 'votingOptions',
                    args: [i],
                })
                    .then((optionData) => {
                        voterCount += Number(optionData.voteCount || 0);
                        completed++;
                        if (completed === total) {
                            pollDetails.voterCount = voterCount;
                            checkEligibility();
                        }
                    })
                    .catch((error) => {
                        console.error(
                            `Error fetching vote count for option ${i}:`,
                            error
                        );
                        completed++;
                        if (completed === total) {
                            pollDetails.voterCount = voterCount;
                            checkEligibility();
                        }
                    });
            }
        })
        .catch((error) => {
            console.error(`Error fetching poll details for ${pollAddress}:`, error);
            callback(null);
        });

    function checkEligibility() {
        // If the poll is finalized, set isEligible to false
        if (pollDetails.isFinalized) {
            pollDetails.isEligible = false;
            pollDetails.address = pollAddress;
            callback(pollDetails);
            return;
        }

        // Otherwise, check eligibility using the contract
        readContract(config, {
            address: subscriptionAddress,
            abi: subscriptionABI,
            functionName: 'checkEligibility',
            args: [pollAddress, address.value],
        })
            .then((isEligible) => {
                pollDetails.isEligible = isEligible || false;
                pollDetails.address = pollAddress;
                callback(pollDetails);
            })
            .catch((error) => {
                console.error(
                    `Error checking eligibility for ${pollAddress}:`,
                    error
                );
                callback(null);
            });
    }
};



// Fetch all polls
const fetchAllPolls = () => {
    loading.value = true;
    fetchPollAddresses((pollAddresses) => {
        const fetchedPolls = [];
        let completed = 0;
        pollAddresses.forEach((pollAddress) => {
            fetchPollDetails(pollAddress, (pollDetails) => {
                if (pollDetails) {
                    fetchedPolls.push(pollDetails);
                }
                completed += 1;
                if (completed === pollAddresses.length) {
                    polls.value = fetchedPolls;
                    loading.value = false;
                }
            });
        });
    });
};

// On mount
onMounted(() => {
    if (address.value && isConnected.value) {
        fetchVoterData();
        fetchAllPolls();
    }
});

// Navigate to poll details
const goToPoll = (pollAddress) => {
    router.push(`/polls/${pollAddress}/vote`);
};
</script>

<style scoped>
.voter-dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem;
    font-family: "Roboto Mono", monospace;
    color: #333;
}

.title-container {
    text-align: center;
    margin-bottom: 2rem;
}

.title-container h1 {
    font-size: 2rem;
    font-weight: bold;
    color: #222;
    margin-bottom: 0.5rem;
}

.title-container p {
    font-size: 1rem;
    color: #555;
}

.polls-container {
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
}

.poll-row {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
    transition: background-color 0.3s ease, transform 0.2s ease;
    cursor: pointer;
    font-family: "Roboto Mono", monospace;
}

.poll-row.eligible {
    background-color: #f7efff;
    /* Soft green for eligible polls */
}

.poll-row:hover {
    background-color: #f0f0f0;
    transform: scale(1.02);
}

.poll-title {
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
    margin-bottom: 0.5rem;
}

.poll-info {
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
    color: #555;
}

.poll-info div {
    margin-right: 1rem;
}

@media (max-width: 768px) {
    .polls-container {
        gap: 0.75rem;
    }

    .poll-row {
        padding: 0.75rem;
    }

    .poll-title {
        font-size: 1rem;
    }

    .poll-info {
        font-size: 0.9rem;
    }
}
</style>

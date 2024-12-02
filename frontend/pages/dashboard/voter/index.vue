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
const userRegistrationAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

const pollFactoryABI = PollFactoryArtifact.abi;
const pollFactoryAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

const subscriptionABI = SubscriptionArtifact.abi;
const subscriptionAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

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

// Fetch poll details and check eligibility
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
            pollDetails.endDate = endDate
                ? new Date(Number(endDate) * 1000).toLocaleString()
                : 'N/A';
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
}

.title-container {
    text-align: center;
    margin-bottom: 2rem;
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
    transition: background-color 0.3s ease;
}

.poll-row.eligible {
    background-color: #d4edda;
    /* Light green */
}

.poll-row:hover {
    background-color: #e9ecef;
}

.poll-title {
    font-size: 1.2rem;
    font-weight: bold;
}

.poll-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
}
</style>

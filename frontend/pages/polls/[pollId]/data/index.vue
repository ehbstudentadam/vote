<template>
    <div class="poll-container">
        <!-- Loading Indicator -->
        <div v-if="loading" class="loading">
            <p>Loading poll data...</p>
        </div>

        <!-- Poll Data -->
        <div v-else class="poll-data">
            <!-- Poll Title and Info -->
            <div class="poll-header">
                <h1>Poll: {{ pollTitle }}</h1>
                <div class="poll-info">
                    <p>Creator: {{ creator || 'N/A' }}</p>
                    <p>End Date: {{ finalDate || 'N/A' }}</p>
                    <p>Location Restriction: {{ location || 'N/A' }}</p>
                    <p>Tokens Per Voter: {{ minTokensRequired || 'N/A' }}</p>
                    <p>Minimum Age: {{ minAge || 'N/A' }}</p>
                    <p>Is Finalized: {{ isFinalized ? 'Yes' : 'No' }}</p>
                </div>
            </div>

            <!-- Voting Options -->
            <div class="poll-options">
                <h2>Voting Options:</h2>
                <div v-for="(option, index) in pollOptions" :key="index" class="poll-option-row">
                    <div class="option-title">{{ option.description }}</div>
                    <div class="vote-count">Votes: {{ option.voteCount }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { readContract } from '@wagmi/core';
import { config } from '~/wagmi';
import PollArtifact from '~/artifacts/Poll.json';

// Contract details
const pollABI = PollArtifact.abi;

// Vue refs for state management
const pollTitle = ref('');
const finalDate = ref('');
const isFinalized = ref(false);
const creator = ref('');
const minAge = ref('');
const location = ref('');
const minTokensRequired = ref('');
const pollOptions = ref([]);
const loading = ref(false);

// Route parameter for poll ID
import { useRoute } from 'vue-router';
const route = useRoute();
const pollId = route.params.pollId;

import { useAccount } from '@wagmi/vue';
const { address, isConnected } = useAccount();

// Fetch poll data
const fetchPollData = () => {
    loading.value = true;
    const pollDetails = {};

    // Fetch poll title
    readContract(config, {
        address: pollId,
        abi: pollABI,
        functionName: 'pollTitle',
        account: address.value
    })
        .then((data) => {
            pollDetails.title = data || 'Unknown';
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'endDate',
                account: address.value
            });
        })
        .then((data) => {
            pollDetails.endDate = data
                ? new Date(Number(data) * 1000).toLocaleString()
                : 'N/A';
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'isFinalized',
                account: address.value
            });
        })
        .then((data) => {
            pollDetails.isFinalized = data || false;
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'creator',
                account: address.value
            });
        })
        .then((data) => {
            pollDetails.creator = data || 'Unknown';
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'getEligibility',
                account: address.value
            });
        })
        .then((data) => {
            if (Array.isArray(data)) {
                [pollDetails.minAge, pollDetails.location, pollDetails.minTokensRequired] = data;
            }
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'getTotalOptions',
                account: address.value
            });
        })
        .then((data) => {
            const totalOptions = Number(data || 0);
            pollDetails.totalOptions = totalOptions;
            const options = [];
            let completed = 0;

            // Fetch voting options
            if (totalOptions > 0) {
                for (let i = 0; i < totalOptions; i++) {
                    readContract(config, {
                        address: pollId,
                        abi: pollABI,
                        functionName: 'votingOptions',
                        args: [i],
                        account: address.value
                    })
                        .then((optionData) => {
                            options.push({
                                description: optionData?.[0] || 'N/A',
                                voteCount: Number(optionData?.[1] || 0),
                            });
                            completed++;
                            if (completed === totalOptions) {
                                pollDetails.options = options;
                                updatePollData(pollDetails);
                            }
                        })
                        .catch((error) => {
                            console.error(`Failed to fetch option ${i}:`, error);
                            completed++;
                            if (completed === totalOptions) {
                                updatePollData(pollDetails);
                            }
                        });
                }
            } else {
                pollDetails.options = [];
                updatePollData(pollDetails);
            }
        })
        .catch((error) => {
            console.error('Error fetching poll data:', error);
            loading.value = false;
        });
};

// Update reactive state with poll details
const updatePollData = (details) => {
    pollTitle.value = details.title || 'Unknown';
    finalDate.value = details.endDate || 'N/A';
    isFinalized.value = details.isFinalized || false;
    creator.value = details.creator || 'Unknown';
    minAge.value = details.minAge || 'N/A';
    location.value = details.location || 'N/A';
    minTokensRequired.value = details.minTokensRequired || 'N/A';
    pollOptions.value = details.options || [];
    loading.value = false;
};

// Trigger data fetch on mount
onMounted(() => {
    if (pollId && address.value && isConnected.value) {
        fetchPollData();
    }
});
</script>

<style scoped>
.poll-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem;
    font-family: "Roboto Mono", monospace;
    color: #333;
}

.poll-header {
    text-align: center;
    margin-bottom: 2rem;
}

.loading {
    text-align: center;
    font-size: 1.5rem;
    margin-top: 2rem;
    color: #555;
}

h1 {
    font-size: 2.5rem;
    font-weight: bold;
    color: #222;
    margin-bottom: 1rem;
}

h2 {
    font-size: 2rem;
    font-weight: bold;
    color: #444;
    margin-bottom: 1rem;
    text-align: center;
}

.poll-info {
    font-size: 1rem;
    color: #555;
    margin-top: 1rem;
    line-height: 1.5;
}

.poll-data {
    min-width: 800px;
}

.poll-options {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
}

.poll-option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #fafafa;
    transition: background-color 0.3s ease;
}

.poll-option-row:hover {
    background-color: #f0f0f0;
}

.option-title {
    flex-grow: 1;
    text-align: left;
    font-size: 1.1rem;
    font-weight: bold;
    color: #333;
}

.vote-count {
    font-size: 1.1rem;
    font-weight: bold;
    width: 100px;
    text-align: center;
    color: #444;
}

.poll-info p {
    margin: 0.5rem 0;
}

/* Responsive design */
@media (max-width: 768px) {
    .poll-data {
        min-width: 100%;
    }

    .poll-options {
        gap: 0.75rem;
    }

    h1 {
        font-size: 2rem;
    }

    h2 {
        font-size: 1.5rem;
    }

    .option-title,
    .vote-count {
        font-size: 1rem;
    }
}
</style>

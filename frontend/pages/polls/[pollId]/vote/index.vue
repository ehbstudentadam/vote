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
                    <p>Poll is final at {{ finalDate || 'N/A' }}</p>
                    <p>Creator: {{ creator || 'N/A' }}</p>
                    <p>Minimum Age: {{ minAge || 'N/A' }}</p>
                    <p>Location Restriction: {{ location || 'N/A' }}</p>
                    <p>Minimum Tokens Required: {{ minTokensRequired || 'N/A' }}</p>
                    <p>Is Finalized: {{ isFinalized ? 'Yes' : 'No' }}</p>
                    <p>Voting Tokens: {{ userTokens }}</p>
                </div>
            </div>

            <!-- Voting Options -->
            <div class="poll-options">
                <h2>Voting Options:</h2>
                <div v-for="(option, index) in pollOptions" :key="index" class="poll-option-row">
                    <button class="vote-adjust" @click="adjustVote(index, -1)" :disabled="votes[index] === 0">
                        -
                    </button>
                    <div class="option-title">{{ option.description }}</div>
                    <div class="vote-count">{{ votes[index] }}</div>
                    <button class="vote-adjust" @click="adjustVote(index, 1)" :disabled="remainingTokens === 0">
                        +
                    </button>
                </div>
            </div>

            <!-- Vote Button -->
            <div class="vote-button-container">
                <button @click="castVotes" class="vote-button" :disabled="!canVote">
                    VOTE
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { readContract, writeContract } from '@wagmi/core';
import { useRouter } from 'vue-router';
import { config } from '~/wagmi';
import PollArtifact from '~/artifacts/Poll.json';
import TokenDistributionArtifact from '~/artifacts/TokenDistribution.json';

// Contract details
const pollABI = PollArtifact.abi;
const tokenDistributionABI = TokenDistributionArtifact.abi;
const tokenDistributionAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

// Vue refs for state management
const pollTitle = ref('');
const finalDate = ref('');
const isFinalized = ref(false);
const creator = ref('');
const minAge = ref('');
const location = ref('');
const minTokensRequired = ref('');
const pollOptions = ref([]);
const votes = ref([]);
const userTokens = ref(0);
const remainingTokens = ref(0);
const loading = ref(false);
const canVote = ref(false);

// Router and route parameter for poll ID
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
        account: address.value,
    })
        .then((data) => {
            pollDetails.title = data || 'Unknown';
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'endDate',
                account: address.value,
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
                account: address.value,
            });
        })
        .then((data) => {
            pollDetails.isFinalized = data || false;
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'creator',
                account: address.value,
            });
        })
        .then((data) => {
            pollDetails.creator = data || 'Unknown';
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'getEligibility',
                account: address.value,
            });
        })
        .then((data) => {
            if (Array.isArray(data)) {
                [pollDetails.minAge, pollDetails.location, pollDetails.minTokensRequired] =
                    data;
            }
            return readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'getTotalOptions',
                account: address.value,
            });
        })
        .then((data) => {
            const totalOptions = Number(data || 0);
            pollDetails.totalOptions = totalOptions;
            const options = [];
            let completed = 0;

            if (totalOptions > 0) {
                for (let i = 0; i < totalOptions; i++) {
                    readContract(config, {
                        address: pollId,
                        abi: pollABI,
                        functionName: 'votingOptions',
                        args: [i],
                        account: address.value,
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
                                pollDetails.options = options;
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

// Fetch user voting tokens
const fetchUserTokens = () => {
    readContract(config, {
        address: tokenDistributionAddress,
        abi: tokenDistributionABI,
        functionName: 'balanceOf',
        args: [address.value],
        account: address.value,
    })
        .then((balance) => {
            userTokens.value = Number(balance || 0);
            remainingTokens.value = userTokens.value;
            canVote.value = remainingTokens.value > 0;
        })
        .catch((error) => {
            console.error('Error fetching user tokens:', error);
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
    votes.value = Array(details.options.length).fill(0);
    loading.value = false;
};

// Adjust vote for an option
const adjustVote = (index, change) => {
    if (votes.value[index] + change >= 0 && remainingTokens.value - change >= 0) {
        votes.value[index] += change;
        remainingTokens.value -= change;
        canVote.value = remainingTokens.value > 0;
    }
};

// Cast votes
const castVotes = () => {
    const totalVotes = votes.value.reduce((sum, count) => sum + count, 0);
    if (totalVotes > 0) {
        for (let i = 0; i < votes.value.length; i++) {
            if (votes.value[i] > 0) {
                writeContract(config, {
                    address: pollId,
                    abi: pollABI,
                    functionName: 'castVote',
                    args: [address.value, i, votes.value[i]],
                })
                    .then(() => {
                        console.log(`Voted ${votes.value[i]} for option ${i}`);
                    })
                    .catch((error) => {
                        console.error(`Error voting for option ${i}:`, error);
                    });
            }
        }
    }
};

// Trigger data fetch on mount
onMounted(() => {
    if (pollId && address.value && isConnected.value) {
        fetchPollData();
        fetchUserTokens();
    }
});
</script>

<style>
.poll-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem;
}

.poll-header {
    text-align: center;
    margin-bottom: 2rem;
}

.loading {
    text-align: center;
    font-size: 1.5rem;
    margin-top: 2rem;
}

h1 {
    font-size: 2rem;
    font-weight: bold;
}

h2 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
}

.poll-info {
    font-size: 1rem;
    color: #666;
    margin-top: 1rem;
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
    background-color: #f9f9f9;
}

.option-title {
    flex-grow: 1;
    text-align: center;
    font-size: 1rem;
    font-weight: bold;
}

.vote-count {
    font-size: 1rem;
    font-weight: bold;
    width: 100px;
    text-align: center;
}

.vote-adjust {
    background: none;
    border: 1px solid #ccc;
    padding: 0.5rem;
    font-size: 1.5rem;
    cursor: pointer;
}

.vote-adjust:disabled {
    color: #aaa;
    cursor: not-allowed;
}

.vote-button-container {
    margin-top: 2rem;
    text-align: center;
}

.vote-button {
    padding: 1rem 2rem;
    background-color: #007bff;
    color: white;
    border: none;
    font-size: 1rem;
    border-radius: 5px;
    cursor: pointer;
}

.vote-button:disabled {
    background-color: #aaa;
    cursor: not-allowed;
}
</style>
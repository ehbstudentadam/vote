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

            <!-- Subscription Section -->
            <div class="subscription-section" v-if="!isSubscribed">
                <h2>Subscribe to Poll</h2>
                <p>You need NFTs for this poll to participate. Subscribe now!</p>
                <button @click="subscribeToPoll" class="subscribe-button" :disabled="!canSubscribe">
                    Subscribe
                </button>
            </div>

            <!-- Voting Options -->
            <div class="poll-options" v-else>
                <h2>Voting Options:</h2>
                <div v-for="(option, index) in pollOptions" :key="index" class="poll-option-row">
                    <button class="vote-adjust" @click="adjustVote(index, -1)" :disabled="votes[index] === 0">
                        -
                    </button>
                    <div class="option-title">{{ option.description }}</div>
                    <div class="vote-count">Total Votes: {{ globalVotes[index] + votes[index] }}</div>
                    <button class="vote-adjust" @click="adjustVote(index, 1)" :disabled="remainingTokens === 0">
                        +
                    </button>
                </div>
            </div>

            <!-- Vote Button -->
            <div class="vote-button-container" v-if="isSubscribed">
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
import { useWriteContract, useAccount } from '@wagmi/vue';
import { useRouter } from 'vue-router';
import { config } from '~/wagmi';
import PollArtifact from '~/artifacts/Poll.json';
import TokenDistributionArtifact from '~/artifacts/TokenDistribution.json';
import SubscriptionArtifact from '~/artifacts/Subscription.json';

// Contract details
const pollABI = PollArtifact.abi;
const tokenDistributionABI = TokenDistributionArtifact.abi;
const subscriptionABI = SubscriptionArtifact.abi;

const tokenDistributionAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const subscriptionAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

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
const globalVotes = ref([]); // To store global vote counts
const myVotes = ref([]);     // To store user's individual votes
const userTokens = ref(0);
const remainingTokens = ref(0);
const loading = ref(false);
const canVote = ref(false);
const canSubscribe = ref(false);
const isSubscribed = ref(false);

// Router and route parameter for poll ID
import { useRoute } from 'vue-router';
const route = useRoute();
const pollId = route.params.pollId;

const { address, isConnected } = useAccount();

// Fetch poll data
const fetchPollData = async () => {
    try {
        loading.value = true;
        const pollDetails = {};

        // Fetch poll details
        const [
            title,
            endDateRaw,
            isFinalizedFlag,
            pollCreator,
            eligibility,
            totalOptionsRaw,
        ] = await Promise.all([
            readContract(config, { address: pollId, abi: pollABI, functionName: 'pollTitle' }),
            readContract(config, { address: pollId, abi: pollABI, functionName: 'endDate' }),
            readContract(config, { address: pollId, abi: pollABI, functionName: 'isFinalized' }),
            readContract(config, { address: pollId, abi: pollABI, functionName: 'creator' }),
            readContract(config, { address: pollId, abi: pollABI, functionName: 'getEligibility' }),
            readContract(config, { address: pollId, abi: pollABI, functionName: 'getTotalOptions' }),
        ]);

        // Populate basic details
        pollDetails.title = title || 'Unknown';
        pollDetails.endDate = endDateRaw
            ? new Date(Number(endDateRaw.toString()) * 1000).toLocaleString()
            : 'N/A';
        pollDetails.isFinalized = isFinalizedFlag;
        pollDetails.creator = pollCreator || 'Unknown';
        [pollDetails.minAge, pollDetails.location, pollDetails.minTokensRequired] =
            eligibility.map((item) => item.toString());

        // Fetch options
        const totalOptions = Number(totalOptionsRaw.toString());
        const globalVoteCounts = [];

        for (let i = 0; i < totalOptions; i++) {
            // Fetch global votes
            const optionData = await readContract(config, {
                address: pollId,
                abi: pollABI,
                functionName: 'votingOptions',
                args: [i],
            });
            globalVoteCounts.push(Number(optionData[1].toString())); // Global vote count
        }

        // Update state
        pollDetails.options = globalVoteCounts.map((count, index) => ({
            description: `Option ${index + 1}`,
            totalVotes: count,
        }));
        globalVotes.value = globalVoteCounts;
        votes.value = Array(totalOptions).fill(0); // Reset votes for voting
        updatePollData(pollDetails);
    } catch (error) {
        console.error('Error fetching poll data:', error);
    } finally {
        loading.value = false;
    }
};



// Check if user is subscribed
const checkSubscriptionStatus = () => {
    readContract(config, {
        address: subscriptionAddress,
        abi: subscriptionABI,
        functionName: 'isUserSubscribedToPoll',
        args: [pollId, address.value],
        account: address.value
    })
        .then((subscribed) => {
            isSubscribed.value = subscribed;
            canSubscribe.value = !subscribed;
        })
        .catch((error) => {
            console.error('Error checking subscription status:', error);
        });
};

// Subscribe to poll
const subscribeToPoll = () => {
    writeContract(config, {
        address: subscriptionAddress,
        abi: subscriptionABI,
        functionName: 'subscribeUser',
        args: [pollId, address.value],
        account: address.value
    })
        .then(() => {
            console.log('Successfully subscribed to the poll!');
            isSubscribed.value = true;
            canSubscribe.value = false;
            fetchUserTokens();
        })
        .catch((error) => {
            console.error('Error subscribing to poll:', error);
        });
};

// Fetch user voting tokens
const fetchUserTokens = () => {
    const pollNFTId = BigInt(pollId); // Derive poll NFT ID
    readContract(config, {
        address: tokenDistributionAddress,
        abi: tokenDistributionABI,
        functionName: 'balanceOf',
        args: [address.value, pollNFTId],
        account: address.value
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
};

// Adjust vote for an option
const adjustVote = (index, change) => {
    if (votes.value[index] + change >= 0 && remainingTokens.value - change >= 0) {
        votes.value[index] += change;
        remainingTokens.value -= change;
        canVote.value = remainingTokens.value > -1;
    }
};


// Write contract hooks
const { writeContractAsync: approveContractAsync } = useWriteContract({
    address: tokenDistributionAddress, // Address of the TokenDistribution contract
    abi: tokenDistributionABI, // ABI of the TokenDistribution contract
    functionName: 'setApprovalForAll',
});

const { writeContractAsync: castVotesAsync } = useWriteContract({
    address: pollId, // Address of the Poll contract
    abi: pollABI, // ABI of the Poll contract
    functionName: 'castVotes',
});

const castVotes = async () => {
    try {
        // Ensure a wallet is connected
        if (!address.value) {
            throw new Error('No connected wallet. Please connect your wallet.');
        }

        // Approve the Poll contract to manage NFTs
        console.log('Granting approval for the Poll contract...');
        await approveContractAsync({
            address: tokenDistributionAddress, // Address of the TokenDistribution contract
            abi: tokenDistributionABI, // ABI of the TokenDistribution contract
            functionName: 'setApprovalForAll',
            args: [pollId, true], // Approve the Poll contract
            account: address.value,
        });

        // Prepare optionIndexes and amounts
        const optionIndexes = votes.value
            .map((vote, index) => (vote > 0 ? index : null))
            .filter((index) => index !== null)
            .map(Number); // Ensure they are numbers

        const amounts = votes.value
            .filter((vote) => vote > 0)
            .map(Number); // Ensure they are numbers

        console.log('Option Indexes:', optionIndexes);
        console.log('Amounts:', amounts);

        // Write to the contract
        const tx = await castVotesAsync({
            address: pollId,
            abi: pollABI,
            functionName: 'castVotes',
            args: [optionIndexes, amounts],
            account: address.value,
        });

        console.log('Votes cast successfully:', tx);
        alert('Votes cast successfully!');
    } catch (error) {
        console.error('Error casting votes:', error);
        alert(error.message || 'Failed to cast votes');
    }
};

// Trigger data fetch on mount
onMounted(() => {
    if (pollId && address.value && isConnected.value) {
        fetchPollData();
        fetchUserTokens();
        checkSubscriptionStatus();
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
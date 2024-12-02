<template>
    <div class="new-poll-container">
        <h1>Create a new Poll</h1>
        <p>Create new Poll for voting.</p>

        <form @submit.prevent="createPoll">
            <!-- Poll Name -->
            <div class="form-group">
                <label for="pollName">Poll Name:</label>
                <input type="text" id="pollName" v-model="pollName" required />
            </div>

            <!-- End Date and Time -->
            <fieldset>
                <legend>Set Poll End Date and Time</legend>
                <div class="form-group">
                    <label for="endDate">End Date:</label>
                    <input type="date" id="endDate" v-model="endDate" required />
                </div>
                <div class="form-group">
                    <label for="endTime">End Time:</label>
                    <input type="time" id="endTime" v-model="endTime" required />
                </div>
            </fieldset>

            <!-- Token Calculation -->
            <fieldset>
                <legend>Calculate Voting Token amount</legend>
                <div class="form-group">
                    <label for="expectedVoters">Expected Voter amount:</label>
                    <input type="number" id="expectedVoters" v-model.number="expectedVoters" required />
                </div>
                <div class="form-group">
                    <label for="tokensPerVoter">Tokens per Voter:</label>
                    <input type="number" id="tokensPerVoter" v-model.number="tokensPerVoter" required />
                </div>
                <div class="form-group">
                    <label>Total token amount:</label>
                    <span>{{ totalTokenAmount }}</span>
                </div>
            </fieldset>

            <!-- Voter Requirements -->
            <div class="form-group">
                <label for="minAge">Voter minimum age:</label>
                <input type="number" id="minAge" v-model.number="minAge" required />
            </div>
            <div class="form-group">
                <label for="location">Voter location:</label>
                <input type="text" id="location" v-model="location" required />
            </div>

            <!-- Poll Statements -->
            <fieldset>
                <legend>Create Poll Statements</legend>
                <div v-for="(statement, index) in pollStatements" :key="index" class="form-group">
                    <input type="text" v-model="pollStatements[index]" placeholder="Enter poll statement" required />
                </div>
                <button class="add-option-button" type="button" @click="addStatement">ADD OPTION</button>
            </fieldset>

            <button type="submit" class="create-button">CREATE</button>
        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWriteContract, useAccount } from '@wagmi/vue';
import PollFactoryArtifact from '~/artifacts/PollFactory.json';

const pollFactoryAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
const pollFactoryABI = PollFactoryArtifact.abi;

// Form data
const pollName = ref('');
const endDate = ref('');
const endTime = ref('');
const expectedVoters = ref(0);
const tokensPerVoter = ref(0);
const totalTokenAmount = ref(0);
const minAge = ref(18);
const location = ref('');
const pollStatements = ref(['']);

// Calculate total token amount dynamically
watch([expectedVoters, tokensPerVoter], () => {
    totalTokenAmount.value = expectedVoters.value * tokensPerVoter.value;
});

// Router for navigation
const router = useRouter();

// Write contract hook
const { address } = useAccount();
const { writeContractAsync } = useWriteContract({
    address: pollFactoryAddress,
    abi: pollFactoryABI,
    functionName: 'createPoll',
});

const addStatement = () => {
    pollStatements.value.push('');
};

const createPoll = async () => {
    try {
        // Validation for required fields
        if (!pollName.value || !endDate.value || !endTime.value || !pollStatements.value.length) {
            throw new Error('All fields must be filled correctly.');
        }

        // Convert date and time to a UNIX timestamp
        const endDateTime = new Date(`${endDate.value}T${endTime.value}`);
        const endTimestamp = Math.floor(endDateTime.getTime() / 1000);

        if (endTimestamp <= Math.floor(Date.now() / 1000)) {
            throw new Error('End date and time must be in the future.');
        }

        // Prepare options array
        const options = JSON.parse(JSON.stringify(pollStatements.value.map((option) => option.trim())));
        if (!options.length || !options.every((option) => typeof option === 'string' && option.trim().length > 0)) {
            throw new Error('Poll options must be valid, non-empty strings.');
        }

        // Log options for debugging
        console.log('Options before contract call:', options);
        console.log('Options JSON stringified:', JSON.stringify(options));

        // Log data to be sent to the contract
        console.log('Creating poll with data:', {
            pollName: pollName.value,
            options,
            endDate: endTimestamp,
            minAge: minAge.value,
            location: location.value,
            minTokensRequired: tokensPerVoter.value,
            totalTokenSupply: totalTokenAmount.value,
        });

        // Write to the contract
        const tx = await writeContractAsync({
            address: pollFactoryAddress,
            abi: pollFactoryABI,
            functionName: 'createPoll',
            args: [
                pollName.value,
                options,
                endTimestamp,
                minAge.value,
                location.value,
                tokensPerVoter.value,
                totalTokenAmount.value,
            ],
            gasLimit: 3000000,
            account: address.value
        });

        console.log('Transaction successful:', tx);
        alert('Poll created successfully!');
        router.push('/dashboard/instance'); // Navigate back to the instance dashboard
    } catch (error) {
        console.error('Error creating poll:', error);
        alert(error.message || 'Failed to create poll');
    }
};


</script>



<style scoped>
.new-poll-container {
    max-width: 600px;
    margin: 2rem auto;
}

h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

p {
    margin-bottom: 1.5rem;
    color: #666;
}

form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
}

label {
    font-weight: bold;
    margin-bottom: 0.5rem;
}

input {
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.add-option-button {
    margin: 0.5rem;
    padding: 0.75rem;
}

.create-button {
    padding: 1rem;
    font-size: 1.25rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.create-button:hover {
    background-color: #0056b3;
}

fieldset {
    border: 1px solid #ccc;
    padding: 1rem;
    border-radius: 5px;
}

legend {
    font-weight: bold;
}

button {
    cursor: pointer;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
}

button:hover {
    background-color: #eaeaea;
}
</style>
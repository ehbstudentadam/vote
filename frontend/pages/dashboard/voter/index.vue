<template>
    <div class="dashboard-container">
        <!-- Title and Subtitle -->
        <div class="title-container">
            <h1>Hello {{ instanceName }}</h1>
            <p>View your Poll data or create new Polls.</p>
        </div>

        <!-- Poll List -->
        <div class="polls-container">
            <div v-for="(poll, index) in polls" :key="index" class="poll-row">
                <div class="poll-title">{{ poll.title }}</div>
                <div class="poll-info">
                    <div>Voters: {{ poll.voters }}</div>
                    <div>Final Date: {{ poll.finalDate }}</div>
                </div>
            </div>
        </div>

        <!-- Create New Poll Button -->
        <div class="create-poll-container">
            <button @click="createPoll" class="create-poll-button">
                CREATE NEW POLL
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const instanceName = ref('voter A'); // Replace with dynamic instance name
const polls = ref([
    // Replace with dynamic data fetched from blockchain or backend
    { title: 'POLL A', voters: 99999, finalDate: '01/01/2025 12:00:00' },
    { title: 'POLL B', voters: 99999, finalDate: '01/01/2025 12:00:00' },
]);

const createPoll = () => {
    // Redirect or open a form to create a new poll
    console.log('Create New Poll clicked');
};
</script>

<style scoped>
.dashboard-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem;
}

.title-container {
    text-align: center;
    margin-bottom: 2rem;
}

h1 {
    font-size: 2rem;
    font-weight: bold;
}

p {
    font-size: 1rem;
    color: #666;
}

.polls-container {
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
}

.poll-row {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
}

.poll-title {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.poll-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #333;
}

.create-poll-container {
    margin-top: 2rem;
    width: 100%;
    display: flex;
    justify-content: center;
}

.create-poll-button {
    padding: 1rem 2rem;
    font-size: 1rem;
    font-weight: bold;
    color: white;
    background-color: #007bff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.create-poll-button:hover {
    background-color: #0056b3;
}
</style>
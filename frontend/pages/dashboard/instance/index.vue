<template>
  <div class="dashboard-container">
    <!-- Title and Subtitle -->
    <div class="title-container">
      <h1>Hello {{ instanceData.organization || "Loading..." }}</h1>
      <p>View your Poll data or create new Polls.</p>
    </div>

    <!-- Poll List -->
    <div class="polls-container">
      <div v-for="(poll, index) in polls" :key="index" class="poll-row" @click="goToPoll(poll.address)">
        <div class="poll-title">{{ poll.title }}</div>
        <div class="poll-info">
          <div>Creator: {{ poll.creator }}</div>
          <div>End Date: {{ poll.endDate }}</div>
          <div>Is Finalized: {{ poll.isFinalized ? "Yes" : "No" }}</div>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { readContract } from '@wagmi/core';
import { config } from '~/wagmi';
import UserRegistrationArtifact from '~/artifacts/UserRegistration.json';
import PollFactoryArtifact from '~/artifacts/PollFactory.json';
import PollArtifact from '~/artifacts/Poll.json';

// Contract details
const userRegistrationABI = UserRegistrationArtifact.abi;
const userRegistrationAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';

const pollFactoryABI = PollFactoryArtifact.abi;
const pollFactoryAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

const pollABI = PollArtifact.abi;

// Vue refs for state management
const instanceData = ref({ organization: '', contact: '' });
const polls = ref([]);
const loading = ref(false);

// Wallet connection details
import { useAccount } from '@wagmi/vue';
const { address, isConnected } = useAccount();
const router = useRouter();

// Fetch instance data from UserRegistration
const fetchInstanceData = () => {
  readContract(config, {
    address: userRegistrationAddress,
    abi: userRegistrationABI,
    functionName: 'instances',
    args: [address.value],
  })
    .then((data) => {
      if (Array.isArray(data)) {
        instanceData.value.organization = data[0] || 'Unknown';
        instanceData.value.contact = data[1] || 'N/A';
        instanceData.value.isActive = data[2] || false;
      } else {
        console.warn('Unexpected format for instance data:', data);
      }
    })
    .catch((error) => {
      console.error('Error fetching instance data:', error);
    });
};

// Fetch polls by the instance from PollFactory
const fetchPollAddresses = (callback) => {
  readContract(config, {
    address: pollFactoryAddress,
    abi: pollFactoryABI,
    functionName: 'getPollsByInstance',
    args: [address.value],
    account: address.value
  })
    .then((data) => {
      if (Array.isArray(data)) {
        callback(data);
      } else {
        console.warn('Unexpected format for poll addresses:', data);
        callback([]);
      }
    })
    .catch((error) => {
      console.error('Error fetching poll addresses:', error);
      callback([]);
    });
};

// Fetch poll details
const fetchPollDetails = (pollAddress, callback) => {
  const pollDetails = {};
  readContract(config, {
    address: pollAddress,
    abi: pollABI,
    functionName: 'pollTitle',
    account: address.value
  })
    .then((pollTitle) => {
      pollDetails.title = pollTitle || 'Unknown';
      return readContract(config, {
        address: pollAddress,
        abi: pollABI,
        functionName: 'endDate',
        account: address.value
      });
    })
    .then((endDate) => {
      pollDetails.endDate = endDate
        ? new Date(Number(endDate) * 1000).toLocaleString()
        : 'N/A';
      return readContract(config, {
        address: pollAddress,
        abi: pollABI,
        functionName: 'isFinalized',
        account: address.value
      });
    })
    .then((isFinalized) => {
      pollDetails.isFinalized = isFinalized || false;
      return readContract(config, {
        address: pollAddress,
        abi: pollABI,
        functionName: 'creator',
        account: address.value
      });
    })
    .then((creator) => {
      pollDetails.creator = creator || 'Unknown';
      pollDetails.address = pollAddress;
      callback(pollDetails);
    })
    .catch((error) => {
      console.error(`Failed to fetch poll data for ${pollAddress}:`, error);
      callback(null);
    });
};

// Fetch all polls for the instance
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

// Trigger fetching data on mount
onMounted(() => {
  if (address.value && isConnected.value) {
    fetchInstanceData();
    fetchAllPolls();
  }
});

// Function to navigate to a specific poll
const goToPoll = (pollAddress) => {
  router.push(`/polls/${pollAddress}/data`);
};

// Function to create a new poll
const createPoll = () => {
  router.push('/polls/new');
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
  max-width: 800px;
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
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.poll-row:hover {
  background-color: #f0f0f0;
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
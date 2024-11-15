<template>
  <div class="register-page">
    <div class="options-container"
      :class="{ 'slide-right': selectedOption === 'vote', 'slide-left': selectedOption === 'poll' }">
      <div class="option vote" @click="selectOption('vote')">
        <h2>{{ selectedOption === 'vote' ? 'Register to Vote' : 'I want to vote' }}</h2>
      </div>
      <div class="option poll" @click="selectOption('poll')">
        <h2>{{ selectedOption === 'poll' ? 'Register to Create a Poll' : 'I want to create a Poll' }}</h2>
      </div>
    </div>

    <!-- Registration Forms -->
    <div v-if="selectedOption" class="form-container" :style="{ left: selectedOption === 'poll' ? '50%' : '0' }">
      <div v-if="selectedOption === 'vote'" class="form">
        <h2>Register to Vote</h2>
        <form @submit.prevent="handleUserRegistration">
          <div class="form-group">
            <label for="username">Name:</label>
            <input v-model="userName" type="text" id="username" required />
          </div>
          <div class="form-group">
            <label for="age">Age:</label>
            <input v-model="userAge" type="number" id="age" required />
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input v-model="userEmail" type="email" id="email" required />
          </div>
          <button type="submit">Register</button>
        </form>
        <p v-if="userError" class="error">{{ userError }}</p>
      </div>

      <div v-if="selectedOption === 'poll'" class="form">
        <h2>Register to Create a Poll</h2>
        <form @submit.prevent="handleInstanceRegistration">
          <div class="form-group">
            <label for="orgname">Organization Name:</label>
            <input v-model="orgName" type="text" id="orgname" required />
          </div>
          <div class="form-group">
            <label for="contact">Email:</label>
            <input v-model="orgEmail" type="email" id="contact" required />
          </div>
          <button type="submit">Register</button>
        </form>
        <p v-if="instanceError" class="error">{{ instanceError }}</p>
        <p v-if="success" class="success">Registration successful!</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useWriteContract, useAccount } from '@wagmi/vue';
import UserRegistrationArtifact from '~/artifacts/UserRegistration.json';

definePageMeta({
  middleware: 'auth',
});

// State for the selected registration option
const selectedOption = ref(null);
const userName = ref('');
const userAge = ref('');
const userEmail = ref('');
const orgName = ref('');
const orgEmail = ref('');
const userError = ref(null);
const instanceError = ref(null);
const success = ref(false);

// Contract details
const userRegistrationAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const userRegistrationABI = UserRegistrationArtifact.abi;

// Router instance
const router = useRouter();
const { address, isConnected } = useAccount();


// // Register User
// const { writeAsync: writeUser } = useWriteContract({
//   abi: userRegistrationABI,
//   address: userRegistrationAddress,
//   functionName: 'registerUser',
// });

// // Function to handle user registration
// async function handleUserRegistration() {
//   try {
//     if (!isConnected.value) throw new Error('Wallet is not connected.');
//     const tx = await writeUser({
//       args: [userName.value, userAge.value, userEmail.value],
//     });
//     console.log('Transaction:', tx);
//     router.push('/'); // Redirect on success
//   } catch (err) {
//     console.error('Failed to register user:', err.message);
//   }
// }

// Setup the write contract hook
const { writeContractAsync } = useWriteContract({
  address: userRegistrationAddress,
  abi: userRegistrationABI,
  functionName: 'registerInstance',
});

// Function to handle instance registration
async function handleInstanceRegistration() {
  try {
    instanceError.value = null;
    success.value = false;

    if (!isConnected.value) {
      throw new Error('Wallet is not connected.');
    }

    // Ensure all arguments are valid
    if (!address.value || !orgName.value || !orgEmail.value) {
      throw new Error('All fields must be filled out correctly.');
    }

    console.log('Address:', address.value);
    console.log('Organization Name:', orgName.value);
    console.log('Contact Email:', orgEmail.value);


    // Perform the write operation
    const tx = await writeContractAsync({
      address: userRegistrationAddress,
      abi: userRegistrationABI,
      functionName: 'registerInstance',
      args: [address.value, orgName.value, orgEmail.value],
      gasLimit: 3000000,
    });

    console.log('Transaction:', tx);
    console.log('Transaction Hash:', tx.hash);
    success.value = true;
    router.push('/'); // Redirect on success
  } catch (err) {
    instanceError.value = err.message || 'Failed to register instance';
    console.error(err);
  }
}


// Function to select registration option
function selectOption(option) {
  if (selectedOption.value === option) {
    // If the user clicks the already selected option, deselect it
    selectedOption.value = null;
    resetFormFields();
  } else {
    // If a different option is clicked, select it and reset form fields
    selectedOption.value = option;
    resetFormFields();
  }
}

// Function to reset form fields when switching options
function resetFormFields() {
  userName.value = '';
  userAge.value = '';
  userEmail.value = '';
  orgName.value = '';
  orgEmail.value = '';
  userError.value = null;
  instanceError.value = null;
  success.value = false;
}
</script>

<style scoped>
.register-page {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.options-container {
  display: flex;
  width: 200%;
  transition: transform 0.5s ease;
}

.option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  height: 100vh;
  color: white;
  font-size: 2rem;
}

.vote {
  background-color: #3498db;
}

.poll {
  background-color: #2ecc71;
}

.slide-left {
  transform: translateX(-50%);
}

.slide-right {
  transform: translateX(50%);
}

.form-container {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.5s ease;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  width: 80%;
  max-width: 500px;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}

button:hover {
  background-color: #2980b9;
}

.error {
  color: red;
}

.success {
  color: green;
}
</style>

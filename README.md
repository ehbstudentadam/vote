# Blockchain-Based Polling System

This repository contains my **final project for school**, a blockchain-based polling system deployed on the Ethereum blockchain. This project aims to revolutionize the traditional political system by replacing voting on political groups with direct voting on poll options. This eliminates the need for political parties, making politicians directly accountable for implementing the outcomes of these polls.

## 📜 Why This Exists

This project serves as a **proof of concept** to demonstrate how blockchain technology can be used to create a transparent, secure, and tamper-proof polling system. By leveraging blockchain, we ensure:

- Decentralized and tamper-proof voting.
- Transparency in poll creation and results.
- Accountability of politicians to fulfill polling outcomes.

**Note:** This project is a **proof of concept** and is limited to basic functionalities. It is not production-ready.

## 💡 How It Works with Blockchain

This system uses Ethereum smart contracts to handle the following:

1. **Poll Management**: Each poll is represented as a smart contract, allowing participants to vote securely.
2. **Token Distribution**: Users are allocated tokens (NFTs) specific to a poll, which they can use to cast votes.
3. **Access Control**: Role-based access ensures that only authorized entities can perform specific actions (e.g., creating polls, subscribing users).

Each poll is tied to a smart contract that:
- Tracks voting options and counts votes.
- Finalizes poll results after the deadline.
- Stores all data on the blockchain for immutability and transparency.

## 🔍 Smart Contracts Overview

Here’s a brief explanation of each contract and its responsibility:

1. **AccessControlManager.sol**  
    Handles role-based access control. Ensures that only authorized users and instances can interact with specific functions in the system.

2. **Poll.sol**  
    Represents an individual poll. Manages voting options, user votes, and finalization of poll results.

3. **PollFactory.sol**  
    Allows the creation of new polls. Each poll is deployed as a unique instance using this contract.

4. **UserRegistration.sol**  
    Manages user and instance registration, ensuring participants meet eligibility criteria.

5. **TokenDistribution.sol**  
    Handles the allocation and transfer of NFTs (tokens) for voting. Tracks token balances for each user.

6. **Subscription.sol**  
    Verifies user eligibility and handles the subscription process for polls, ensuring users have the necessary tokens to participate.

![contract interaction](images_md/rome.drawio.png)

## 🛠️ How to Run the Project

Follow these steps to set up and run the project:

### Prerequisites
- Node.js installed.
- npm package manager.
- Hardhat (installed via npm).

### Steps

1. **Open Three Terminal Windows**:
   - One for the Hardhat network.
   - One for deployment scripts.
   - One for the frontend.

2. **Terminal 1**: Start Hardhat Network
   ```bash
    npx hardhat clean
    npx hardhat compile
    npx hardhat test
    npx hardhat export-abi
    npx hardhat node
   ```

3. **Terminal 2**: Deploy Contracts
   ```bash
    npx hardhat run scripts/deployAndAssignRoles.js --network localhost
   ```

4. **Terminal 3**: Start Hardhat Network
   ```bash
    cd frontend
    npm install
    npm run dev
   ```


## 🚀 Features

- **Poll Creation**: Instances can create polls with customizable options.
- **User Registration**: Ensures participants are eligible to vote.
- **Secure Voting**: Users vote using NFTs allocated specifically for the poll.
- **Poll Results**: Transparent and immutable poll results stored on the blockchain.


## ⚠️ Limitations

- **Proof of Concept**: This system is a basic prototype and is not designed for production use.
- **No Real-World Deployment**: Currently, it runs only on a local blockchain (Hardhat).

## 🤝 Contribution
Feel free to fork this repository and suggest improvements or add new features. This is a learning project, and contributions are welcome!

## 📜 License
This project is licensed under the MIT License.
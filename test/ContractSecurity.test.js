//ContractInteraction.test.js - Testing contract interaction flow within eachother
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Define the private key directly (be sure it's the correct key for the testing account)
// First user's wallet (Account #0)
const userPrivateKey1 = "0x59c6995e998f97a5a004497f24a23c0a9e11b8c1a5f6f3a0913a78e37744f10b";
const userWallet1 = new ethers.Wallet(userPrivateKey1, ethers.provider);
// Second user's wallet (Account #1)
const userPrivateKey2 = "0x5f3f650e7b0bde4a4f8e1891dd6d3b60d1a99fe3b511ad2d6d74d5a75f7e666f";
const userWallet2 = new ethers.Wallet(userPrivateKey2, ethers.provider);
// Third user's wallet (Account #2)
const instancePrivateKey1 = "0x47c99c2b8ff3e47a16ef9313fd1a9dbaf701fdb3c621ec535fd81505d40f792f";
const instanceWallet1 = new ethers.Wallet(instancePrivateKey1, ethers.provider);
// Fourth user's wallet (Account #3)
const instancePrivateKey2 = "0x8b3a350cf5c34c9194ca71fc3d5ba23715f6c12a4565a5d1f850444cde644cf8";
const instanceWallet2 = new ethers.Wallet(instancePrivateKey2, ethers.provider);

describe("Contract Security Test", function () {
    let deployer;
    let accessControlManager, pollFactory, tokenDistribution, userRegistration, subscription;

    before(async function () {
        [deployer, user1, user2, instance1] = await ethers.getSigners();

        // Send some ETH for transaction fees
        await deployer.sendTransaction({
            to: userWallet1.address,
            value: ethers.parseEther("1.0"), // Send 1 ETH for gas fees
        });
        await deployer.sendTransaction({
            to: userWallet2.address,
            value: ethers.parseEther("1.0"), // Send 1 ETH for gas fees
        });
        await deployer.sendTransaction({
            to: instanceWallet1.address,
            value: ethers.parseEther("1.0"), // Send 1 ETH for gas fees
        });
        await deployer.sendTransaction({
            to: instanceWallet2.address,
            value: ethers.parseEther("1.0"), // Send 1 ETH for gas fees
        });

        // Deploy contracts
        accessControlManager = await deployContract("AccessControlManager");
        userRegistration = await deployContract("UserRegistration", await accessControlManager.getAddress());
        tokenDistribution = await deployContract("TokenDistribution", await accessControlManager.getAddress());
        subscription = await deployContract("Subscription", await tokenDistribution.getAddress(), await userRegistration.getAddress(), await accessControlManager.getAddress());
        pollFactory = await deployContract("PollFactory", await tokenDistribution.getAddress(), await accessControlManager.getAddress());

        // Grant roles to contracts
        await assignRoles();

        // Register instance and user
        await userRegistration.connect(userWallet1).registerUser(userWallet1.address, "UserWalletOne", 30, "userwallet1@example.com");
        await userRegistration.connect(userWallet2).registerUser(userWallet2.address, "UserWalletTwo", 30, "userwallet2@example.com");
        await userRegistration.connect(instanceWallet1).registerInstance(instanceWallet1.address, "InstanceWalletOne", "instancewallet1@example.com");
        await userRegistration.connect(instanceWallet2).registerInstance(instanceWallet2.address, "InstanceWalletTwo", "instancewallet2@example.com");
    });

    async function deployContract(contractName, ...args) {
        const Contract = await ethers.getContractFactory(contractName);
        const contract = await Contract.deploy(...args);
        await contract.waitForDeployment();
        //console.log(`${contractName} deployed at:`, await contract.getAddress());
        return contract;
    }

    async function assignRoles() {

        const roles = {
            USER_ROLE: await accessControlManager.USER_ROLE(),
            INSTANCE_ROLE: await accessControlManager.INSTANCE_ROLE(),
            ADMIN_ROLE: await accessControlManager.ADMIN_ROLE(),
            DISTRIBUTOR_ROLE: await accessControlManager.DISTRIBUTOR_ROLE()
        };

        const contractsToAssignRoles = [
            { role: roles.USER_ROLE, address: await userRegistration.getAddress() },
            { role: roles.INSTANCE_ROLE, address: await userRegistration.getAddress() },
            { role: roles.ADMIN_ROLE, address: await userRegistration.getAddress() },
            { role: roles.DISTRIBUTOR_ROLE, address: await tokenDistribution.getAddress() },
            { role: roles.DISTRIBUTOR_ROLE, address: await pollFactory.getAddress() },
            { role: roles.INSTANCE_ROLE, address: await pollFactory.getAddress() },
            { role: roles.USER_ROLE, address: await subscription.getAddress() },
            { role: roles.DISTRIBUTOR_ROLE, address: await subscription.getAddress() }
        ];

        for (const { role, address } of contractsToAssignRoles) {
            await accessControlManager.connect(deployer).grantRoleToContract(role, address);
        }
    }

    async function subscribeUserToPoll(user, pollAddress) {
        await subscription.connect(user).subscribeUser(pollAddress, user.address);
    }

    async function verifyUserSubscription(pollAddress, user, minTokensRequired) {
        // Convert pollAddress to pollId
        const pollId = BigInt(pollAddress);

        // Check the user's balance of NFTs for this poll
        const userBalance = await tokenDistribution.balanceOf(user.address, pollId);
        const pollBalanceAfter = await tokenDistribution.balanceOf(pollAddress, pollId);

        // Validate balances
        expect(userBalance).to.equal(minTokensRequired);
        expect(pollBalanceAfter).to.equal(1000 - minTokensRequired);

        // Query events to verify the subscription
        const events = await subscription.queryFilter(subscription.filters.UserSubscribed());
        const userSubscribedEvent = events.find(event =>
            event.args.user === user.address &&
            event.args.poll === pollAddress &&
            event.args.tokenAmount.toString() === minTokensRequired.toString()
        );

        // Ensure the event exists and matches expectations
        expect(userSubscribedEvent).to.not.be.undefined;
        expect(userSubscribedEvent.args.user).to.equal(user.address);
        expect(userSubscribedEvent.args.poll).to.equal(pollAddress);
        expect(userSubscribedEvent.args.tokenAmount).to.equal(minTokensRequired);
    }

    async function createPoll(instance, options, title, age, location, minTokensRequired, totalTokenSupply) {
        const endDate = Math.floor(Date.now() / 1000) + 3600;
        await pollFactory.connect(instance).createPoll(title, options, endDate, age, location, minTokensRequired, totalTokenSupply);
        const pollAddress = await pollFactory.allPolls(0);
        return await ethers.getContractAt("Poll", pollAddress);
    }

    it("Should register 2 instances and 2 users", async function () {
        const isInstance1 = await userRegistration.isInstance(instanceWallet1.address);
        const isInstance2 = await userRegistration.isInstance(instanceWallet2.address);
        const isUser1 = await userRegistration.isUser(userWallet1.address);
        const isUser2 = await userRegistration.isUser(userWallet2.address);

        expect(isInstance1).to.be.true;
        expect(isInstance2).to.be.true;
        expect(isUser1).to.be.true;
        expect(isUser2).to.be.true;
    });

    it("Should not allow double registrations", async function () {
        // Attempt to register a user wallet (already registered as USER_ROLE) as an instance
        await expect(userRegistration.connect(userWallet1).registerInstance(userWallet1.address, "OrgFromUserWalletOne", "contactFromUserWalletOne@example.com")
        ).to.be.revertedWith('User already has a different role assigned');

        // Attempt to register an instance wallet (already registered as INSTANCE_ROLE) as a user
        await expect(
            userRegistration.connect(instanceWallet1).registerUser(instanceWallet1.address, "UserFromInstanceWalletOne", 25, "userFromInstanceWalletOne@example.com")
        ).to.be.revertedWith('User already has a different role assigned');

        await expect(
            userRegistration.connect(userWallet1).registerUser(userWallet1.address, "UserWalletOne", 30, "userwallet1@example.com")
        ).to.be.revertedWith("User already registered");

        await expect(
            userRegistration.connect(instanceWallet1).registerInstance(instanceWallet1.address, "InstanceWalletOne", "instancewallet1@example.com")
        ).to.be.revertedWith("Instance already registered");
    });

    it("Should allow an instance to create a poll", async function () {
        const poll = await createPoll(instanceWallet1, ["Option1", "Option2"], "instanceWallet1 Poll 1", 18, "belgium", 100, 1000);
        const [pollMinAge, pollLocation, pollMinTokensRequired] = await poll.getEligibility();

        expect(pollMinAge).to.equal(18);
        expect(pollLocation).to.equal("belgium");
        expect(pollMinTokensRequired).to.equal(100);
    });

    it("Should deny a user to create a poll", async function () {
        await expect(
            pollFactory.connect(userWallet1).createPoll("User Attempted Poll", ["OptionA", "OptionB"], Math.floor(Date.now() / 1000) + 3600, 21, "countryX", 50, 500)
        ).to.be.revertedWith("Access denied: Incorrect role");
    });

    it("Should allow a user to vote on a poll", async function () {
        // Create a new poll and subscribe userWallet1 to it
        const poll = await createPoll(instanceWallet2, ["Option1", "Option2"], "instanceWallet2 Poll 1", 18, "belgium", 100, 1000);
        const pollAddress = await poll.getAddress();

        // Derive pollId based on pollAddress
        const pollId = BigInt(pollAddress);

        // Check the initial balance of the poll for the NFT token
        const initialPollBalance = await tokenDistribution.balanceOf(pollAddress, pollId);
        expect(initialPollBalance).to.equal(1000);

        // Subscribe userWallet1 to the poll
        await subscribeUserToPoll(userWallet1, pollAddress);

        // Verify user subscription
        await verifyUserSubscription(pollAddress, userWallet1, 100);

        // Define vote details (which options and how many tokens to allocate)
        const voteOptions = { optionIndexes: [0, 1], amounts: [40, 60] };

        // Set approval for the Poll contract to transfer NFTs on behalf of userWallet1
        await tokenDistribution.connect(userWallet1).setApprovalForAll(pollAddress, true);

        // Check initial vote counts before casting votes
        let initialVoteCountOption0 = await poll.getVoteCount(0);
        let initialVoteCountOption1 = await poll.getVoteCount(1);
        expect(initialVoteCountOption0).to.equal(0);
        expect(initialVoteCountOption1).to.equal(0);

        // Cast votes on the poll by transferring the required NFTs for voting
        await poll.connect(userWallet1).castVotes(voteOptions.optionIndexes, voteOptions.amounts);

        // Check the updated vote counts after casting votes
        const updatedVoteCountOption0 = await poll.getVoteCount(0);
        const updatedVoteCountOption1 = await poll.getVoteCount(1);

        // Assert that the votes have been recorded correctly
        expect(updatedVoteCountOption0).to.equal(40);
        expect(updatedVoteCountOption1).to.equal(60);

        // Verify the updated NFT balances
        const userBalanceAfterVote = await tokenDistribution.balanceOf(userWallet1.address, pollId);
        const pollBalanceAfterVote = await tokenDistribution.balanceOf(pollAddress, pollId);

        // User should have spent their tokens to vote, and poll should hold the used tokens
        expect(userBalanceAfterVote).to.equal(100 - (40 + 60));
        expect(pollBalanceAfterVote).to.equal(1000 - 100 + (40 + 60));
    });

    it("Should deny an Instance to subscribe or vote on a poll", async function () {
        // First, create a new poll as an instance
        const poll = await createPoll(instanceWallet2, ["Option1", "Option2"], "instanceWallet2 Poll 2", 18, "belgium", 100, 1000);
        const pollAddress = await poll.getAddress();

        // Attempt to have the instance subscribe to the poll
        await expect(
            subscription.connect(instanceWallet2).subscribeUser(pollAddress, instanceWallet2.address)
        ).to.be.revertedWith("Access denied: Incorrect role");

        // Attempt to have the instance cast a vote in the poll
        await expect(
            poll.connect(instanceWallet2).castVote(0, 10)
        ).to.be.revertedWith("Access denied: Incorrect role");
    });
});

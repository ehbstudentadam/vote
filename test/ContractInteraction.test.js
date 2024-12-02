//ContractInteraction.test.js - Testing contract interaction flow within eachother
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Define the private key directly (be sure it's the correct key for the testing account)
const userPrivateKey1 = "0x59c6995e998f97a5a004497f24a23c0a9e11b8c1a5f6f3a0913a78e37744f10b";
const userWallet1 = new ethers.Wallet(userPrivateKey1).connect(ethers.provider);


describe("Contract Interactions Test Suite", function () {
    let deployer, user1, user2, instance1;
    let accessControlManager, pollFactory, tokenDistribution, userRegistration, subscription, poll;

    before(async function () {
        [deployer, user1, user2, instance1] = await ethers.getSigners();

        // Send some ETH to userWallet1 for transaction fees
        await deployer.sendTransaction({
            to: userWallet1.address,
            value: ethers.parseEther("1.0"), // Send 1 ETH for gas fees
        });

        // Deploy contracts
        accessControlManager = await deployContract("AccessControlManager");
        userRegistration = await deployContract("UserRegistration", await accessControlManager.getAddress());
        tokenDistribution = await deployContract("TokenDistribution", await accessControlManager.getAddress());
        subscription = await deployContract("Subscription", await tokenDistribution.getAddress(), await userRegistration.getAddress(), await accessControlManager.getAddress());
        //voting = await deployContract("Voting", await tokenDistribution.getAddress(), await accessControlManager.getAddress());
        pollFactory = await deployContract("PollFactory", await tokenDistribution.getAddress(), await accessControlManager.getAddress());

        // Grant roles to contracts
        await assignRoles();

        // Register instance and user
        console.log("Registering instance, user and walletUser in UserRegistration...");
        await userRegistration.connect(instance1).registerInstance(instance1.address, "InstanceOrg", "contact@example.com");
        await userRegistration.connect(user1).registerUser(user1.address, "UserOne", 30, "user1@example.com");
        await userRegistration.connect(userWallet1).registerUser(userWallet1.address, "UserWalletOne", 30, "userwallet1@example.com");
    });

    async function deployContract(contractName, ...args) {
        const Contract = await ethers.getContractFactory(contractName);
        const contract = await Contract.deploy(...args);
        await contract.waitForDeployment();
        console.log(`${contractName} deployed at:`, await contract.getAddress());
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
            // { role: roles.DISTRIBUTOR_ROLE, address: await voting.getAddress() },
            // { role: roles.USER_ROLE, address: await voting.getAddress() },
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

    //to be removed
    async function getPermitSignature(owner, spender, value, deadline, token, nonce) {
        const domain = {
            name: await token.name(),
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: await token.getAddress(),
        };

        const types = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" }
            ]
        };

        const message = {
            owner: await owner.getAddress(),
            spender,
            value,
            nonce,
            deadline
        };

        const signature = await owner.signTypedData(domain, types, message);
        const parsedSignature = ethers.Signature.from(signature);

        return {
            v: parsedSignature.v,
            r: parsedSignature.r,
            s: parsedSignature.s
        };
    }

    async function createPoll(instance, options, title, age, location, minTokensRequired, totalTokenSupply) {
        const endDate = Math.floor(Date.now() / 1000) + 3600;
        await pollFactory.connect(instance).createPoll(title, options, endDate, age, location, minTokensRequired, totalTokenSupply);
        const pollAddress = await pollFactory.allPolls(0);
        return await ethers.getContractAt("Poll", pollAddress);
    }

    it("Should register an instance and user", async function () {
        const isInstance = await userRegistration.isInstance(instance1.address);
        const isUser = await userRegistration.isUser(user1.address);

        expect(isInstance).to.be.true;
        expect(isUser).to.be.true;
    });

    it("Should allow an instance to create a poll", async function () {
        const poll = await createPoll(instance1, ["Option1", "Option2"], "Sample Poll", 18, "belgium", 100, 1000);
        const [pollMinAge, pollLocation, pollMinTokensRequired] = await poll.getEligibility();

        expect(pollMinAge).to.equal(18);
        expect(pollLocation).to.equal("belgium");
        expect(pollMinTokensRequired).to.equal(100);
    });

    it("Should allow a user to vote on a poll", async function () {
        // Create a new poll and subscribe userWallet1 to it
        const poll = await createPoll(instance1, ["Option1", "Option2"], "Sample Poll", 18, "belgium", 100, 1000);
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


});

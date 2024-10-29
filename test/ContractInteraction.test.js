const { expect } = require("chai");
const { ethers } = require("hardhat");

// Define the private key directly (be sure it's the correct key for the testing account)
const userPrivateKey1 = "0x59c6995e998f97a5a004497f24a23c0a9e11b8c1a5f6f3a0913a78e37744f10b";
const userWallet1 = new ethers.Wallet(userPrivateKey1).connect(ethers.provider);


describe("Contract Interactions Test Suite", function () {
    let deployer, user1, user2, instance1;
    let accessControlManager, pollFactory, tokenDistribution, userRegistration, subscription, voting, poll;

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
        subscription = await deployContract("Subscription", await tokenDistribution.getAddress(), await accessControlManager.getAddress());
        voting = await deployContract("Voting", await tokenDistribution.getAddress(), await accessControlManager.getAddress());
        pollFactory = await deployContract("PollFactory", await tokenDistribution.getAddress(), await accessControlManager.getAddress());

        // Grant roles to contracts
        await assignRoles();

        // Register instance and user
        console.log("Registering instance, user and walletUser in UserRegistration...");
        await userRegistration.connect(deployer).registerInstance(instance1.address, "InstanceOrg", "contact@example.com");
        await userRegistration.connect(deployer).registerUser(user1.address, "UserOne", 30, "user1@example.com");
        await userRegistration.connect(deployer).registerUser(userWallet1.address, "UserWalletOne", 30, "userwallet1@example.com");
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
            { role: roles.DISTRIBUTOR_ROLE, address: await voting.getAddress() },
            { role: roles.USER_ROLE, address: await voting.getAddress() },
            { role: roles.USER_ROLE, address: await subscription.getAddress() },
            { role: roles.DISTRIBUTOR_ROLE, address: await subscription.getAddress() }
        ];

        for (const { role, address } of contractsToAssignRoles) {
            await accessControlManager.connect(deployer).grantRoleToContract(role, address);
        }
    }

    async function subscribeUserToPoll(user, pollAddress, age, location, tokensAvailable) {
        await subscription.connect(user).subscribeUser(pollAddress, user.address, age, location, tokensAvailable);
    }

    async function verifyUserSubscription(pollAddress, user, minTokensRequired) {
        const userBalance = await tokenDistribution.balanceOf(user.address);
        const pollBalanceAfter = await tokenDistribution.balanceOf(pollAddress);

        expect(userBalance).to.equal(minTokensRequired);
        expect(pollBalanceAfter).to.equal(1000 - minTokensRequired);

        const events = await subscription.queryFilter(subscription.filters.UserSubscribed());
        const userSubscribedEvent = events.find(event =>
            event.args.user === user.address &&
            event.args.poll === pollAddress &&
            event.args.tokenAmount.toString() === minTokensRequired.toString()
        );

        expect(userSubscribedEvent).to.not.be.undefined;
        expect(userSubscribedEvent.args.user).to.equal(user.address);
        expect(userSubscribedEvent.args.poll).to.equal(pollAddress);
        expect(userSubscribedEvent.args.tokenAmount).to.equal(minTokensRequired);
    }

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

    async function createPoll(instance, options, title, minTokensRequired, totalTokenSupply) {
        const endDate = Math.floor(Date.now() / 1000) + 3600;
        await pollFactory.connect(instance).createPoll(title, options, endDate, 18, "USA", minTokensRequired, totalTokenSupply);
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
        const poll = await createPoll(instance1, ["Option1", "Option2"], "Sample Poll", 100, 1000);
        const [pollMinAge, pollLocation, pollMinTokensRequired] = await poll.getEligibility();

        expect(pollMinAge).to.equal(18);
        expect(pollLocation).to.equal("USA");
        expect(pollMinTokensRequired).to.equal(100);
    });

    it("Should allow a user to subscribe to a poll", async function () {
        const poll = await createPoll(instance1, ["Option1", "Option2"], "Sample Poll", 100, 1000);
        const pollAddress = await poll.getAddress();

        const initialPollBalance = await tokenDistribution.balanceOf(pollAddress);
        expect(initialPollBalance).to.equal(1000);

        await subscribeUserToPoll(userWallet1, pollAddress, 30, "USA", 100);
        await verifyUserSubscription(pollAddress, userWallet1, 100);
    });

    it("Should allow a user to vote on a poll", async function () {
        // Create a new poll and subscribe user1 to it
        const poll = await createPoll(instance1, ["Option1", "Option2"], "Sample Poll", 100, 1000);
        const pollAddress = await poll.getAddress();
        await subscribeUserToPoll(userWallet1, pollAddress, 30, "USA", 100);

        // Define vote details (which options and how many tokens to allocate)
        const voteOptions = { optionIndexes: [0, 1], amounts: [40, 60] };

        // Generate EIP-2612 permit signature for user1 to authorize token transfer
        const userWallet1Address = await userWallet1.getAddress();
        const votingAddress = await voting.getAddress();
        const nonce = await tokenDistribution.nonces(userWallet1Address);
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const { v, r, s } = await getPermitSignature(
            userWallet1,
            votingAddress,
            100,
            deadline,
            tokenDistribution,
            nonce
        );

        // Cast votes on the poll with generated permit signature
        await voting.connect(userWallet1).castVotes(
            pollAddress,
            voteOptions,
            { deadline, v, r, s },
            { deadline, v, r, s }
        );

        // Log the actual values before assertions
        const voteCountOption0 = await poll.getVoteCount(0);
        const voteCountOption1 = await poll.getVoteCount(1);

        expect(voteCountOption0).to.equal(40);
        expect(voteCountOption1).to.equal(60);
    });
});
// ignition.js
const { Ignition, useNetwork } = require("@nomiclabs/hardhat-ignition");
const { ethers } = require("ethers");

async function deployContracts() {
  const ignition = await Ignition.createIgnition(useNetwork());

  // Define contract deploys
  const deployUserRegistration = ignition.deploy("UserRegistration", {
    constructorArgs: ["0xYourAdminAddressHere"],  // Replace with the real admin address
  });

  const deployTokenDistribution = ignition.deploy("TokenDistribution", {
    constructorArgs: ["0xYourAdminAddressHere"],  // Admin address for token distribution
    libraries: {},  // If there are any linked libraries
  });

  const deployPollFactory = ignition.deploy("PollFactory", {
    constructorArgs: [
      "0xYourAdminAddressHere", // Admin address
      deployTokenDistribution,  // Address of TokenDistribution contract
    ],
    libraries: {},  // If there are any linked libraries
  });

  const deploySubscriptionContract = ignition.deploy("SubscriptionContract", {
    constructorArgs: [
      "0xYourAdminAddressHere",  // Admin address
      deployTokenDistribution,    // TokenDistribution contract address
    ]
  });

  const deployVotingContract = ignition.deploy("VotingContract", {
    constructorArgs: [
      "Sample Poll Title",  // Poll title for VotingContract
      ["Option 1", "Option 2"],  // Voting options array
      ethers.BigNumber.from(1687353600), // Example end date (UNIX timestamp)
      "0xYourAdminAddressHere",   // Admin address
      deployTokenDistribution     // TokenDistribution contract address
    ]
  });

  // Specify deployment order if needed
  await ignition.execute([
    deployUserRegistration,
    deployTokenDistribution,
    deployPollFactory,
    deploySubscriptionContract,
    deployVotingContract,
  ]);

  // Log the deployment results
  console.log("Contracts deployed successfully:");
  console.log("UserRegistration:", await deployUserRegistration.address);
  console.log("TokenDistribution:", await deployTokenDistribution.address);
  console.log("PollFactory:", await deployPollFactory.address);
  console.log("SubscriptionContract:", await deploySubscriptionContract.address);
  console.log("VotingContract:", await deployVotingContract.address);
}

module.exports = deployContracts;

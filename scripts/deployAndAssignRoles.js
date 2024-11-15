const { ethers } = require("hardhat");

async function main() {
  // Get the deployer's signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy AccessControlManager
  const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
  const accessControlManager = await AccessControlManager.deploy();
  await accessControlManager.waitForDeployment();
  console.log("AccessControlManager deployed to:", accessControlManager.target);

  // Deploy TokenDistribution
  const TokenDistribution = await ethers.getContractFactory("TokenDistribution");
  const tokenDistribution = await TokenDistribution.deploy(accessControlManager.target);
  await tokenDistribution.waitForDeployment();
  console.log("TokenDistribution deployed to:", tokenDistribution.target);

  // Deploy UserRegistration
  const UserRegistration = await ethers.getContractFactory("UserRegistration");
  const userRegistration = await UserRegistration.deploy(accessControlManager.target);
  await userRegistration.waitForDeployment();
  console.log("UserRegistration deployed to:", userRegistration.target);

  // Deploy Subscription
  const Subscription = await ethers.getContractFactory("Subscription");
  const subscription = await Subscription.deploy(tokenDistribution.target, accessControlManager.target);
  await subscription.waitForDeployment();
  console.log("Subscription deployed to:", subscription.target);

  // Deploy Voting
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(tokenDistribution.target, accessControlManager.target);
  await voting.waitForDeployment();
  console.log("Voting deployed to:", voting.target);

  // Deploy PollFactory
  const PollFactory = await ethers.getContractFactory("PollFactory");
  const pollFactory = await PollFactory.deploy(tokenDistribution.target, accessControlManager.target);
  await pollFactory.waitForDeployment();
  console.log("PollFactory deployed to:", pollFactory.target);

  // Fetch role values
  const adminRole = await accessControlManager.ADMIN_ROLE();
  const userRole = await accessControlManager.USER_ROLE();
  const instanceRole = await accessControlManager.INSTANCE_ROLE();
  const distributorRole = await accessControlManager.DISTRIBUTOR_ROLE();

  // Assign roles
  console.log("Assigning roles...");

  await accessControlManager.grantRoleToContract(adminRole, userRegistration.target);
  console.log(`Granted ADMIN_ROLE to UserRegistration at ${userRegistration.target}`);

  await accessControlManager.grantRoleToContract(userRole, userRegistration.target);
  console.log(`Granted USER_ROLE to UserRegistration at ${userRegistration.target}`);

  await accessControlManager.grantRoleToContract(instanceRole, userRegistration.target);
  console.log(`Granted INSTANCE_ROLE to UserRegistration at ${userRegistration.target}`);

  await accessControlManager.grantRoleToContract(distributorRole, tokenDistribution.target);
  console.log(`Granted DISTRIBUTOR_ROLE to TokenDistribution at ${tokenDistribution.target}`);

  await accessControlManager.grantRoleToContract(distributorRole, pollFactory.target);
  console.log(`Granted DISTRIBUTOR_ROLE to PollFactory at ${pollFactory.target}`);

  await accessControlManager.grantRoleToContract(instanceRole, pollFactory.target);
  console.log(`Granted INSTANCE_ROLE to PollFactory at ${pollFactory.target}`);

  await accessControlManager.grantRoleToContract(distributorRole, voting.target);
  console.log(`Granted DISTRIBUTOR_ROLE to Voting at ${voting.target}`);

  await accessControlManager.grantRoleToContract(userRole, voting.target);
  console.log(`Granted USER_ROLE to Voting at ${voting.target}`);

  await accessControlManager.grantRoleToContract(userRole, subscription.target);
  console.log(`Granted USER_ROLE to Subscription at ${subscription.target}`);

  await accessControlManager.grantRoleToContract(distributorRole, subscription.target);
  console.log(`Granted DISTRIBUTOR_ROLE to Subscription at ${subscription.target}`);

  console.log("All contracts deployed and roles assigned successfully!");
}

// Run the script
main().catch((error) => {
  console.error("Error deploying contracts:", error);
  process.exit(1);
});

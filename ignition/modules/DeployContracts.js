const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const AccessControlManagerArtifact = require("../../artifacts/contracts/AccessControlManager.sol/AccessControlManager.json");
const TokenDistributionArtifact = require("../../artifacts/contracts/TokenDistribution.sol/TokenDistribution.json");
const UserRegistrationArtifact = require("../../artifacts/contracts/UserRegistration.sol/UserRegistration.json");
const SubscriptionArtifact = require("../../artifacts/contracts/Subscription.sol/Subscription.json");
const VotingArtifact = require("../../artifacts/contracts/Voting.sol/Voting.json");
const PollFactoryArtifact = require("../../artifacts/contracts/PollFactory.sol/PollFactory.json");

module.exports = buildModule("DeployContracts", (m) => {
  const deployer = m.getAccount(0);

  // Deploy contracts
  const accessControlManager = m.contract("AccessControlManager", AccessControlManagerArtifact, [], { from: deployer });
  const tokenDistribution = m.contract("TokenDistribution", TokenDistributionArtifact, [accessControlManager], { from: deployer });
  const userRegistration = m.contract("UserRegistration", UserRegistrationArtifact, [accessControlManager], { from: deployer });
  const subscription = m.contract("Subscription", SubscriptionArtifact, [tokenDistribution, accessControlManager], { from: deployer });
  const voting = m.contract("Voting", VotingArtifact, [tokenDistribution, accessControlManager], { from: deployer });
  const pollFactory = m.contract("PollFactory", PollFactoryArtifact, [tokenDistribution, accessControlManager], { from: deployer });

  // Return deployed contracts
  return {
    accessControlManager,
    tokenDistribution,
    userRegistration,
    subscription,
    voting,
    pollFactory,
  };
});

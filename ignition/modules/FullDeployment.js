const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const AccessControlManagerArtifact = require("../../artifacts/contracts/AccessControlManager.sol/AccessControlManager.json");
const TokenDistributionArtifact = require("../../artifacts/contracts/TokenDistribution.sol/TokenDistribution.json");
const UserRegistrationArtifact = require("../../artifacts/contracts/UserRegistration.sol/UserRegistration.json");
const SubscriptionArtifact = require("../../artifacts/contracts/Subscription.sol/Subscription.json");
const VotingArtifact = require("../../artifacts/contracts/Voting.sol/Voting.json");
const PollFactoryArtifact = require("../../artifacts/contracts/PollFactory.sol/PollFactory.json");

module.exports = buildModule("FullDeployment", (m) => {
  const accessControlManager = m.contract("AccessControlManager", AccessControlManagerArtifact);
  const tokenDistribution = m.contract("TokenDistribution", TokenDistributionArtifact, [
    accessControlManager
  ]);
  const userRegistration = m.contract("UserRegistration", UserRegistrationArtifact, [
    accessControlManager
  ]);
  const subscription = m.contract("Subscription", SubscriptionArtifact, [
    tokenDistribution,
    accessControlManager
  ]);
  const voting = m.contract("Voting", VotingArtifact, [
    tokenDistribution,
    accessControlManager
  ]);
  const pollFactory = m.contract("PollFactory", PollFactoryArtifact, [
    tokenDistribution,
    accessControlManager
  ]);

  return { accessControlManager, tokenDistribution, userRegistration, subscription, voting, pollFactory };
});

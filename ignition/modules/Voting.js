const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("VotingModule", (m) => {
  const { accessControlManager, tokenDistribution } = m.useModules("AccessControlManagerModule", "TokenDistributionModule");
  const voting = m.contract("Voting", { args: [tokenDistribution, accessControlManager] });
  return { voting };
});

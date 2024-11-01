const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PollFactoryModule", (m) => {
  const { accessControlManager, tokenDistribution } = m.useModules("AccessControlManagerModule", "TokenDistributionModule");
  const pollFactory = m.contract("PollFactory", { args: [tokenDistribution, accessControlManager] });
  return { pollFactory };
});

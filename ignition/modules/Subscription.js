const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("SubscriptionModule", (m) => {
  const { accessControlManager, tokenDistribution } = m.useModules("AccessControlManagerModule", "TokenDistributionModule");
  const subscription = m.contract("Subscription", { args: [tokenDistribution, accessControlManager] });
  return { subscription };
});

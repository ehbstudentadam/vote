const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TokenDistributionModule", (m) => {
  const { accessControlManager } = m.useModule("AccessControlManagerModule");
  const tokenDistribution = m.contract("TokenDistribution", { args: [accessControlManager] });
  return { tokenDistribution };
});

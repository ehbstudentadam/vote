const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("UserRegistrationModule", (m) => {
  const { accessControlManager } = m.useModule("AccessControlManagerModule");
  const userRegistration = m.contract("UserRegistration", { args: [accessControlManager] });
  return { userRegistration };
});

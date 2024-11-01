const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AccessControlManagerModule", (m) => {
  const accessControlManager = m.contract("AccessControlManager");
  return { accessControlManager };
});

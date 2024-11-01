const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CreatePollModule", (m) => {
  const { pollFactory } = m.useModule("PollFactoryModule");
  const pollCreation = m.call(pollFactory, "createPoll", [
    "Poll Title",
    ["Option 1", "Option 2"],  // options
    Math.floor(Date.now() / 1000) + 86400,  // endDate: 1 day from now
    18,  // minAge
    "USA",  // location
    100,  // minTokensRequired
    1000  // totalTokenSupply
  ]);

  return { pollCreation };
});

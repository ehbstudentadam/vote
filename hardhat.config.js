const { url } = require("inspector");
require("@nomicfoundation/hardhat-ignition-ethers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_URL, SECRET_KEY, ETHERSCAN_KEY } = process.env;
const path = require("path");
const fs = require("fs");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_URL || "",
      accounts: SECRET_KEY !== undefined ? [SECRET_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_KEY || ""
    }
  }
};

// Define the custom task for exporting ABI files
task("export-abi", "Exports ABIs to the frontend directory")
  .setAction(async () => {
    const artifactsDir = path.join(__dirname, "artifacts", "contracts");
    const frontendDir = path.join(__dirname, "frontend", "artifacts");

    // Ensure the frontend artifacts folder exists
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    fs.readdirSync(artifactsDir).forEach(contractDir => {
      const contractFiles = fs.readdirSync(path.join(artifactsDir, contractDir));
      contractFiles.forEach(file => {
        if (file.endsWith(".json")) {
          fs.copyFileSync(
            path.join(artifactsDir, contractDir, file),
            path.join(frontendDir, file)
          );
        }
      });
    });
  });

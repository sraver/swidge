import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "./tasks/index";

import { HardhatUserConfig } from "hardhat/types";
import * as process from "process";

const accounts = {
  mnemonic:
    process.env.MNEMONIC ||
    "test test test test test test test test test test test junk",
};

const forking = process.env.FORKING === "true";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.1",
      },
    ],
    settings: {
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts,
      chainId: forking ? Number(process.env.FORKED_CHAIN_ID) : 31337,
      forking: {
        enabled: forking,
        url: `${process.env.FORKED_RPC_NODE}`,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    polygon: {
      url: process.env.RPC_NODE_POLYGON || "https://polygon-rpc.com/",
      accounts,
      chainId: Number(process.env.CHAIN_ID_POLYGON || 137),
      gasMultiplier: 2,
    },
    fantom: {
      url: process.env.RPC_NODE_FANTOM || "https://rpcapi.fantom.network/",
      accounts,
      chainId: Number(process.env.CHAIN_ID_FANTOM || 250),
      gasMultiplier: 2,
    },
    bsc: {
      url: process.env.RPC_NODE_BSC || "https://bsc-dataseed1.binance.org/",
      accounts,
      chainId: Number(process.env.CHAIN_ID_BSC || 56),
      gasMultiplier: 2,
    },
    avax: {
      url: process.env.RPC_NODE_AVALANCHE || "https://api.avax.network/ext/bc/C/rpc",
      accounts,
      chainId: Number(process.env.CHAIN_ID_AVAX || 43114),
      gasMultiplier: 2,
    },
  },
  etherscan: {
    apiKey: {
      polygon: String(process.env.POLYGONSCAN_API_KEY),
      opera: String(process.env.FTMSCAN_API_KEY),
      avalanche: String(process.env.SNOWTRACE_API_KEY),
      bsc: String(process.env.BSCSCAN_API_KEY),
    },
  },
  gasReporter: {
    enabled: process.env.GAS_REPORTING === "true",
  },
};

export default config;

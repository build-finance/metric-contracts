import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-deploy';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'dotenv/config';
import {HardhatUserConfig} from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.0",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`,
        blockNumber: parseInt(<string>process.env.ETH_MAINNET_BLOCK_NUMBER)
      }
    },
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_ROPSTEN_API_KEY}`,
      chainId: 3,
      gasPrice: 20000000000,
      accounts: [`0x${process.env.ROPSTEN_PRIVATE_KEY}`],
    },
    eth_mainnet_taichi: {
      url: "https://api.taichi.network:10001/rpc/private",
      chainId: 1,
      gasPrice: 50000000000,
      accounts: [`0x${process.env.ETH_MAINNET_PRIVATE_KEY}`],
    },
    eth_mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`,
      chainId: 1,
      gasPrice: 40000000000,
      accounts: [`0x${process.env.ETH_MAINNET_PRIVATE_KEY}`],
    },
    fantom_mainnet: {
      url: `https://rpc.ftm.tools/`,
      chainId: 250,
      gasPrice: 200000000000,
      accounts: [`0x${process.env.FANTOM_MAINNET_PRIVATE_KEY}`],
    },
    fantom_metric_mainnet: {
      url: `https://rpc.ftm.tools/`,
      chainId: 250,
      accounts: [`0x${process.env.ETH_MAINNET_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    currency: 'EUR',
    coinmarketcap: process.env.CMC_API_KEY || undefined,
    enabled: !!process.env.REPORT_GAS,
    showTimeSpent: true,
  },
  mocha: {
    timeout: 200000
  }
};

export default config;

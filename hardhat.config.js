require("@nomiclabs/hardhat-waffle");
require('hardhat-gas-reporter');
require('solidity-coverage');

require("dotenv").config();

module.exports = {
  solidity: "0.8.0",
  networks: {
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${process.env.ALCHEMY_ROPSTEN_API_KEY}`,
      accounts: [`0x${process.env.ROPSTEN_ACCOUNT_PRIVATE_KEY}`]
    }
  },
  gasReporter: {
    currency: 'EUR',
    coinmarketcap: process.env.CMC_API_KEY || undefined,
    enabled: !!process.env.REPORT_GAS,
    showTimeSpent: true,
  },
};

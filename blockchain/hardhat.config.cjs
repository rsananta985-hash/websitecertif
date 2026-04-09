require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337,
      // Keep accounts persistent across restarts for consistent private keys
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 5,
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    }
  }
};

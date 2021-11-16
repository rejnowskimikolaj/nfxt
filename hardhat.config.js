require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});
const {ROPSTEN_PRIVATE_KEY, INFURA_API_KEY, RINKEBY_PRIVATE_KEY, HARMONY_PRIVATE_KEY} = require('./secrets.json');

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.4",
    networks: {
        ropsten: {
            url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [`0x${ROPSTEN_PRIVATE_KEY}`],
        },
        rinkeby: {
            url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [`0x${RINKEBY_PRIVATE_KEY}`] // add the account that will deploy the contract (private key)
        },
        harmony_testnet: {
            url: `https://api.s0.b.hmny.io`,
            accounts: [`0x${HARMONY_PRIVATE_KEY}`],
        },
    },
};

require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.17",
        settings: {
                optimizer: {
                    enabled: true,
                    runs: 300,
                },
            }   ,
        },
    gasReporter: {
        enabled: process.env.REPORT_GAS=="true" ? true : false
    },
    // networks: {
    //     bscTestnet: {
    //         url: process.env.RPC,
    //         accounts: [process.env.PRIVATE_KEY]
    //     },
    //     goerli: {
    //         url: process.env.RPC,
    //         accounts: [process.env.PRIVATE_KEY]
    //     },
    // },
};

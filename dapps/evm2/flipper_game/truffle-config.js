const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config() 

// Moonbeam Development Node Private Key
const privateKeyDev =
   '99B3C12287537E38C90A9219D4CB074A89A16E9CDB20BF85728EBD97C343E342';
const privateKeyMoonbase = process.env.MOONBASE_PRIVATE_KEY;

const defaultMoonbaseEndpoint = 'https://rpc.api.moonbase.moonbeam.network';
const defaultMoonbaseNetworkId = 1287;

module.exports = {
   networks: {
      // Moonbeam Development Network
      dev: {
         provider: () => {
            if (!privateKeyDev.trim()) {
               throw new Error(
                  'Please enter a private key with funds, you can use the default one'
               );
            }
            let args = {
               privateKeys: [privateKeyDev],
               providerOrUrl: 'http://localhost:9944/',
            };
            return new HDWalletProvider(args);
         },
         network_id: 1281,
      },
      // Moonbase Alpha TestNet
      moonbase: {
         provider: () => {
            if (!privateKeyMoonbase.trim()) {
               throw new Error(
                  'Please enter a private key with funds to send transactions to TestNet'
               );
            }
            if (privateKeyDev == privateKeyMoonbase) {
               throw new Error(
                  'Please change the private key used for Moonbase to your own with funds'
               );
            }
            let args = {
               privateKeys: [privateKeyMoonbase],
               providerOrUrl: process.env.MOONBASE_BLASTAPI_ENDPOINT,
               retryTimeout: 10000, // default 400, modifying doesn't help
            };
            return new HDWalletProvider(args);
         },
         websocket: true,
         gasLimit: 5000000,
         networkCheckTimeout: 1000000000,
         network_id: defaultMoonbaseNetworkId,
      }
   },
   mocha: {
      timeout: 1000000000, // milliseconds
      enableTimeouts: false,
      bail: false,
      retries: 100,
   },
   // Solidity >=0.8.3 Compiler
   compilers: {
      solc: {
         version: '>=0.8.3',
         settings: {
            evmVersion: 'london',
         },
      },
   },
   // Moonbeam Truffle Plugin & Truffle Plugin for Verifying Smart Contracts
   plugins: ['moonbeam-truffle-plugin', 'truffle-plugin-verify'],
   api_keys: {
      moonscan: process.env.MOONSCAN_API_KEY,
      etherscan: process.env.ETHERSCAN_API_KEY,
   }
};

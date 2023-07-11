require('dotenv').config()
const { Web3 } = require('web3');
const BN = require('bn.js');

console.log('deploying...');
module.exports = async function (deployer) {
  let providerInstance;
  let web3;
  if (deployer.network == "moonbase") {
    console.log('deploy_contracts to Moonbase Alpha');

    const RandomNumber = artifacts.require("../build/contracts/RandomNumber");
    const Flipper = artifacts.require("../build/contracts/Flipper");
  
    providerInstance = new Web3.providers.WebsocketProvider(process.env.MOONBASE_BLASTAPI_ENDPOINT, {}, { delay: 500, autoReconnect: true, maxAttempts: 100 });
    console.log('providerInstance: ', providerInstance);
    
    web3 = new Web3(providerInstance);
    console.log('web3.currentProvider: ', web3.currentProvider);
    // must be at least 1 ether since it must be greater than `REQUEST_DEPOSIT_AMOUNT`
    deployer.deploy(RandomNumber, { value: web3.utils.toWei('1', 'ether') });
    deployer.deploy(Flipper, false);
  } else if (deployer.network == "sepolia") {
    console.log('deploy_contracts to Chainlink Sepolia');

    const VRFD20 = artifacts.require("../build/contracts/VRFD20");

    providerInstance = new Web3.providers.WebsocketProvider(process.env.CHAINLINK_SEPOLIA_ENDPOINT, {}, { delay: 500, autoReconnect: true, maxAttempts: 100 });
    console.log('providerInstance: ', providerInstance);
    web3 = new Web3(providerInstance);
    console.log('web3.currentProvider: ', web3.currentProvider);
    // **Important** It is necessary to add the deployed address as the
    // consumer address and fund the subscription id otherwise it will not
    // be possible to roll the dice and you will get error
    // `CALL_EXCEPTION Dice not rolled` or similar
    const subscriptionId = 3350; // https://vrf.chain.link/
    // wants 128620983229604640 wei
    const value = web3.utils.toWei('0.000001', 'ether');
    const amount = new BN(value, 10);
    deployer.deploy(VRFD20, subscriptionId, { value: amount });
  }
};

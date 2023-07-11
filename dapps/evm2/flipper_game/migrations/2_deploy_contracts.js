require('dotenv').config()
const { Web3 } = require('web3');
const BN = require('bn.js');

console.log('deploying...');
module.exports = async function (deployer) {
  let providerInstance;
  let web3;
  if (deployer.network == "moonbase") {
    console.log('deploy_contracts to Moonbase Alpha');

    const FlipperGameRandomNumber = artifacts.require("../build/contracts/FlipperGameRandomNumber");
    const FlipperGame = artifacts.require("../build/contracts/FlipperGame");
  
    providerInstance = new Web3.providers.WebsocketProvider(process.env.MOONBASE_BLASTAPI_ENDPOINT, {}, { delay: 500, autoReconnect: true, maxAttempts: 100 });
    console.log('providerInstance: ', providerInstance);

    web3 = new Web3(providerInstance);
    console.log('web3.currentProvider: ', web3.currentProvider);
    // TODO - the value of `REQUEST_DEPOSIT_AMOUNT` in Randomness.sol was reduced from 1 ether to 1 wei
    // for testing purposes to limit waste of testnet tokens but this should be restored in production
    //
    // must be at least 1 ether since it must be greater than `REQUEST_DEPOSIT_AMOUNT`
    // deployer.deploy(FlipperGameRandomNumber, { value: web3.utils.toWei('1', 'wei') })
    // // deployer.deploy(FlipperGameRandomNumber, { value: web3.utils.toWei('1', 'ether') })
    //   .then(function() {
    //     return deployer.deploy(FlipperGame, FlipperGameRandomNumber.address);
    //   }).then(function() { });

    deployer.deploy(FlipperGameRandomNumber, { value: web3.utils.toWei('1', 'ether') });
    deployer.deploy(FlipperGame);
  }
};

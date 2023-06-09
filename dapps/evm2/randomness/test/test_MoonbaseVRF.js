require('dotenv').config()
const { Web3 } = require('web3');
const BN = require('bn.js');

// Uses Mocha and Ganache
const Randomness = artifacts.require("../build/contracts/Randomness");
const RandomnessConsumer = artifacts.require("../build/contracts/RandomnessConsumer");
const RandomNumber = artifacts.require("../contracts/lib/RandomNumber");

console.log('test_MoonbaseVRF');

let providerInstance = new Web3.providers.WebsocketProvider(process.env.MOONBASE_BLASTAPI_ENDPOINT, {}, { delay: 500, autoReconnect: true, maxAttempts: 100 });
console.log('providerInstance: ', providerInstance);
let web3 = new Web3(providerInstance);
// when using BlastAPI WSS endpoint I get error `TypeError: Cannot create property 'gasLimit' on string"`
// https://github.com/web3/web3.js/issues/3573
console.log('web3.currentProvider: ', web3.currentProvider);
// Randomness.setProvider(providerInstance);
// RandomnessConsumer.setProvider(providerInstance);
// RandomNumber.setProvider(providerInstance);

// advanceBlock = () => {
//     return new Promise((resolve, reject) => {
//         web3.currentProvider.send({
//             jsonrpc: '2.0',
//             method: 'evm_mine',
//             id: new Date().getTime()
//         }, (err, result) => {
//             console.log('result: ', result);
//             console.log('err: ', err);
//             if (err) { return reject(err) }
//             const newBlockHash = web3.eth.getBlock('latest').hash;
//             console.log('newBlockHash: ', newBlockHash);

//             return resolve(newBlockHash);
//         })
//     })
// }

contract('RandomNumber', accounts => {
    console.log('accounts: ', accounts);
    let randomnessInstance;
    let randomNumberInstance;
    let fulfillmentFee;
    let refundAddress;
    let gas;
    let gasLimit;
    let gasPrice;
    let currentBlockNumber;
    let nextBlockNumber;
    // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L17C43-L17C62
    // https://docs.web3js.org/api/web3-utils/function/toWei
    const requiredDeposit = Web3.utils.toWei('1', 'ether');
    const blockTimeout = 1000000;
    const initValue = false;
    beforeEach(async () => {
        console.log('beforeEach');
        randomnessInstance = await Randomness.at("0x0000000000000000000000000000000000000809");
        // console.log('randomnessInstance.address:', randomnessInstance.address);

        // RandomnessConsumer.link(randomnessInstance);
        // RandomNumber.link(randomnessInstance);

        // gas = Web3.utils.toWei('1000000', 'wei');
        // gasLimit = Web3.utils.toWei('600000', 'wei');
        // gasPrice = Web3.utils.toWei('2000000', 'wei');
        // gas = Web3.utils.toHex(70000);
        // gasLimit = Web3.utils.toHex(600000); // gwei
        // gasPrice = Web3.utils.toHex(21000);
        
        // Create contract with 1 Ether (contract must be payable)
        randomNumberInstance = await RandomNumber.deployed(); //.new({ from: accounts[0], value: requiredDeposit });
        // randomNumberInstance = await RandomNumber.new(
        //     { from: accounts[0], value: requiredDeposit,
        //         gas: gas, gasLimit: gasLimit, gasPrice: gasPrice, syncWithContext: true }
        // );
        console.log('randomNumberInstance.address:', randomNumberInstance.address);

        // delay each test to simulate throttle that isn't available in truffle
        // setTimeout(function(){ done(); }, 5000);
    });

    it("requests randomness", async () => {
        try {
            fulfillmentFee = await randomNumberInstance.MIN_FEE.call();
            console.log('fulfillmentFee: ', fulfillmentFee.toString());
            console.log('fulfillmentFee is bn', BN.isBN(fulfillmentFee));
            console.log('accounts', accounts);

            // console.log('web3.currentProvider: ', web3.currentProvider);
            // do not use `.call` when doing state changes to blockchain
            // gas = Web3.utils.toWei('1000000', 'wei');
            // gasLimit = Web3.utils.toWei('600000', 'wei');
            // gasPrice = Web3.utils.toWei('2000000', 'wei');
            gas = Web3.utils.toHex(150000);
            gasLimit = Web3.utils.toHex(600000);
            gasPrice = Web3.utils.toHex(21000);
            let roller = '0x1dd907ABb024E17d196de0D7Fe8EB507b6cCaae7';
            refundAddress = await randomNumberInstance.requestRandomness(roller, { from: accounts[0], value: fulfillmentFee });
            // refundAddress = await randomNumberInstance.requestRandomness(
            //     {   
            //         from: accounts[0],
            //         value: fulfillmentFee,
            //         gas: gas, gasLimit: gasLimit, gasPrice: gasPrice, 
            //         syncWithContext: true
            //     }
            // );
            // console.log('refundAddress: ', refundAddress);
            
            const requestId = await randomNumberInstance.requestId.call();
            console.log('requestId: ', requestId);
            // Check status of request id from the randomness precompile
            // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L96
            const requestStatus = await randomNumberInstance.getRequestStatus.call();
            console.log('requestStatus: ', requestStatus.toString());

            // Wait for at least MIN_VRF_BLOCKS_DELAY but less than MAX_VRF_BLOCKS_DELAY
            // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L13
            // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L15
            const MIN_VRF_BLOCKS_DELAY = await randomNumberInstance.VRF_BLOCKS_DELAY.call();
            console.log('MIN_VRF_BLOCKS_DELAY: ', MIN_VRF_BLOCKS_DELAY);
            // let currentBlock = await web3.eth.getBlock("latest");
            currentBlockNumber = await web3.eth.getBlockNumber();
            console.log('currentBlockNumber: ', currentBlockNumber.toString());
            // remove 'n' character from end of blocknumber
            currentBlockNumber = currentBlockNumber.toString().replace(/[^0-9.]/g, '');
            let firstBlockNumber = currentBlockNumber;
            console.log('firstBlockNumber: ', firstBlockNumber);
            assert.equal(requestStatus, 1, 'should still be pending'); // where 1 in enum is 'PENDING'
            // evm_mine not defined, since can only do on Ganache not live testnet
            // for (i=0; i<MIN_VRF_BLOCKS_DELAY.length; i++) {
            //     advanceBlock();
            // }

            // TODO - not sure how to wait for next block number
            // while (firstBlockNumber != nextBlockNumber) {
                // TODO - wait for at least 2 blocks
                // setTimeout(async function(){
                //     console.log('setTimeout');
                //     return nextBlockNumber;
                // }, 20000);
                // nextBlockNumber = await web3.eth.getBlockNumber();
                // remove 'n' character from end of blocknumber
            //     nextBlockNumber = currentBlockNumber.toString().replace(/[^0-9.]/g, '');
            //     console.log('nextBlockNumber: ', nextBlockNumber);
            // }
            // console.log('found next block');

            // currentBlockNumber = await web3.eth.getBlockNumber();
            // // remove 'n' character from end of blocknumber
            // currentBlockNumber = currentBlockNumber.toString().replace(/[^0-9.]/g, '');
            // let secondBlockNumber = currentBlockNumber;
            // console.log('secondBlockNumber: ', secondBlockNumber);

            // assert.equal(parseNum(firstBlockNumber), parseNum(secondBlockNumber)+2, 'two blocks should have passed');
            // assert.equal(requestStatus, 2, 'not ready as expected'); // where 2 in enum is 'READY'

            // await randomNumberInstance.fulfillRequest.call();
            // const random = await randomNumberInstance.random.call();
            // console.log('random number: ', random[0]);
        } catch (e) {
            console.log('error in requests randomness: ', e);
        }
    });
});

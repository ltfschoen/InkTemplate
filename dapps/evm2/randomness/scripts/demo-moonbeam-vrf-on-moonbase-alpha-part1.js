require('dotenv').config({ path: './.env'})
// note: change the below to '../.env' if run from in the ./scripts directory
// otherwise get error `TypeError: Cannot read properties of undefined (reading 'toHexString')`
// since unable to load variables from .env file
const process = require('process');
const ethers = require('ethers');
const { Wallet } = require('ethers');
const BN = require('bn.js');
const assert = require('assert');


// https://docs.moonbeam.network/builders/build/eth-api/libraries/ethersjs/
// Note: ethers v6.6.2 not yet supported by Moonbase Alpha, use v5
// https://docs.ethers.org/v5/api/providers/#WebSocketProvider
// so use `ethers.providers.JsonRpcProvider` instead of
// `ethers.JsonRpcProvider`
// const providerRPCMoonbaseAlphaConfig = {
//   moonbase: {
//     name: 'moonbase-alpha',
//     rpc: 'https://rpc.api.moonbase.moonbeam.network',
//     chainId: 1287, // 0x507 in hex,
//   },
// };
// const providerMoonbaseAlphaRPC = new ethers.providers.JsonRpcProvider(
//     providerRPCMoonbaseAlphaConfig.moonbase.rpc, 
//     {
//         chainId: providerRPCMoonbaseAlphaConfig.moonbase.chainId,
//         name: providerRPCMoonbaseAlphaConfig.moonbase.name,
//     }
// );
// console.log('moonbase alpha provider RPC: ', providerMoonbaseAlphaRPC);

const providerMoonbaseAlphaWS = new ethers.providers.WebSocketProvider(
    // process.env.MOONBASE_BLASTAPI_ENDPOINT, // need auth for this endpoint
    "wss://moonbeam-alpha.api.onfinality.io/public-ws",
    {
        name: "moonbase-alphanet", // or "moonbase-alpha"
        chainId: 1287, // 0x507 in hex,
    },
);
console.log('moonbase alpha provider WS: ', providerMoonbaseAlphaWS);

// Signer
const signer = new Wallet(process.env.MOONBASE_PRIVATE_KEY, providerMoonbaseAlphaWS);
console.log('signer', signer);

const RandomNumberContractBuilt = require('../build/contracts/RandomNumber.json'); 

const main = async () => {
    let contractAddressArg = process.argv[2];

    // const contractAddressMoonbaseAlpha = '0x4027755C05514421fe00f4Fde0bD3F8475ce8A6b'; 
    // const contractAddressMoonbaseAlpha = '0x92108215DDB52e34837C5f8e744DBCf4BB994b99'; // uses babeVRF
    const contractAddressMoonbaseAlpha = contractAddressArg; // uses local VRF
    
    const randomNumberInstance = new ethers.Contract(
        contractAddressMoonbaseAlpha, RandomNumberContractBuilt.abi, signer);
    console.log('randomNumberInstance: ', randomNumberInstance);

    randomNumberInstance.on('DiceRolled', (res) => console.log('detected DiceRolled:', res));
    randomNumberInstance.on('DiceLanded', (res) => console.log('detected DiceLanded:', res));
    randomNumberInstance.on('DiceRollFulfilled', (res) => console.log('detected DiceRollFulfilled:', res));

    const fulfillmentFee = await randomNumberInstance.MIN_FEE.call();
    console.log('fulfillmentFee MIN_FEE is: ', fulfillmentFee.toString());
    console.log('fulfillmentFee is bn', BN.isBN(fulfillmentFee));

    console.log('x: ', ethers.utils.formatEther(fulfillmentFee));

    let roller = '0x1dd907ABb024E17d196de0D7Fe8EB507b6cCaae7';
    let res = await randomNumberInstance.requestRandomness(
        roller,
        {
            from: signer.address,
            gasLimit: 600000,
            maxPriorityFeePerGas: 2,
            value: fulfillmentFee
        }
    );
    console.log('res: ', await res);
    // debugging receipt
    console.log('res: ', await res.wait());
    
    const requestId = await randomNumberInstance.requestId.call();
    console.log('requestId: ', requestId.toString());

    // Wait for at least MIN_VRF_BLOCKS_DELAY but less than MAX_VRF_BLOCKS_DELAY
    // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L13
    // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L15
    const MIN_VRF_BLOCKS_DELAY = await randomNumberInstance.VRF_BLOCKS_DELAY.call();
    console.log('MIN_VRF_BLOCKS_DELAY: ', MIN_VRF_BLOCKS_DELAY);

    let currentBlockNumber = await providerMoonbaseAlphaWS.getBlockNumber();
    console.log('currentBlockNumber: ', currentBlockNumber.toString());

    // Check status of request id from the randomness precompile
    // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L96
    let requestStatus = await randomNumberInstance.getRequestStatus.call();
    console.log('requestStatus: ', requestStatus.toString());
    assert.equal(requestStatus, 1, 'should still be pending'); // where 1 in enum is 'PENDING'

    console.log('Please wait...');
    // Wait a few blocks before fulfilling the request
    // and calling the consumer contract method fulfillRandomWords
    await new Promise((resolve, reject) => setTimeout(resolve, 70000)); // 300k millisec is 5 mins
    
    console.log('Ready to proceed with fulfillRequest process...');

    // if using `requestRelayBabeEpochRandomWords` then the following applies:
    // "For BABE epoch randomness, you do not need to specify a delay but can
    // fulfill the request at the beginning of the 2nd epoch following the current one"
    // https://docs.moonbeam.network/builders/pallets-precompiles/precompiles/randomness/#:~:text=requestLocalVRFRandomWords
    // So if you use `requestRelayBabeEpochRandomWords` in RandomNumber.sol for babeEpoch randomness then the minimum wait
    // time is the 2nd epoch, which is about 1 hour in Kusama (Moonriver) and
    // 4 hours in Polkadot (Moonbeam), so you would have to wait that long after running
    // `requestRandomness` until the response of calling `getRequestStatus` would change
    // from `1` (Pending) to `2` (Ready) and you can then run `fulfillRequest` and
    // `random` to get the generated random number.
    // However, if you use `requestLocalVRFRandomWords` in RandomNumber.sol instead then
    // you only need to wait 1 minute or so.

    // Note: a separate file needs to be called to fulfill the request since further code in
    // this file does not run.  
}

function panic(error)
{
    console.error('error: ', error);
    process.exit(1);
}

// https://stackoverflow.com/a/57241059/3208553
// main().catch(panic).finally(clearInterval.bind(null, setInterval(a=>a, 1000000000)));
main().catch(panic);
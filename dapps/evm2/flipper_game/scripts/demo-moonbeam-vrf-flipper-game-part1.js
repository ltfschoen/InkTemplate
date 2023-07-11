require('dotenv').config({ path: './.env'})
// note: change the below to '../.env' if run from in the ./scripts directory
// otherwise get error `TypeError: Cannot read properties of undefined (reading 'toHexString')`
// since unable to load variables from .env file
const process = require('process');
const ethers = require('ethers');
const { Wallet } = require('ethers');
const BN = require('bn.js');
const assert = require('assert');

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

const FlipperGameContractBuilt = require('../build/contracts/FlipperGame.json');
const FlipperGameRandomNumberContractBuilt = require('../build/contracts/FlipperGameRandomNumber.json'); 

const main = async () => {
    let contractAddressFlipperGameMoonbaseAlphaArg = process.argv[2];
    let contractAddressFlipperGameRandomNumberMoonbaseAlphaArg = process.argv[3];

    // FlipperGame
    const contractAddressFlipperGameMoonbaseAlpha = contractAddressFlipperGameMoonbaseAlphaArg;
    const flipperGameInstance = new ethers.Contract(
        contractAddressFlipperGameMoonbaseAlpha, FlipperGameContractBuilt.abi, signer);
    console.log('flipperGameInstance: ', flipperGameInstance);

    // FlipperGameRandomNumber
    const contractAddressFlipperGameRandomNumberMoonbaseAlpha = contractAddressFlipperGameRandomNumberMoonbaseAlphaArg;
    const flipperGameRandomNumberInstance = new ethers.Contract(
        contractAddressFlipperGameRandomNumberMoonbaseAlpha, FlipperGameRandomNumberContractBuilt.abi, signer);
    console.log('flipperGameRandomNumberInstance: ', flipperGameRandomNumberInstance);

    await flipperGameRandomNumberInstance.setFlipperGameContractAddress(
        contractAddressFlipperGameMoonbaseAlphaArg.toString(),
        {
            from: signer.address,
            gasLimit: 600000,
            maxPriorityFeePerGas: 2
        }
    );

    // FIXME - why not returning correct address set instead of 0x00... address?
    await new Promise((resolve, reject) => setTimeout(resolve, 5000));
    const flipperGameContractAddress = await flipperGameRandomNumberInstance.flipperGameContractAddress.call();
    console.log('flipperGameContractAddress is: ', flipperGameContractAddress.toString());

    await flipperGameInstance.setFlipperGameRandomNumberContractAddress(
        contractAddressFlipperGameRandomNumberMoonbaseAlphaArg,
        {
            from: signer.address,
            gasLimit: 600000,
            maxPriorityFeePerGas: 2
        }
    );

    // FIXME - why not returning correct address set instead of 0x00... address?
    await new Promise((resolve, reject) => setTimeout(resolve, 5000));
    const flipperGameRandomNumberContractAddress = await flipperGameInstance.flipperGameRandomNumberContractAddress.call();
    console.log('flipperGameRandomNumberContractAddress is: ', flipperGameRandomNumberContractAddress.toString());

    let guessValue = new BN(10, 10);
    console.log('guessValue: ', guessValue.toString(10));
    let gameId = await flipperGameInstance.createGame(
        guessValue.toString(10),
        {
            from: signer.address,
            gasLimit: 600000,
            maxPriorityFeePerGas: 2,
        }
    );
    console.log('createGame finished with gameId: ', await gameId);
    console.log('createGame finished with gameId2: ', await gameId.wait());

    guessValue = new BN(15, 10);
    await flipperGameInstance.addPlayerToGame(
        gameId,
        guessValue,
        {
            from: signer.address,
            gasLimit: 600000,
            maxPriorityFeePerGas: 2,
        }
    );
    console.log('addPlayerToGame finished');

    // guessValue = new BN(17, 10);
    // guessValue = await flipperGameInstance.addGuessForPlayerOfGame(
    //     gameId,
    //     guessValue,
    //     {
    //         from: signer.address,
    //         gasLimit: 600000,
    //         maxPriorityFeePerGas: 2,
    //     }
    // );
    // console.log('addGuessForPlayerOfGame finished with guess value: ', guessValue);

    // const fulfillmentFee = await flipperGameRandomNumberInstance.MIN_FEE.call();
    // console.log('fulfillmentFee MIN_FEE is: ', fulfillmentFee.toString());
    // console.log('fulfillmentFee is bn', BN.isBN(fulfillmentFee));

    // console.log('x: ', ethers.utils.formatEther(fulfillmentFee));

    // let res = await flipperGameInstance.requestRandomessAnswerOfGame(
    //     gameId,
    //     {
    //         from: signer.address,
    //         gasLimit: 600000,
    //         maxPriorityFeePerGas: 2,
    //         value: fulfillmentFee
    //     }
    // );
    // console.log('res: ', await res);
    // // debugging receipt
    // console.log('res: ', await res.wait());
    
    // const requestId = await flipperGameRandomNumberInstance.requestId.call();
    // console.log('requestId: ', requestId.toString());

    // // Wait for at least MIN_VRF_BLOCKS_DELAY but less than MAX_VRF_BLOCKS_DELAY
    // const MIN_VRF_BLOCKS_DELAY = await flipperGameRandomNumberInstance.VRF_BLOCKS_DELAY.call();
    // console.log('MIN_VRF_BLOCKS_DELAY: ', MIN_VRF_BLOCKS_DELAY);

    // let currentBlockNumber = await providerMoonbaseAlphaWS.getBlockNumber();
    // console.log('currentBlockNumber: ', currentBlockNumber.toString());

    // // Check status of request id from the randomness precompile
    // // https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol#L96
    // let requestStatus = await randomNumberInstance.getRequestStatus.call();
    // console.log('requestStatus: ', requestStatus.toString());
    // assert.equal(requestStatus, 1, 'should still be pending'); // where 1 in enum is 'PENDING'

    // console.log('Please wait...');
    // // Wait a few blocks before fulfilling the request
    // // and calling the consumer contract method fulfillRandomWords
    // await new Promise((resolve, reject) => setTimeout(resolve, 70000));
    
    // console.log('Ready to proceed with fulfillRequest process...');
}

function panic(error)
{
    console.error('error: ', error);
    process.exit(1);
}

main().catch(panic);
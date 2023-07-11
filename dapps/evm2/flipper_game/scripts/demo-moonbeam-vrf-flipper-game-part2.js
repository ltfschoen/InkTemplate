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
    let gameId = process.argv[4];

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

    const requestId = await flipperGameRandomNumberInstance.requestId.call();
    console.log('requestId: ', requestId.toString());

    let currentBlockNumber = await providerMoonbaseAlphaWS.getBlockNumber();
    console.log('currentBlockNumber: ', currentBlockNumber.toString());

    let requestStatus = await flipperGameRandomNumberInstance.getRequestStatus.call();
    console.log('requestStatus: ', requestStatus.toString());
    assert.equal(requestStatus, 2, 'should be ready status after waiting a minute using local vrf'); // where 2 in enum is 'READY'    

    // Error: insufficient funds for gas * price + value
    let fulfilled = await flipperGameInstance.requestFulfillAnswerOfGame(
        gameId,
        {
            from: signer.address,
            gasLimit: 600000,
            // gasPrice: 600000,
            maxPriorityFeePerGas: 2,
        }
    );
    console.log('Fulfilled. Please wait a few blocks until the random number is ready...');

    // Wait at least a few of blocks for it to be fulfilled
    await new Promise((resolve, reject) => setTimeout(resolve, 40000));

    currentBlockNumber = await providerMoonbaseAlphaWS.getBlockNumber();
    console.log('currentBlockNumber: ', currentBlockNumber.toString());

    requestStatus = await flipperGameRandomNumberInstance.getRequestStatus.call();
    console.log('requestStatus: ', requestStatus.toString());

    const randomUsingModulus = await flipperGameInstance.functions.fetchAndAddAnswerToGame(gameId);
    console.log('randomUsingModulus: ', randomUsingModulus.toString());
}

function panic(error)
{
    console.error('error: ', error);
    process.exit(1);
}

main().catch(panic);
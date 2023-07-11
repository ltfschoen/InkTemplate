# Randomness

Note: The following was based upon Moonbeam Truffle Box https://docs.moonbeam.network/builders/build/eth-api/dev-env/truffle/

## Getting started

* Install Node.js v18.x (i.e. v18.16.0) since has LTS https://nodejs.org/en/download/releases
* Use an LTS version of NPM to avoid error `This version of µWS is not compatible with your Node.js build` https://stackoverflow.com/questions/71081725/this-version-of-%C2%B5ws-is-not-compatible-with-your-node-js-build-error-node-loade

```bash
apt-get remove -y nodejs
rm -rf /usr/lib/node_modules/
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | tee /usr/share/keyrings/yarnkey.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | tee /etc/apt/sources.list.d/yarn.list
apt-get update && apt-get install yarn
npm config rm proxy
npm config rm https-proxy
```
* Install Truffle dependency:
```bash
npm install -g truffle
```
* Check if works
```bash
truffle --version
```
* Fix permissions error since /usr/bin/truffle symlinks to below but below didn't have execute permissions for any users
```bash
chmod 755 /usr/lib/node_modules/truffle/build/cli.bundled.js
```
* Setup Moonbeam Truffle Box template that this has been based upon
```bash
mkdir -p /app/dapps/evm2/randomness
DAPP_PATH=/app/dapps/evm2/randomness 
git clone https://github.com/PureStake/moonbeam-truffle-box $DAPP_PATH
cd $DAPP_PATH
```bash
* Replace template contracts with just https://github.com/hyperledger/solang/blob/main/examples/substrate/flipper.sol and add `pragma solidity ^0.8.0;`

* Update all dependencies in package.json to new major version
```bash
npm outdated
npm install -g npm-check-updates
ncu -u
npm update
```
* Install dependencies
```bash
npm install
```

* Install Docker in Docker container
```bash
apt-get remove docker docker-engine docker.io containerd runc
apt-get update && apt-get upgrade -y
apt-get install apt-transport-https ca-certificates curl gnupg-agent software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
apt-key fingerprint 0EBFCD88
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install docker-ce docker-ce-cli containerd.io -y
adduser user
usermod -aG docker user
systemctl restart docker
systemctl enable docker
apt-get install -y docker-compose-plugin
apt-get install docker-compose
```

Note: It is necessary to run Docker within a Docker container https://devopscube.com/run-docker-in-docker/ in order to use `truffle run moonbeam ...` commands from https://trufflesuite.com/boxes/moonbeam-truffle-box/, which use the Moonbeam Truffle Box plugin https://github.com/PureStake/moonbeam-truffle-plugin, which uses images from Docker hub https://hub.docker.com/r/purestake/moonbeam/tags, or setup manually by following https://docs.moonbeam.network/node-operators/networks/run-a-node/flags/, as follows:

To run a local node run similar to the following:
```bash
mkdir /opt/moonbeam
git clone https://github.com/PureStake/moonbeam /opt/moonbeam
cd /opt/moonbeam
git checkout tags/$(git describe --tags)
cargo build
./target/debug/moonbeam --help
```

Then configure Truffle to connect to it Moonbeam Development `node_modules/.bin/truffle migrate --network dev`. Note that use of Ganache does not include pre-compiles https://docs.moonbeam.network/builders/build/eth-api/dev-env/truffle/.

Preferably use Moonbase Alpha TestNet `node_modules/.bin/truffle migrate --network moonbase` that requires testnet tokens from the faucet https://faucet.moonbeam.network/.

Note: When running tests against Moonbase Alpha TestNet. Disconnect VPN. Try to avoid encountering errors like `Too Many Requests`, `ProviderError`, `ETIMEDOUT`, `32603`, it is important to use a dedicated endpoint that you can get for free here https://blastapi.io/ by creating an account, creating a project, choosing Moonbase Alpha Testnet from their available endpoints and clicking "Activate", and then copying either the RPC endpoint. 
Note: I got error `TypeError: Cannot create property 'gasLimit' on string '0x464aff'` when tried using Blastapi WSS endpoint instead of RPC (https) endpoint. Note: If you change to WSS then you need to use `WebsocketProvider` instead of `HttpProvider`. Solved this error by using `gasLimit` in truffle-config.js (it was not necessary for HTTPS)

This is important because the public endpoint https://rpc.api.moonbase.moonbeam.network has stricter rate limiting. Ensure that you replace the public Moonbase Alpha endpoint in the truffle-config.js file with the dedicated endpoint.

Run tests
```
truffle test
```

* Generate account with Moonkey https://docs.moonbeam.network/node-operators/networks/collators/requirements/#generating-an-account-with-moonkey
```
cd /opt
wget https://github.com/PureStake/moonbeam/releases/download/v0.8.0/moonkey /opt
shasum -a 256 moonkey
```
* Verify output is `019c3de832ded3fccffae950835bb455482fca92714448cc0086a7c5f3d48d3e`
* Generate account `./moonkey --w12`
* Obtain Moonbase Alpha tokens from faucet
    * https://faucet.moonbeam.network/

* Compile contracts on network of choice (i.e. "moonbase") defined in truffle.js
    * Compile full `truffle compile --compile-all`
* Migrate
    * Migrate full `truffle migrate --reset --compile-all --network moonbase`
    * Migrate full `truffle migrate --reset --compile-all --network sepolia`
* Test
    * `truffle test ./test/test_MoonbaseVRF.js --verbose-rpc --network moonbase`
    * `truffle test ./test/test_ChainlinkVRF.js --network sepolia`
* Verify Contract - Moonbase Precompile
    * Note: To view the source code on etherscan.io, it is also necessary to Verify and Publish the source code for that too by adding your Etherscan API key to the .env file under `ETHERSCAN_API_KEY`

```
# truffle run verify Flipper --network moonbase
Verifying contracts on moonscan
   Verifying Flipper
   Pass - Verified: https://moonbase.moonscan.io/address/0x1c440D264DcCBe9b7AC84edCEC99De926Db98753#code
   Successfully verified 1 contract(s).
Verifying contracts on sourcify
   Failed to connect to Sourcify API at url https://sourcify.dev/server/chains
truffle run verify RandomNumber --network moonbase
root@ink:/app/dapps/evm2/randomness# truffle run verify RandomNumber --network moonbase
Verifying contracts on moonscan
   Verifying RandomNumber
   Pass - Verified: https://moonbase.moonscan.io/address/0x4027755C05514421fe00f4Fde0bD3F8475ce8A6b#code
   Successfully verified 1 contract(s).
Verifying contracts on sourcify
   Failed to connect to Sourcify API at url https://sourcify.dev/server/chains
```

* Verify Contract - Chainlink VRF
    * Note: To view the source code on etherscan.io, it is also necessary to Verify and Publish the source code for that too by adding your Etherscan API key to the .env file under `ETHERSCAN_API_KEY`

```
# cd flipper
# truffle run verify VRFD20 --network sepolia

Verifying contracts on etherscan
   No etherscan or sepolia_etherscan API Key provided
Verifying contracts on sourcify
   Verifying VRFD20
   Pass - Verified: https://sourcify.dev/#/lookup/0xe22cdfA9d8C8e942B498696ef54584426d2f5Dd6
   Successfully verified 1 contract(s).
```

* Chainlink VRF https://docs.chain.link/getting-started/intermediates-tutorial
    * View token balance https://sepolia.etherscan.io/address/0x1dd907abb024e17d196de0d7fe8eb507b6ccaae7
    * Create and fund a subscription https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number/#create-and-fund-a-subscription
        * Go to https://vrf.chain.link/sepolia/new.
            * **Important** Must be in a private browser tab to clear cache
        * https://vrf.chain.link/sepolia/3350
            * After clicking "Add Consume" and adding a consumer address in this [tx](https://sepolia.etherscan.io/tx/0x4bfc7fe73fd20f524daf07875502f2d1e7d65032c71a0fe736d3a8ddc6cb388f) it said `Important: Your consumer contract must use the Subscription ID 3350 in the VRF request to make use of these funds.`
        * Go to https://vrf.chain.link/sepolia/3350, click "Actions" > "Fund Subscription" to prepay subscription. [tx](https://sepolia.etherscan.io/tx/0xf2a34026f513c29f6e8a12f5b6ac7d7bae2adc619e09dcc6b011c1a6c4f89350), relates to contract deployed to 0x9912FEa426655B1d723ADFFa5dbD915C78198c49 with that subscription id 3350

        * NOTE:
            * I had already created a subscription id https://vrf.chain.link/sepolia/3217 to deploy through migrations file but had not added the consumer contract of it deployed, which i later did at https://sepolia.etherscan.io/tx/0xc689e64aca1c531fab582bbbbd86e835bb465c227d6068e001f1692f30eab3f6, and funded it in this tx https://sepolia.etherscan.io/tx/0x23e4464e74fbfb30dfd3a65042e86f37d915e143b63105f5391bcd23d45d93f6, so this is the one to use since that's the subscription id passed to the constructor when deployed
    * Fix
        * After being unsuccessful in trying to generate a random number with subscription id 3217 and 3350, I got help in #vrf room of Chainlink on Discord from Lucas Archangelo who suggested to use the existing subscription id and redeploy and add the new contract address as the consumer. So I deployed VRFD20 to 0xE265f9a30c72A78C4b89Fc2e2C60e9327704Fa5e that has tx hash https://dashboard.tenderly.co/tx/sepolia/0x0122f8b4efb1f66dea8482edf7d4e9089946cd13a60559504a4dc63fdd0a727b?trace=0.0, so then i went to https://vrf.chain.link/sepolia/3350, and added new consumer address 0xE265f9a30c72A78C4b89Fc2e2C60e9327704Fa5e in this tx 0x397c8aedab55e475d27b87de8d63cc1f866b007698f94cea49ab2ae75f016104, then i imported all the contracts into Remix to access that contract and verified that i was interacting with that new contract. then made transaction rollDice passing my account address 0x1dd907abb024e17d196de0d7fe8eb507b6ccaae7 as a parameter in this tx https://sepolia.etherscan.io/tx/0x558a0567c5c71ec378e6919d75d8cd02b60e97c6c87205f77f5146233a58affa, then finally in Remix i called getRolledValueForPlayer passing my account address 0x1dd907abb024e17d196de0d7fe8eb507b6ccaae7 as a parameter, and that output the following in Remix 0: uint256: 8, so it successfully generated the random number 8. I also modified ./scripts/demo-chainlink-vrf-on-ethereum-sepolia.js to load that new address and to not run rollDice since we'd already done that, and it also returned `8`.

* Run
    * node ./scripts/demo-chainlink-vrf-on-ethereum-sepolia.js

* Chainlink VRF https://docs.chain.link/getting-started/intermediates-tutorial
    * View token balance https://sepolia.etherscan.io/address/0x1dd907abb024e17d196de0d7fe8eb507b6ccaae7
    * Create and fund a subscription https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number/#create-and-fund-a-subscription
    * Prepay Subscription https://vrf.chain.link/
        * Receipt https://sepolia.etherscan.io/tx/0xcc2cd9edf90e0f3351f3398b7013a7259c0acc7cfbfc38454192324fcfdb7d6a
    * Reference v2 contract (not implemented): https://remix.ethereum.org/#url=https://docs.chain.link/samples/VRF/VRFv2Consumer.sol&lang=en&optimize=false&runs=200&evmVersion=null&version=soljson-v0.8.18+commit.87f61d96.js

* TODO 
    * allowing the owner of the VRFD20 contract to specify what block number the roll the dice relates to, since the block number will represent the start of each game
    * allowing a random number to be rolled by a roller account calling rollDice multiple times each time there is a new game set by the owner of the VRFD20

* Debugging
    * Details of each tx https://dashboard.tenderly.co/tx/sepolia/0x????
* Troubleshooting
    * `Client network socket disconnected before secure TLS connection was established`
        * Try fixing by running `unset https_proxy && unset http_proxy`, but this didn't actually work for me
    * If you get error `PollingBlockTracker` then try connecting to a different ISP and disable VPN and stop using a proxy and restart access to your internet
    * Sometimes when you run `truffle test --network moonbase` after changing some CLI options it outputs `Error: The network id specified in the truffle config (1287) does not match the one returned by the network (4619453).  Ensure that both the network and the provider are properly configured`, even though the network id in the truffle-config.js is in fact 1287 (for some reason it confuses the block number for the network id), but when you run it again it might works. So just keep running the command again until it. Or run `truffle test --network sepolia` instead of 
    `truffle test --verbose-rpc --network sepolia`
    works or change internet connection.
* References
    * Hackathon submission
        * https://moonbeam.hackerearth.com/challenges/hackathon/moonbeam-hackathon-2/dashboard
    * https://github.com/trufflesuite/truffle/blob/develop/packages/contract/README.md
    * https://docs.web3js.org/
    * https://evmdocs.acala.network/tutorials/hardhat-tutorials/precompiledtoken-tutorial
    * Chainlink
        * https://vrf.chain.link/
        * VRF https://docs.chain.link/getting-started/intermediates-tutorial
        * Faucet https://faucets.chain.link/
        * https://docs.chain.link/getting-started/advanced-tutorial
        * https://docs.chain.link/vrf/v2/subscription/supported-networks/#configurations
        * https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number/#create-and-fund-a-subscription
    * Alchemy 
        * https://dashboard.alchemy.com/apps
        * https://docs.alchemy.com/reference/api-overview
        * https://github.com/alchemyplatform/alchemy-sdk-js
        * https://docs.alchemy.com/docs/smart-contract-basics
        * https://docs.alchemy.com/docs/ethers-js-provider
        * https://docs.alchemy.com/docs/interacting-with-a-smart-contract
    * Ethers
        * v5 https://docs.ethers.org/v5/api/utils/hdnode/
        * v6 https://docs.ethers.org/v6/api/providers/#WebSocketProvider
    * XCM 
        * https://docs.moonbeam.network/builders/interoperability/xcm/overview/
        * https://github.com/AstarNetwork/ink-xvm-sdk/tree/main
        * https://moonbeam.network/builders/connected-contracts/
        * https://moonbeam.network/blog/cross-chain-smart-contracts/
        * https://docs.moonbeam.network/tutorials/interoperability/cross-chain-dao/
        * https://moonbeam.network/blog/connected-contracts-with-hyperlane/
        * https://moonbeam.network/blog/connected-contracts-axelar/
        * https://moonbeam.network/blog/connected-contracts-wormhole/
        * https://moonbeam.network/blog/connected-contracts-layerzero/
    * Polkadot.js
        * https://docs.moonbeam.network/builders/build/substrate-api/polkadot-js-api/

    * Other
        * https://github.com/HCastano/urban-planning-in-the-paraverse-with-ink
        * https://www.rob.tech/blog/hybrid-chains/

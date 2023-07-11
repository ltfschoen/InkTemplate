### Smart Contracts using XCM

## Table of Contents

* [Setup](#setup)
	* [Setup Docker Container](#setup-container)
	* [Run Cargo Contracts Node in Docker Container](#run-cargo-contracts-node)
* Build & Upload
	* [**Quickstart** Build & Upload "Flipper" ink! Rust Smart Contract to Local Testnet (using Cargo Contract)](#quick-build-upload)
	* [**Quickstart** Build & Upload "Basic Contract Caller" ink! Rust Smart Contract to Local Testnet (using Cargo Contract)](#quick-basic-contract-caller)
	* [**Quickstart** Build & Upload "IPSP22" ink! Rust Smart Contract to Local Testnet (using Cargo Contract)](#quick-ipsp22)
	* [**Quickstart** Build & Upload "Unnamed" ink! Rust Smart Contract to Local Testnet (using Cargo Contract)](#quick-unnamed)
	* [Build & Upload Moonbeam VRF Randomness Precompile **Flipper Game** Solidity Smart Contract to Moonbase Alpha Testnet (using Truffle)](#moonbase-vrf-flipper-game)
	* [Build & Upload Moonbeam VRF Randomness Precompile Solidity Smart Contract to Moonbase Alpha Testnet (using Truffle)](#moonbase-vrf)
	* [Build & Upload Chainlink VRFD20 Randomness Solidity Smart Contract to Ethereum Sepolia Testnet (using Truffle)](#vrfd20)
	* [Build & Upload "Flipper" ink! Rust Smart Contract to Local Testnet (using Cargo Contract)](#build-upload)
	* [Build & Upload "Flipper" ink! Rust Smart Contract to Local Testnet (using Swanky CLI)](#build-upload-swanky)
* Interact
	* [Interact with ink! Python Smart Contract](#interact-python)
	* [Interact with ink! Rust Flipper Smart Contract using Polkadot.js API](#interact-polkadot-js-flipper)
	* [Interact with ink! Rust Flipper Smart Contract using Substrate Contracts Node](#interact-substrate-contracts-node-flipper)
* Tips
	* [Tips Docker Commands](#tips-docker)
	* [Tips Notes](#tips-notes)
	* [Tips Links](#tips-links)

## Setup <a id="setup"></a>

### Setup Docker Container <a id="setup-container"></a>

* Note:
	* The docker/Dockerfile and its dependencies in docker/utility are modified copies of files in https://github.com/paritytech/scripts/blob/master/dockerfiles to have the flexibility to develop locally using ink! in a Docker container that uses Linux without any dependency issues, and where changes replicated on the host machine.
	* This is useful if you're on an old macOS Catalina and Apple won't allow you to do further software updates, so you cannot install `brew install protobuf` to install necessary dependencies.

* Install and run [Docker](https://www.docker.com/)
* Generate .env file from sample file
	* Generate a Substrate-based account on an air-gapped machine using [Subkey](https://support.polkadot.network/support/solutions/articles/65000180519-how-to-create-an-account-in-subkey) or by installing [Subkey in Docker](https://github.com/paritytech/substrate/tree/master/docker) on an air-gapped machine
	* Add the mnemonic phrase of the Substrate-based account to the value of `LS_CONTRACTS` in the .env file.
	* Obtain testnet tokens from faucet at https://use.ink/faucet/
* Check versions used in Dockerfile:
	* Rust nightly version
	* Node.js version
	* Cargo Contract
	* Substrate Contracts Node
* Configure amount of CPUs and memory of the host machine the Docker container should use in ./docker/docker.sh. Use `docker update` to change the configuration https://docs.docker.com/engine/reference/commandline/container_update/
* Update dependencies in ./dapps/ink-rust/wasm-flipper/package.json https://stackoverflow.com/a/70588930/3208553
	```
	cd ./dapps/ink-rust/wasm-flipper/
	yarn upgrade
	```
* Update dependencies in ./dapps/ink-rust/wasm-flipper/contract/flipper/Cargo.toml
	```
	cd ./dapps/ink-rust/wasm-flipper/contract/flipper/
	cargo update
	```
* Run Docker container and follow the terminal log instructions.
	* Note: Optionally **exclude** installing substrate-contracts-node by running `time ./docker/docker.sh "without_node"` since including it will increase build time substantially and may not be necessary if you are deploying to remote testnets

	```bash
	touch .env && cp .env.example .env
	time ./docker/docker.sh
	```

* Check Memory & CPU usage. Update memory limits in docker-compose.yml
	```bash
	docker stats
	```
* Enter Docker container
	```bash
	docker exec -it ink /bin/bash
	```
* Optional [Attach to Container in Visual Studio Code (VSCode)](https://code.visualstudio.com/docs/devcontainers/attach-container#_attach-to-a-docker-container)
	* Open folder /app with `cd /app`

* Check versions. Note: 
```bash
rustup toolchain list
rustup update
rustup show
cargo-contract --version
```
* Check if substrate-contracts-node was installed if you used the "with-node" argument
```bash
substrate-contracts-node --version
```

### Run Cargo Contracts Node in Docker Container <a id="run-cargo-contracts-node"></a>

* **Important** This is only available if you did not run ./docker/run.sh using "without_node" argument

#### Run Node

* Run Cargo Contract Node 
	* Note: Use either `--tmp` or `--base-path "/tmp/ink"`
	* Note: Delete chain database `rm -rf /tmp/ink`.
	* Note: Check disk space used by database `du /tmp/ink`
* Note: Refer to debugging docs https://use.ink/basics/contract-debugging

```bash
./docker/run-scn.sh
```

* Leave that terminal tab running the node. Enter the terminal again in a new tab with `docker exec -it ink /bin/bash`
* Attach to the running terminal with VSCode if necessary. See [here](https://code.visualstudio.com/docs/devcontainers/attach-container)

* Restart the node and delete the chain database by running `./docker/reset.sh` inside the Docker container or `docker exec -it ink /app/docker/reset.sh` from outside the Docker container and waiting 15 seconds

#### Interact with Node

* Verify that you are able to connect from websites like:
	* https://contracts-ui.substrate.io/?rpc=ws://127.0.0.1:9944, and;
	* https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944
* Note: It is necessary to use `--unsafe-rpc-external` and `--unsafe-ws-external` instead of just `--rpc-external` and `--ws-external`, otherwise you will get an error `API-WS: disconnected from ws://127.0.0.1:9944: 1006:: Abnormal Closure` if you try to connect to the local node at https://contracts-ui.substrate.io/?rpc=ws://127.0.0.1:9944
* Note: It is also necessary if using the Brave browser to **disable Advertisement blocker shields** to avoid that error as mentioned in my response here https://substrate.stackexchange.com/a/8648/83

### **Demo Quickstart** Build & Upload ink! Rust Flipper Smart Contract to Local Testnet (using Cargo Contract) <a id="quick-build-upload"></a>

#### Option 1: Run from host machine

```bash
SCN_PORT=$(docker exec -it ink lsof -ti:30333) && \
docker exec -it ink echo $(kill -9 $SCN_PORT) && \
docker exec -it ink /app/docker/reset.sh && \
docker exec -it ink /app/docker/quickstart.sh
```

#### Option 2: Run from shell inside Docker container

	* Enter shell of Docker container
		```bash
		docker exec -it ink /bin/bash
		```
	* Run quickstart
		```bash
		./docker/reset.sh
		./docker/quickstart.sh
		```

* Note: This may be run repeatedly since it automatically:
	* Kills any existing substrate-contracts-node on port 30333
	* Empties the chain database with `rm -rf /tmp/ink` so we can redeploy the Flipper contract to the same address
	* Run substrate-contracts-node again
	* Redeploys the Flipper contract
	* Interacts with the Flipper contract

### **Demo Quickstart** Build & Upload ink! Rust "Basic Contract Caller" Smart Contract to Local Testnet (using Cargo Contract) <a id="quick-basic-contract-caller"></a>

#### Run from shell inside Docker container

	* Enter shell of Docker container
		```bash
		docker exec -it ink /bin/bash
		```
	* Run in terminal tab 1
		```bash
		./docker/reset.sh
		```
	* Run in terminal tab 2
		```
		./docker/quickstart-basic-contract-caller.sh
		```

### **Demo Quickstart** Build & Upload ink! Rust "IPSP22" Smart Contract to Local Testnet (using Cargo Contract) <a id="quick-ipsp22"></a>

#### Run from shell inside Docker container

	* Enter shell of Docker container
		```bash
		docker exec -it ink /bin/bash
		```
	* Run in terminal tab 1
		```bash
		./docker/reset.sh
		```
	* Run in terminal tab 2
		```bash
		cd /app
		./docker/quickstart-ipsp22.sh
		```

### **Demo Quickstart** Build & Upload ink! Rust "Unnamed" Smart Contract to Local Testnet (using Cargo Contract) <a id="quick-unnamed"></a>

#### Run from shell inside Docker container

	* Enter shell of Docker container
		```bash
		docker exec -it ink /bin/bash
		```
	* Run in terminal tab 1
		```bash
		./docker/reset.sh
		```
	* Run in terminal tab 2
		````
		./docker/quickstart-unnamed.sh
		```

### Build & Upload Moonbeam VRF Randomness Precompile **Flipper Game** Solidity Smart Contract to Moonbase Alpha Testnet (using Truffle) <a id="moonbase-vrf-flipper-game"></a>

* Follow the instructions in the [VRF example README](./dapps/evm2/flipper_game/README.md) and install necessary dependencies then run the following from this directory

```bash
nvm use v16.18.1
./docker/quickstart-moonbeam-vrf-precompile-flipper-game.sh
```

### Build & Upload Moonbeam VRF Randomness Precompile Solidity Smart Contract to Moonbase Alpha Testnet (using Truffle) <a id="moonbase-vrf"></a>

* Follow the instructions in the [VRF example README](./dapps/evm2/randomness/README.md) and install necessary dependencies then run the following from this directory

```bash
./docker/quickstart-moonbeam-vrf-precompile.sh
```

### Build & Upload Chainlink VRFD20 Randomness Solidity Smart Contract to Ethereum Sepolia Testnet (using Truffle) <a id="vrfd20"></a>

* Follow the instructions in the [VRF20 example README](./dapps/evm2/randomness/README.md)

### Build & Upload ink! Rust Flipper Smart Contract to Local Testnet (using Cargo Contract) <a id="build-upload"></a>

* Create Rust project with template
```
cd dapps/ink-rust/wasm-flipper/contract
cargo contract new flipper
cd flipper
```
* Optionally build with VSCode by adding the project `"dapps/ink-rust/wasm-flipper/contract/flipper"` to the list of members in the Cargo.toml file in the project root, and running "Terminal > Run Task > Build Contract" to build all the contract using the configuration in ./.vscode/launch.json
* Generate .contract, .wasm, and metadata.json code. Note: Use `--release` to deploy in "release" mode (without debug logs) instead of "debug" mode
	* Note: If you get error `ERROR: Cannot read /app/target/ink/flipper/.target` then run `rm -rf /app/target`

	```bash
	cargo contract build --manifest-path /app/dapps/ink-rust/wasm-flipper/contract/flipper/Cargo.toml
	```
* Copy ./target/ink/flipper/flipper.json
	* Paste this as the ABI value of `const abi = ` ./dapps/ink-rust/wasm-flipper/ui/components/abi.ts
	* Note: Refer to ./docker/quickstart.sh that shows how to do this programmatically

* Upload Contract (note: prefer to use contracts-ui to avoid exposing private key)
```bash
cargo contract upload --suri //Alice
```

* Actual output:

	* Terminal #1
		```
		Result Success!
		Code hash "0xec3a66a8f99674ecf25d180fc39ee8e620d45e8de459277e353ece20753d6c53"
			Deposit 434925000000
		Your upload call has not been executed.
		To submit the transaction and execute the call on chain, add -x/--execute flag to the command
		```

	* Terminal #2
		```
		2023-05-11 05:49:47.389  INFO tokio-runtime-worker substrate: 💤 Idle (0 peers), best: #0 (0x18c5…59af), finalized #0 (0x18c5…59af), ⬇ 0 ⬆ 0    
		2023-05-11 05:49:48.124 DEBUG tokio-runtime-worker sync: Propagating transactions    
		2023-05-11 05:49:48.437  INFO tokio-runtime-worker jsonrpsee_ws_server::server: Accepting new connection 1/100
		```

* Upload and Execute it. Optionally `--skip-dry-run`
```
cargo contract upload --suri //Alice \
	--execute \
	--skip-confirm
```

* Copy the "Code hash" that is output since you can query the contract by pasting it at https://contracts-ui.substrate.io/hash-lookup?rpc=ws://127.0.0.1:9944 and pasting its ABI as the Metadata using the contents of ./target/ink/flipper/flipper.json

* Note: The output format should be:
	```
	CodeStored event
	code_hash: 0x......
	```
  * Note: only one copy of the code is stored, but there can be many instance of one code blob, differs from other EVM chains where each node has a copy

* Actual output:

	* Terminal #1
		```
		Events
			...

		Code hash "0xec3a66a8f99674ecf25d180fc39ee8e620d45e8de459277e353ece20753d6c53"
		```

	* Terminal #2
		```

		2023-05-11 05:56:14.102  INFO tokio-runtime-worker substrate: ✨ Imported #1 (0x9bc4…be22)    
		2023-05-11 05:56:14.699 DEBUG tokio-runtime-worker sync: Propagating transactions    
		2023-05-11 05:56:15.591  INFO tokio-runtime-worker substrate: 💤 Idle (0 peers), best: #1 (0x9bc4…be22), finalized #0 (0x18c5…59af), ⬇ 0 ⬆ 0
		```

### Build & Upload ink! Rust Flipper Smart Contract to Local Testnet (using Swanky CLI) <a id="build-upload-swanky"></a>

Install Swanky CLI https://github.com/AstarNetwork/swanky-cli
```bash
cd dapps/ink-rust/wasm-flipper
nvm use
yarn global add @astar-network/swanky-cli@2.1.2
```

0. Init

```bash
cd contract
swanky init flipper
```
Note: Choose `ink` as a contract language and `flipper` as template and a chosen contract name.
Optionally choose from `Y/N` when asking to download the Swanky Node (NOT required if already using Substrate Contracts Node).

1. Start the local node

If you chose to download the Swanky Node then run it in your local environment:
```bash
cd flipper
swanky node start
```

2. Build the contract

Build the contract in a new tab
```bash
swanky contract compile flipper
```
Note: Try `rustup update` if you face error

3. Deploy the contract

Local Testnet
```bash
swanky contract deploy flipper --account alice -g 1000000000000 -a true
```

Shibuya Testnet
```bash
swanky contract deploy flipper --account alice --gas 1000000000000 --args true --network shibuya
```
Copy paste the contract address.

4. Update `WS_PROVIDER` to check if it connects to Shibuya or localhost in ./dapps/ink-rust/wasm-flipper/ui/components/app.tsx

5. View in block explorer if deploy on Astar https://astar.subscan.io/wasm_contract_dashboard?tab=contract

### Interact with ink! Python Smart Contract <a id="interact-python"></a>

* Run the steps in the [Setup](#setup) section (if you want to connect to a local node)
* Enter the Docker container with `docker exec -it ink /bin/bash`
* Run the following inside the Docker container
```bash
cd ./dapps/ink-python/example
pip3 install --no-cache-dir -r requirements.txt
python3 ./src/app.py
```

* Note: If you get error `DuplicateContract', 'docs': ['A contract with the same AccountId already exists` then restart the substrate-contracts-node and reset the database by simply running the following on the host machine from outside the Docker container and waiting for approx. 15 seconds before running your commands again. Or run `/app/docker/reset.sh` from within the Docker container.
	```bash
	docker exec -it ink /app/docker/reset.sh
	```

* Note: If you get error `ValueError: Invalid mnemonic: invalid word in phrase` then you needed to set account mnemonic phrase as the value of `LS_CONTRACT` in the .env file and obtain testnet tokens for it from faucet at https://use.ink/faucet/

### Interact with ink! Rust Flipper Smart Contract using Polkadot.js API <a id="interact-polkadot-js-flipper"></a>

* Enter the Docker container shell in a new terminal window if necessary:
	```bash
	docker exec -it ink /bin/bash
	```
* Install dependencies and run the Flipper DApp
	```bash
	cd dapps/ink-rust/wasm-flipper
	yarn
	yarn dev
	```

* Go to this address in web browser http://localhost:3000

* Reference https://polkadot.js.org/docs/api-contract/start/basics

### Interact with ink! Rust Flipper Smart Contract using Substrate Contracts Node <a id="interact-substrate-contracts-node-flipper"></a>

#### Cargo Contracts

* Instantiate Contract
```
cargo contract instantiate \
	--suri //Bob \
	--constructor new \
	--args true \
	--execute \
	--skip-confirm
```

* Wait for response

```
...
Event System => NewAccount
	account: 5G...
...
Event Contracts + Instantiated
	deployer: 5F...
	contract: 5G.... (new contract account address to interact with contract)
...
```

* Store the response in an environment variable for reuse. Replace the example value below of `5G....` with the actual contract account address provided in the event response above.
```bash
CONTRACT_ADDR=5G....
echo "stored in variable CONTRACT_ADDR the contract address value ${CONTRACT_ADDR" 
```

* Interact to flip the boolean value, not a dry run so no response but we get a gas limit response

```
cargo contract call \
	--suri //Charlie \
	--contract $CONTRACT_ADDR \
	--message flip \
	--execute \
	--skip-confirm
```

* Check it flipped the boolean value (**dry run** only)

```
cargo contract call \
	--suri //Charlie \
	--contract $CONTRACT_ADDR \
	--message get \
	--execute \
	--skip-confirm
```

* Check the outputs:
	* Emitted events in the terminal where you run `cargo contract ...` comments
	* Debug logs in the substrate-contracts-node terminal
	* Optionally go to https://contracts-ui.substrate.io/hash-lookup?rpc=ws://127.0.0.1:9944 and paste the "Code hash" from when you initially uploaded the contract, and pasting its ABI as the Metadata using the contents of ./target/ink/flipper/flipper.json
* Note: If you don't build in "debug" mode with `cargo contract build ...` instead of `cargo contract build --release ...` and you run it using **dry run** by running extra options like the following, or if you execute as a transaction, then you won't be able to see node terminal debug logs like `tokio-runtime-worker runtime::contracts Execution finished with debug buffer...` from your use of `ink::env::debug_println!` in the smart contract
```bash
	--skip-dry-run \
	--gas 1000000000000 \
	--proof-size 1000000000000
```

### Tips Docker Commands <a id="tips-docker"></a>

* List Docker containers
```bash
docker ps -a
```

* List Docker images
```bash
docker images -a
docker buildx ls
```

* Enter Docker container shell
```bash
docker exec -it $CONTAINER_ID /bin/sh
```

* View Docker container logs
```bash
docker logs -f $CONTAINER_ID
```

* Remove Docker container
```bash
docker stop $CONTAINER_ID; docker rm $CONTAINER_ID;
```

* Remove Docker image
```bash
docker rmi $IMAGE_ID
docker buildx rm --all-inactive
```

* Reduce space used by Docker Desktop
	* Docker Preferences -> Resources -> Advanced -> Virtual Disk Limit
		* e.g. 64Gb reduce to 32Gb
		* Note: This deletes all Docker images similar to `docker system prune -a --volumes`

### Notes <a id="tips-notes"></a>

* Strategy:
	* Why use smart contract instead of blockchain?
		* Faster iterations of design, development, testing, and release of applications to market
		* Provide core functionality for the base layer of a general purpose blockchain that is being built
		* Allow smart contracts to interact with an application-specific blockchain pallet logic and use them to expose some logic to users since smart contracts treat all user input as untrusted and potentially adversarial
		* Example:
			* Building an application where most logic in Substrate pallets
				* Allow users to upload their own trading algorithms using smart contracts
				* Smart contracts require gas fees to execute so users would pay for the execution time of those trading algorithms
				* Expose relevant primitives similar to the [Chain extension primitive](https://ink.substrate.io/macros-attributes/chain-extension/) of the Contracts pallet 
	* What types of smart contracts may be deployed on Substrate runtime?
		* WebAssembly
		* EVM-compatible
	* What is a smart contract?
		* Instructions that are instantiated and executed on a host platform using a specific smart contract chain account address 
		* Instructions written in a language
	* What Substrate pallet is best to use when building a runtime to host smart contracts that are being built?
		* Contracts pallet allows deployment and execution of WebAssembly-based smart contracts
	* What trait do smart contract accounts used in the Contracts pallet of Substrate extend?
		* `Currency` trait
	* How to resolve `ERROR: This contract has already been uploaded with code hash`
		* It may be because you ran a Substrate contract node on your host machine and then tried running another one in your Docker container. So it may be necessary to run `kill -9 $(lsof -ti:30333)` on
		both the host machine and inside the Docker container. Or just restart Docker.


* Link
	* https://docs.substrate.io/build/smart-contracts-strategy/

TODO - continue summarising from "Smart contract accounts" section

### Links <a id="tips-links"></a>

#### Ink

* https://use.ink/
* https://github.com/paritytech/awesome-ink
* https://github.com/paritytech/ink-examples
* https://substrate.stackexchange.com/questions/tagged/ink?tab=Votes
* https://www.youtube.com/@ink-lang
* https://github.com/paritytech/cargo-contract
* https://polkadot.js.org/docs/api-contract

#### Docker

* https://docs.docker.com/engine/reference/builder/#here-documents
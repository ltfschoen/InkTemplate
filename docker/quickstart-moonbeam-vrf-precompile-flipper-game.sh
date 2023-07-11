#!/bin/bash

trap "echo; exit" INT
trap "echo; exit" HUP

# if they call this script from project root or from within docker/ folder then
# in both cases the PARENT_DIR will refer to the project root where the .env file is.
PARENT_DIR=$( echo $(dirname "$(dirname "$(realpath "${BASH_SOURCE[0]}")")") )

# TODO - update this script to install all necessary dependencies as mentioned in the
# dapps/evm2/flipper_game/README.md but this will depend on the users operating system

echo "Compiling contracts..."

cd $PARENT_DIR/dapps/evm2/flipper_game/scripts

npm install

cd $PARENT_DIR/dapps/evm2/flipper_game
PROJECT_ROOT=$PARENT_DIR/dapps/evm2/flipper_game

npm install -g truffle
npm install

truffle compile --compile-all

echo "Migrating contracts..."
truffle migrate --reset --compile-all --network moonbase

echo "Verifying contracts..."

OUTPUT_CONTRACT_HASH=$(
    truffle run verify FlipperGame --network moonbase | tail -2
)
# get the deployed contract address from the output
# and pass that as a variable to the demo-moonbeam-vrf-flipper-game-part1.js script
echo "Finished verifying contract..."
echo $OUTPUT_CONTRACT_HASH
# remove text and trim whitespace
OUTPUT_CONTRACT_HASH_TRIMMED=$(
    echo "$OUTPUT_CONTRACT_HASH" | sed 's/Contract source code already verified//;s/$//' | sed 's/Pass - Verified: https:\/\/sourcify.dev\/#\/lookup\///;s/$//' | sed 's/Successfully verified 1 contract(s).//;s/$//' | tr -d '"'
)
echo $OUTPUT_CONTRACT_HASH_TRIMMED

OUTPUT_CONTRACT_HASH_RN=$(
    truffle run verify FlipperGameRandomNumber --network moonbase | tail -2
)
# get the deployed contract address from the output
# and pass that as a variable to the demo-moonbeam-vrf-flipper-game-part1.js script
echo "Finished verifying contract..."
echo $OUTPUT_CONTRACT_HASH_RN
# remove text and trim whitespace
OUTPUT_CONTRACT_HASH_RN_TRIMMED=$(
    echo "$OUTPUT_CONTRACT_HASH_RN" | sed 's/Contract source code already verified//;s/$//' | sed 's/Pass - Verified: https:\/\/sourcify.dev\/#\/lookup\///;s/$//' | sed 's/Successfully verified 1 contract(s).//;s/$//' | tr -d '"'
)
echo $OUTPUT_CONTRACT_HASH_RN_TRIMMED

# if you get error `TypeError: Cannot create property 'gasLimit' on string '0x478a6a'` or similar
# then restart your internet connection
echo "Request randomness"
node $PROJECT_ROOT/scripts/demo-moonbeam-vrf-flipper-game-part1.js $OUTPUT_CONTRACT_HASH_TRIMMED $OUTPUT_CONTRACT_HASH_RN_TRIMMED

# echo "Obtain a randomness status, fulfill and get random number"
# node $PROJECT_ROOT/scripts/demo-moonbeam-vrf-flipper-game-part2.js $OUTPUT_CONTRACT_HASH_TRIMMED $OUTPUT_CONTRACT_HASH_RN_TRIMMED

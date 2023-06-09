#!/bin/bash

trap "echo; exit" INT
trap "echo; exit" HUP

# if they call this script from project root or from within docker/ folder then
# in both cases the PARENT_DIR will refer to the project root where the .env file is.
PARENT_DIR=$( echo $(dirname "$(dirname "$(realpath "${BASH_SOURCE[0]}")")") )

echo "Building contracts..."
cd $PARENT_DIR/dapps/basic_contract_caller
PROJECT_ROOT=$PARENT_DIR/dapps/basic_contract_caller
cargo contract build \
    --manifest-path $PARENT_DIR/dapps/basic_contract_caller/Cargo.toml
cargo contract build \
    --manifest-path $PARENT_DIR/dapps/basic_contract_caller/other_contract/Cargo.toml

cd $PROJECT_ROOT
echo "Uploading sub-contract..."
# upload sub-contract
#
# note: provide args variable so able to comment out all `--skip-dry-run` options in bulk
# since it breaks command if comment out a multiline command option `#--skip-dry-run \`
# see https://stackoverflow.com/a/9522766/3208553
args=(
    --suri //Alice
	--execute
    # --skip-dry-run
	--skip-confirm
    $PARENT_DIR/target/ink/other_contract/other_contract.wasm
)
OUTPUT_CODE_HASH_SUB=$(
    cargo contract upload "${args[@]}" | tail -1
)
echo "Finished uploading contract..."
# example: '  Code hash "0x..."'
echo $OUTPUT_CODE_HASH_SUB
# remove text 'Code hash' and the outer double quotes of the code hash
OUTPUT_CODE_HASH_SUB_REMOVED_LABEL=$(echo "$OUTPUT_CODE_HASH_SUB" | sed 's/Code hash//;s/$//' | tr -d '"')
# trim whitespace
CODE_HASH_SUB=$(echo $OUTPUT_CODE_HASH_SUB_REMOVED_LABEL)
echo $CODE_HASH_SUB

echo "Uploading main-contract..."
# upload main-contract
#
args=(
    --suri //Alice
	--execute
    # --skip-dry-run
	--skip-confirm
    $PARENT_DIR/target/ink/basic_contract_caller/basic_contract_caller.wasm
)
OUTPUT_CODE_HASH_MAIN=$(
    cargo contract upload "${args[@]}" | tail -1
)
echo "Finished uploading contract..."
# example: '  Code hash "0x..."'
echo $OUTPUT_CODE_HASH_MAIN
# remove text 'Code hash' and the outer double quotes of the code hash
OUTPUT_CODE_HASH_MAIN_REMOVED_LABEL=$(echo "$OUTPUT_CODE_HASH_MAIN" | sed 's/Code hash//;s/$//' | tr -d '"')
# trim whitespace
CODE_HASH_MAIN=$(echo $OUTPUT_CODE_HASH_MAIN_REMOVED_LABEL)
echo $CODE_HASH_MAIN

cd $PROJECT_ROOT

echo "Instantiating sub-contract..."
args=(
    --manifest-path $PARENT_DIR/dapps/basic_contract_caller/other_contract/Cargo.toml
    --suri //Alice
    --constructor new
    --args true
    --execute
    # unlimited gas is 0
    --gas 100000000000
    --proof-size 100000000000
    # --skip-dry-run
    --skip-confirm
)
OUTPUT_CONTRACT_ADDR_SUB=$(
    cargo contract instantiate "${args[@]}" | tail -1
)

# example: '  Contract 5...'
echo $OUTPUT_CONTRACT_ADDR_SUB
# remove text 'Contract'
OUTPUT_CONTRACT_ADDR_SUB_REMOVED_LABEL=$(echo "$OUTPUT_CONTRACT_ADDR_SUB" | sed 's/Contract//;s/$//')
# trim whitespace using `echo ...`
CONTRACT_ADDR_SUB=$(echo $OUTPUT_CONTRACT_ADDR_SUB_REMOVED_LABEL)
echo $CONTRACT_ADDR_SUB

# instantiate "main" contract, providing the code hash generated from uploading the "sub" contract
echo "Instantiating main-contract..."

args=(
    --manifest-path $PARENT_DIR/dapps/basic_contract_caller/Cargo.toml
    --suri //Alice
    --constructor new
    --args $CODE_HASH_SUB $CONTRACT_ADDR_SUB
    --execute
    # unlimited gas is 0
    # --storage-deposit-limit 50000000000 \
    # https://substrate.stackexchange.com/questions/3992/i-get-a-the-executed-contract-exhausted-its-gas-limit-when-attempting-to-inst
    --gas 200000000000 \
    --proof-size 100000000000
    # --skip-dry-run
    --skip-confirm
)
OUTPUT_CONTRACT_ADDR_MAIN=$(
    cargo contract instantiate "${args[@]}" | tail -1
)

# example: '  Contract 5...'
echo $OUTPUT_CONTRACT_ADDR_MAIN
# remove text 'Contract'
OUTPUT_CONTRACT_ADDR_MAIN_REMOVED_LABEL=$(echo "$OUTPUT_CONTRACT_ADDR_MAIN" | sed 's/Contract//;s/$//')
# trim whitespace using `echo ...`
CONTRACT_ADDR_MAIN=$(echo $OUTPUT_CONTRACT_ADDR_MAIN_REMOVED_LABEL)
echo $CONTRACT_ADDR_MAIN

echo "Calling contract method flip..."
args=(
	--suri //Alice
	--contract $CONTRACT_ADDR_MAIN
	--message flip
	--execute
    --gas 200000000000
    --proof-size 100000000000
    # --skip-dry-run
	--skip-confirm
)
cargo contract call "${args[@]}" | grep --color=always -z 'data'

echo "Calling contract method get ..."
args=(
	--suri //Alice
	--contract $CONTRACT_ADDR_SUB
	--message get
	--execute
    # --skip-dry-run
	--skip-confirm
)
cargo contract call "${args[@]}" | grep --color=always -z 'data'

echo "Calling contract method get ..."
args=(
	--suri //Alice
	--contract $CONTRACT_ADDR_MAIN
	--message get
	--execute
    # --gas 200000000000
    # --proof-size 100000000000
    # --skip-dry-run
	--skip-confirm
)
cargo contract call "${args[@]}" | grep --color=always -z 'data'

echo "Calling contract method flip_and_get ..."
args=(
	--suri //Alice
	--contract $CONTRACT_ADDR_MAIN
	--message flip_and_get
	--execute
    --gas 200000000000
    --proof-size 100000000000
    --skip-dry-run
	--skip-confirm
)
cargo contract call "${args[@]}" | grep --color=always -z 'data'

# highlight the `data` line in output containing the value of the emitted `Retrieve` event
echo "Calling contract method get_other_contract_address ..."
args=(
	--suri //Alice
	--contract $CONTRACT_ADDR_MAIN
	--message get_other_contract_address
	--execute
    # --gas 200000000000
    # --proof-size 100000000000
    # --skip-dry-run
	--skip-confirm
)
cargo contract call "${args[@]}" | grep --color=always -z 'data'

# CALLEE= # contract address
# SELECTOR="get" # method
# ARG="" # arg
# MAX_GAS="200000000000"
# TRANSFER_VALUE="0" 
# echo "Calling contract method u32_proxy ..."
# args=(
# 	--suri //Alice
# 	--contract $CONTRACT_ADDR_MAIN
# 	--message u32_proxy
#     --args $CALLEE $SELECTOR $ARG $MAX_GAS $TRANSFER_VALUE
# 	--execute
#     # --gas 200000000000
#     # --proof-size 100000000000
#     # --skip-dry-run
# 	--skip-confirm
# )
# cargo contract call "${args[@]}" | grep --color=always -z 'data'

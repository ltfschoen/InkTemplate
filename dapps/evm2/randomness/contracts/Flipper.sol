// SPDX-License-Identifier: MIT
pragma solidity >=0.8.3;

import "./lib/RandomNumber.sol";

contract Flipper {
	bool private value;
	// address public randomNumberContractAddress;

	/// Constructor that initializes the `bool` value to the given `init_value`.
	constructor(bool initvalue) {
		value = initvalue;
	}

	// function setRandomNumberContractAddress(address _randomNumberAddress) public {
	// 	randomNumberContractAddress = _randomNumberAddress;
	// }

	/// A message that can be called on instantiated contracts.
	/// This one flips the value of the stored `bool` from `true`
	/// to `false` and vice versa.
	function flip() public payable {
		value = !value;
	}

	/// Simply returns the current value of our `bool`.
	function get() public view returns (bool) {
		return value;
	}
}

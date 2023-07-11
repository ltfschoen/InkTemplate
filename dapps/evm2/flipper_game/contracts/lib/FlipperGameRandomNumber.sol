// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.8.3;

// compiling with truffle automatically generates the respective ABI files for these precompiles
// https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/Randomness.sol
// import "../precompiles/randomness/Randomness.sol";
import {Randomness, MIN_VRF_BLOCKS_DELAY} from "../precompiles/randomness/Randomness.sol";
// https://github.com/PureStake/moonbeam/blob/master/precompiles/randomness/RandomnessConsumer.sol
import {RandomnessConsumer} from "../precompiles/randomness/RandomnessConsumer.sol";

contract FlipperGameRandomNumber is RandomnessConsumer {
    // The Randomness Precompile Interface

    // create a wrapper to access the randomness precompile
    Randomness public theRandomness;
    address public constant randomnessPrecompileAddress = 0x0000000000000000000000000000000000000809;

    // Variables required for randomness requests
    uint256 public requiredDeposit;
    uint64 public FULFILLMENT_GAS_LIMIT = 100000;
    // The fee can be set to any value as long as it is enough to cover
    // the fulfillment costs. Any leftover fees will be refunded to the
    // refund address specified in the requestRandomness function below
    uint256 public MIN_FEE = FULFILLMENT_GAS_LIMIT * 5 gwei; // 0.000000001 Ether == 1 gwei
    // https://docs.moonbeam.network/learn/features/randomness/
    uint32 public VRF_BLOCKS_DELAY;
    bytes32 public SALT_PREFIX = "change-me-to-anything";

    uint256 private constant FLIP_IN_PROGRESS = 1;
    uint256 private constant FLIP_COMPLETED = 2;

    // Storage variables for the current request
    uint256 public requestId;

    address public s_owner;
    address public flipperGameContractAddress;

    // map gameIds to requestIds
    mapping(uint256 => uint256) private s_flipper_req_id_to_game_id;
    // map requestIds to gameIds
    mapping(uint256 => uint256) private s_flipper_game_id_to_req_id;
    mapping(uint256 => uint256) private s_status;
    // map vrf results (modulus 20) to gameIds
    mapping(uint256 => uint256) private s_results;
    // map vrf results (originals) to gameIds
    mapping(uint256 => uint256) private s_results_original;

    event FlipStarted(uint256 indexed requestId, uint256 indexed _gameId, address indexed flipper);
    event FlipLanded(uint256 indexed requestId, uint256 indexed result);
    event FlipFulfilled(uint256 indexed requestId, uint256 d20Value, uint256[] randomWords);

    constructor() payable RandomnessConsumer() {
        // Initialize use of Randomness dependency before trying to access it
        theRandomness = Randomness(randomnessPrecompileAddress);
        requiredDeposit = theRandomness.requiredDeposit();
        // Because this contract can only perform 1 random request at a time,
        // We only need to have 1 required deposit.
        require(msg.value >= requiredDeposit);
        // s_owner = msg.sender;
        VRF_BLOCKS_DELAY = MIN_VRF_BLOCKS_DELAY;

        s_owner = msg.sender;
    }

    function setFlipperGameContractAddress(address _flipperGameContractAddress)
        public onlyOwner
    {
        flipperGameContractAddress = _flipperGameContractAddress;
    }

    function requestRandomness(
        address flipper, uint256 _gameId
    ) public onlyFlipperGameContract payable {
        require(s_results[_gameId] == 0, "Already flipped for this flipper game id");
        // Make sure that the value sent is enough
        require(msg.value >= MIN_FEE, "Insufficient fulfillment fee");
        // Request local VRF randomness
        
        requestId = theRandomness.requestLocalVRFRandomWords(
        // requestId = theRandomness.requestRelayBabeEpochRandomWords(
            msg.sender, // Refund address
            msg.value, // Fulfillment fee
            FULFILLMENT_GAS_LIMIT, // Gas limit for the fulfillment
            SALT_PREFIX ^ bytes32(requestId++), // A salt to generate unique results
            1, // Number of random words
            VRF_BLOCKS_DELAY // Delay before request can be fulfilled
        );

        s_flipper_req_id_to_game_id[requestId] = _gameId;
        s_flipper_game_id_to_req_id[_gameId] = requestId;
        s_status[_gameId] = FLIP_COMPLETED;
        emit FlipStarted(requestId, _gameId, flipper);
    }

    function getRequestStatus() public view returns(Randomness.RequestStatus) {
        Randomness.RequestStatus requestStatus = theRandomness.getRequestStatus(requestId);
        return requestStatus;
    }

    function fulfillRequest() public onlyFlipperGameContract {
        theRandomness.fulfillRequest(requestId);
    }

    function fulfillRandomWords(
        uint256 reqId, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        // Save the randomness results
        uint256 d20Value = (randomWords[0] % 20) + 1;
        // convert from reqId to gameId since otherwise to get access to current game
        s_results[s_flipper_req_id_to_game_id[reqId]] = d20Value;
        s_results_original[s_flipper_req_id_to_game_id[reqId]] = randomWords[0];
        s_status[s_flipper_req_id_to_game_id[reqId]] = FLIP_COMPLETED;
        emit FlipFulfilled(requestId, d20Value, randomWords);
    }

    /**
     * @notice Get the value flipped for a gameId once the address has flipped and fulfilled
     * @param _gameId 2
     * @return random number (modulus 20)
     */
    function getFlippedValueForGameId(uint256 _gameId) public view returns (uint256) {
        require(s_status[_gameId] != 0, "Not yet flipped");
        require(s_status[_gameId] != FLIP_IN_PROGRESS, "Flip in progress");
        require(s_status[_gameId] == FLIP_COMPLETED, "Flip completed");
        return s_results[_gameId];
    }

    modifier onlyOwner() {
        require(msg.sender == s_owner);
        _;
    }

    modifier onlyFlipperGameContract() {
        require(msg.sender == flipperGameContractAddress);
        _;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.3;

import {FlipperGameRandomNumber} from "./lib/FlipperGameRandomNumber.sol";

contract FlipperGame {
    uint private constant BLOCKS_ALLOW_GUESS = 100;
    uint private constant BLOCKS_ALLOW_RANDOMNESS = 12; // 70 sec @ 6 sec/block
    uint private constant BLOCKS_ALLOW_FULFILL = 7; // 40 sec @ 6 sec/block

    uint public blockNumber;
    // bytes32 public blockHashNow;
    bytes32 public blockHashPrevious;
    bool public hasCalledFallbackFn;
    address public s_owner;
    address public flipperGameRandomNumberContractAddress;
    uint256 public gameId = 0;
    uint256 public playerGuessId = 0;
    uint256 public answerId = 0;
    GameStruct[] public gamesList;

    struct GameStruct {
        uint256 id;
        bytes32 startGameAtBlockHash; // blockHashPrevious
        address createdBy;
        uint createdAtBlock;
        uint endGuessesAtBlock;
    }

    struct PlayerStruct {
        address playerAddress;
        uint256 gameId;
        uint createdAtBlock;
    }

    struct PlayerGuessStruct {
        uint256 id;
        uint256 gameId;
        address guessByPlayerAddress;
        uint256 guess;
        uint createdAtBlock;
    }

    struct AnswerStruct {
        uint256 id;
        uint256 gameId;
        uint256 answer;
        uint createdAtBlock;
    }

    struct RequestBlockStruct {
        uint256 requestedRandomnessAtBlock;
        uint256 requestedFulfillAtBlock;
    }

    mapping(address => uint) public playerBalance;
    mapping(uint256 => GameStruct) public gameForGameId;
    mapping(uint256 => PlayerStruct[]) public playersForGameId;
    mapping(address => uint256[]) public gameIdsForPlayerId;
    mapping(uint256 => PlayerGuessStruct[]) public playerGuessForPlayerOfGameId;
    mapping(uint256 => RequestBlockStruct) public requestedAtBlockNumberForGameId;
    mapping(uint256 => AnswerStruct) public answerForGameId;

    event CreatedGame(uint256 indexed gameId, bytes32 blockHashPrevious, address indexed createdBy,
        uint indexed createdAtBlock, uint endGuessesAtBlock);
    event AddedPlayerToGame(uint256 indexed gameId, address indexed playerAddress, uint indexed createdAtBlock);
    event AddedGuessForPlayerOfGame(uint256 indexed gameId, uint256 indexed playerGuessId,
        address indexed guessByPlayerAddress, uint256 guess, uint createdAtBlock);
    event AddedAnswerForGame(uint256 indexed gameId, uint256 indexed answerId, address answerByAddress,
        uint256 answer, uint indexed createdAtBlock);

    constructor() {
        s_owner = msg.sender;
    }

    function createGame(uint256 _initialGuess) external payable returns(uint256) {
        require(_initialGuess <= 20);
        blockNumber = block.number;
        blockHashPrevious = blockhash(blockNumber - 1);

        gameId = gameId + 1;
        uint256 _gameId = gameId;

        GameStruct memory gameInstance = GameStruct({
            id: _gameId,
            startGameAtBlockHash: blockHashPrevious,
            createdBy: msg.sender,
            createdAtBlock: blockNumber,
            endGuessesAtBlock: blockNumber + BLOCKS_ALLOW_GUESS
        });

        gameForGameId[_gameId] = gameInstance;
        gamesList.push(gameInstance);    

        emit CreatedGame(_gameId, blockHashPrevious, msg.sender, blockNumber, blockNumber + BLOCKS_ALLOW_GUESS);

        return _gameId;
    }

    function addPlayerToGame(uint256 _gameId, uint256 _initialGuess) payable public {
        blockNumber = block.number;
        require(hasPlayerForGameId(_gameId) == false, "only one instance of same player address per game");
        require(blockNumber >= gameForGameId[_gameId].createdAtBlock);
        require(blockNumber <= gameForGameId[_gameId].endGuessesAtBlock,
            "add player to game only allowed before block number when guesses end");
        PlayerStruct memory playerInstance = PlayerStruct({
            playerAddress: msg.sender,
            gameId: _gameId,
            createdAtBlock: blockNumber
        });
        playersForGameId[_gameId].push(playerInstance);
        gameIdsForPlayerId[msg.sender].push(_gameId);

        addGuessForPlayerOfGame(_gameId, _initialGuess);

        emit AddedPlayerToGame(_gameId, msg.sender, blockNumber);
    }

    function hasPlayerForGameId(uint256 _gameId) public view returns (bool) {
        for (uint i = 0; i < playersForGameId[_gameId].length; i++) {
            if (playersForGameId[_gameId][i].playerAddress == msg.sender) {
                return true;
            }
        }
        return false;
    }

    function hasPlayerGuessedForGameId(uint256 _gameId) public view returns (bool) {
        for (uint i = 0; i < gameIdsForPlayerId[msg.sender].length; i++) {
            if (gameIdsForPlayerId[msg.sender][i] == _gameId) {
                return true;
            }
        }
        return false;
    }

    function addGuessForPlayerOfGame(uint256 _gameId, uint256 _guess) internal returns(uint256) {
        require(_guess <= 20);
        require(hasPlayerGuessedForGameId(_gameId) == false, "only one guess per player per game");
        blockNumber = block.number;
        require(blockNumber >= gameForGameId[_gameId].createdAtBlock);
        require(blockNumber <= gameForGameId[_gameId].endGuessesAtBlock,
            "guesses only allowed before block number when guesses end");
        playerGuessId = playerGuessId + 1;
        uint256 _playerGuessId = playerGuessId;
        PlayerGuessStruct memory playerGuessInstance = PlayerGuessStruct({
            id: _playerGuessId,
            gameId: _gameId,
            guessByPlayerAddress: msg.sender,
            guess: _guess,
            createdAtBlock: blockNumber
        });
        playerGuessForPlayerOfGameId[_gameId].push(playerGuessInstance);
        gameIdsForPlayerId[msg.sender].push(_gameId);

        emit AddedGuessForPlayerOfGame(_gameId, _playerGuessId, msg.sender, _guess, blockNumber);

        return _guess;
    }

    function requestRandomessAnswerOfGame(uint256 _gameId) external payable {
        FlipperGameRandomNumber instanceFlipperGameRandomNumber =
            FlipperGameRandomNumber(flipperGameRandomNumberContractAddress);
        uint256 minFee = instanceFlipperGameRandomNumber.MIN_FEE();
        // Make sure that the value sent is enough
        require(msg.value >= minFee, "Insufficient fulfillment fee");

        blockNumber = block.number;
        require(blockNumber >= gameForGameId[_gameId].createdAtBlock);
        require(blockNumber > gameForGameId[_gameId].endGuessesAtBlock,
            "answer only allowed after block number when guesses end");

        requestedAtBlockNumberForGameId[_gameId].requestedRandomnessAtBlock = blockNumber;

        instanceFlipperGameRandomNumber.requestRandomness{value: msg.value}(address(this), _gameId);
    }

    function requestFulfillAnswerOfGame(uint256 _gameId) external payable {
        blockNumber = block.number;
        require(blockNumber >= gameForGameId[_gameId].createdAtBlock);
        require(blockNumber > gameForGameId[_gameId].endGuessesAtBlock,
            "answer only allowed after block number when guesses end");
        require(blockNumber >= requestedAtBlockNumberForGameId[_gameId].requestedRandomnessAtBlock + BLOCKS_ALLOW_RANDOMNESS,
            "request fulfill only after waiting sufficient blocks after requesting randomness");

        requestedAtBlockNumberForGameId[_gameId].requestedFulfillAtBlock = blockNumber;

        FlipperGameRandomNumber instanceFlipperGameRandomNumber =
            FlipperGameRandomNumber(flipperGameRandomNumberContractAddress);
        instanceFlipperGameRandomNumber.fulfillRequest();
    }

    function fetchAndAddAnswerToGame(uint256 _gameId) external returns(uint256) {
        blockNumber = block.number;
        require(blockNumber >= gameForGameId[_gameId].createdAtBlock);
        require(blockNumber > gameForGameId[_gameId].endGuessesAtBlock,
            "answer only allowed after block number when guesses end");
        require(blockNumber >= requestedAtBlockNumberForGameId[_gameId].requestedFulfillAtBlock + BLOCKS_ALLOW_FULFILL,
            "fetch answer only after waiting sufficient blocks to fulfill");

        FlipperGameRandomNumber instanceFlipperGameRandomNumber =
            FlipperGameRandomNumber(flipperGameRandomNumberContractAddress);
        uint256 answer = instanceFlipperGameRandomNumber.getFlippedValueForGameId(_gameId);

        require(answer <= 20, "answer not within expected range of values");

        emit AddedAnswerForGame(_gameId, answerId, msg.sender, answer, blockNumber);

        return answer;
    }

    function setFlipperGameRandomNumberContractAddress(address _flipperGameRandomNumberContractAddress)
        public onlyOwner
    {
        flipperGameRandomNumberContractAddress = _flipperGameRandomNumberContractAddress;
    }

    // fallback function
    fallback() external payable {
        hasCalledFallbackFn = true;
        playerBalance[msg.sender] += msg.value;
    }
    receive() external payable {}

    modifier onlyOwner() {
        require(msg.sender == s_owner);
        _;
    }
}

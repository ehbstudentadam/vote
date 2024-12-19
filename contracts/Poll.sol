// Poll.sol - Poll Smart Contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./AccessControlManager.sol";
import "./TokenDistribution.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract Poll is IERC1155Receiver, ERC165 {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;
    // Token distribution contract reference
    TokenDistribution public tokenDistribution;

    // Struct to represent each voting option
    struct VotingOption {
        string description; // Description of the voting option
        uint256 voteCount; // Count of votes for this option
    }

    // Poll variables
    string public pollTitle; // Title of the poll
    uint256 public endDate; // Poll end date (UNIX timestamp)
    bool public isFinalized; // Poll status: finalized or not
    address public creator; // Address of the poll creator (Instance)
    VotingOption[] public votingOptions; // Array of voting options

    // Mapping to track each user's votes per option
    mapping(address => mapping(uint256 => uint256)) public votes;

    // Participation restrictions
    uint256 public minAge; // Minimum age required to participate
    string public location; // Location restriction for participants
    uint256 public minTokensRequired; // Minimum tokens required for participation

    // Events
    event VoteCast(address indexed voter, uint256 optionIndex, uint256 amount);
    event VotesCast(
        address indexed voter,
        uint256[] optionIndexes,
        uint256[] amounts
    );
    event PollFinalized(string title, uint256[] results);
    event NFTReceived(address indexed from, uint256 id, uint256 amount);

    // Modifier to ensure the poll is active (not ended or finalized)
    modifier onlyActivePoll() {
        //require(block.timestamp <= endDate, "Poll has ended");
        require(!isFinalized, "Poll is already finalized");
        _;
    }

    /**
     * @dev Modifier to restrict access to functions only for roles.
     */
    modifier onlyRoleFromManager(bytes32 role) {
        require(
            accessControlManager.hasRoleForContract(role, msg.sender),
            "Access denied: Incorrect role"
        );
        _;
    }

    /**
     * @dev Constructor to initialize the poll and set the poll creator.
     * The constructor sets the poll options and assigns an admin role.
     * @param _title The title of the poll.
     * @param _votingOptions The available options for voting.
     * @param _endDate The end date of the poll.
     * @param _minAge Minimum age required for participation.
     * @param _location Location restriction for participants.
     * @param _minTokensRequired Minimum tokens required to participate.
     * @param _creator Address of the poll creator (Instance).
     * @param _accessControlManager Address of the centralized AccessControlManager.
     */
    constructor(
        string memory _title,
        string[] memory _votingOptions,
        uint256 _endDate,
        uint256 _minAge,
        string memory _location,
        uint256 _minTokensRequired,
        address _creator,
        address _accessControlManager,
        address _tokenDistribution
    ) {
        require(_endDate > block.timestamp, "End date must be in the future");
        require(_minAge > 0, "Minimum age must be greater than zero");
        require(_creator != address(0), "Creator address cannot be zero");
        require(
            _accessControlManager != address(0),
            "AccessControlManager address cannot be zero"
        );
        require(
            _tokenDistribution != address(0),
            "TokenDistribution address cannot be zero"
        );

        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
        // Set the token distribution contract
        tokenDistribution = TokenDistribution(_tokenDistribution);

        pollTitle = _title;
        endDate = _endDate;
        minAge = _minAge;
        location = _location;
        minTokensRequired = _minTokensRequired;
        creator = _creator;

        // Initialize each voting option
        for (uint256 i = 0; i < _votingOptions.length; i++) {
            votingOptions.push(
                VotingOption({description: _votingOptions[i], voteCount: 0})
            );
        }

        // Mark the poll as initially active
        isFinalized = false;
    }

    /**
     * @dev Allows users to cast votes for a specific option in the poll.
     * Transfers the required number of NFTs (tokens) to the Poll contract.
     * @param optionIndex The index of the voting option chosen.
     * @param amount The amount of tokens allocated to this vote.
     */
    function castVote(
        uint256 optionIndex,
        uint256 amount
    )
        external
        onlyActivePoll
        onlyRoleFromManager(accessControlManager.USER_ROLE())
    {
        require(optionIndex < votingOptions.length, "Invalid voting option");

        uint256 pollId = uint256(uint160(address(this))); // Unique poll ID based on contract address
        uint256 userBalance = tokenDistribution.balanceOf(msg.sender, pollId);
        require(userBalance >= amount, "Insufficient NFT tokens for this poll");

        // Transfer tokens from user to poll
        tokenDistribution.safeTransferFrom(
            msg.sender,
            address(this),
            pollId,
            amount,
            ""
        );

        // Update vote counts
        votingOptions[optionIndex].voteCount += amount;
        votes[msg.sender][optionIndex] += amount;

        emit VoteCast(msg.sender, optionIndex, amount);

        _checkAndFinalizePoll(); // Check and finalize poll if conditions are met
    }

    /**
     * @dev Allows users to cast votes for multiple options in a single transaction.
     * Transfers the required number of NFTs (tokens) to the Poll contract.
     * @param optionIndexes Array of indexes of the voting options chosen.
     * @param amounts Array of token amounts allocated to each option.
     */
    function castVotes(
        uint256[] memory optionIndexes,
        uint256[] memory amounts
    )
        external
        onlyActivePoll
        onlyRoleFromManager(accessControlManager.USER_ROLE())
    {
        require(
            optionIndexes.length == amounts.length,
            "Mismatched indexes and amounts"
        );

        uint256 pollId = uint256(uint160(address(this))); // Unique poll ID based on contract address
        uint256 userBalance = tokenDistribution.balanceOf(msg.sender, pollId);

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < optionIndexes.length; i++) {
            require(
                optionIndexes[i] < votingOptions.length,
                "Invalid voting option"
            );
            require(amounts[i] > 0, "Amount must be greater than zero");
            totalAmount += amounts[i];
        }

        require(
            userBalance >= totalAmount,
            "Insufficient NFT tokens for this poll"
        );

        // Transfer tokens from user to poll
        tokenDistribution.safeTransferFrom(
            msg.sender,
            address(this),
            pollId,
            totalAmount,
            ""
        );

        // Update vote counts for each option
        for (uint256 i = 0; i < optionIndexes.length; i++) {
            votingOptions[optionIndexes[i]].voteCount += amounts[i];
            votes[msg.sender][optionIndexes[i]] += amounts[i];
        }

        emit VotesCast(msg.sender, optionIndexes, amounts);

        _checkAndFinalizePoll(); // Check and finalize poll if conditions are met
    }

    /**
     * @dev Finalizes the poll if it has reached the end date.
     * Emits an event with the poll results.
     */
    function finalizePoll() public {
        require(block.timestamp > endDate, "Poll is still active");
        require(!isFinalized, "Poll is already finalized");

        _finalizePoll();
    }

    /**
     * @dev Internal function to check and finalize the poll.
     */
    function _checkAndFinalizePoll() internal {
        if (block.timestamp > endDate && !isFinalized) {
            _finalizePoll();
        }
    }

    /**
     * @dev Internal function to finalize the poll and emit the results.
     */
    function _finalizePoll() internal {
        isFinalized = true;
        uint256[] memory results = new uint256[](votingOptions.length);

        for (uint256 i = 0; i < votingOptions.length; i++) {
            results[i] = votingOptions[i].voteCount;
        }

        emit PollFinalized(pollTitle, results);
    }

    /**
     * @dev Function to retrieve all votes cast by a specific user.
     * @param user Address of the user whose votes are being retrieved.
     * @return optionIndexes Array of option indexes voted by the user.
     * @return amounts Array of token amounts voted by the user for each option.
     */
    function getUserVotes(
        address user
    )
        external
        view
        returns (uint256[] memory optionIndexes, uint256[] memory amounts)
    {
        uint256 optionsCount = votingOptions.length;
        uint256 voteCount = 0;

        // Count the options the user has voted on
        for (uint256 i = 0; i < optionsCount; i++) {
            if (votes[user][i] > 0) {
                voteCount++;
            }
        }

        // Allocate arrays for user votes
        optionIndexes = new uint256[](voteCount);
        amounts = new uint256[](voteCount);
        uint256 index = 0;

        // Populate arrays with user's votes
        for (uint256 i = 0; i < optionsCount; i++) {
            if (votes[user][i] > 0) {
                optionIndexes[index] = i;
                amounts[index] = votes[user][i];
                index++;
            }
        }
    }

    /**
     * @dev Get eligibility requirements for this poll.
     * @return minAge The minimum age for eligibility.
     * @return location The required location for eligibility.
     * @return minTokensRequired The minimum tokens required for eligibility.
     */
    function getEligibility()
        external
        view
        returns (uint256, string memory, uint256)
    {
        return (minAge, location, minTokensRequired);
    }

    /**
     * @dev Function to get the current vote count for a specific option with auto-finalization.
     * @param optionIndex The index of the voting option.
     * @return uint256 The current vote count for the option.
     */
    function getVoteCount(uint256 optionIndex) external view returns (uint256) {
        require(optionIndex < votingOptions.length, "Invalid option index");
        return votingOptions[optionIndex].voteCount;
    }

    /**
     * @dev Function to get the total number of voting options available.
     * @return uint256 Total number of options in the poll.
     */
    function getTotalOptions() external view returns (uint256) {
        return votingOptions.length;
    }

    /**
     * @dev Function to retrieve the final results of the poll after finalization.
     * Ensures auto-finalization has occurred if the poll has ended.
     * @return uint256[] Array of final vote counts for each option.
     */
    function getResults() external view returns (uint256[] memory) {
        require(isFinalized, "Poll has not been finalized yet");

        uint256[] memory results = new uint256[](votingOptions.length);
        for (uint256 i = 0; i < votingOptions.length; i++) {
            results[i] = votingOptions[i].voteCount;
        }
        return results;
    }

    /**
     * @dev Handle receipt of a single ERC1155 token type.
     */
    function onERC1155Received(
        address /* operator */,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /* data */
    ) external override returns (bytes4) {
        emit NFTReceived(from, id, value);
        return this.onERC1155Received.selector;
    }

    /**
     * @dev Handle receipt of multiple ERC1155 token types.
     */
    function onERC1155BatchReceived(
        address /* operator */,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata /* data */
    ) external override returns (bytes4) {
        for (uint256 i = 0; i < ids.length; i++) {
            emit NFTReceived(from, ids[i], values[i]);
        }
        return this.onERC1155BatchReceived.selector;
    }

    /**
     * @dev Override `supportsInterface` to declare support for IERC1155Receiver.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}

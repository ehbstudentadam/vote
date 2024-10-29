// Poll.sol - Poll Smart Contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./AccessControlManager.sol";

contract Poll {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Struct to represent each voting option
    struct VotingOption {
        string description; // Description of the voting option
        uint256 voteCount;  // Count of votes for this option
    }

    // Poll variables
    string public pollTitle;           // Title of the poll
    uint256 public endDate;            // Poll end date (UNIX timestamp)
    bool public isFinalized;           // Poll status: finalized or not
    address public creator;            // Address of the poll creator (Instance)
    VotingOption[] public votingOptions; // Array of voting options

    // Mapping to track each user's votes per option
    mapping(address => mapping(uint256 => uint256)) public votes;

    // Participation restrictions
    uint256 public minAge;               // Minimum age required to participate
    string public location;              // Location restriction for participants
    uint256 public minTokensRequired;    // Minimum tokens required for participation

    // Events
    event VoteCast(address indexed voter, uint256 optionIndex, uint256 amount);
    event PollFinalized(string title, uint256[] results);
    event VotesReset(address user);

    // Modifier to ensure the poll is active (not ended or finalized)
    modifier onlyActivePoll() {
        require(block.timestamp <= endDate, "Poll has ended");
        require(!isFinalized, "Poll is already finalized");
        _;
    }

    /**
     * @dev Modifier to restrict access to functions only for roles.
     */
    modifier onlyRoleFromManager(bytes32 role) {
        require(accessControlManager.hasRoleForContract(role, msg.sender), "Access denied: Incorrect role");
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
        address _accessControlManager
    ) {
        require(_endDate > block.timestamp, "End date must be in the future");
        require(_minAge > 0, "Minimum age must be greater than zero");
        require(_creator != address(0), "Creator address cannot be zero");
        require(_accessControlManager != address(0), "AccessControlManager address cannot be zero");

        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);

        pollTitle = _title;
        endDate = _endDate;
        minAge = _minAge;
        location = _location;
        minTokensRequired = _minTokensRequired;
        creator = _creator;

        // Initialize each voting option
        for (uint256 i = 0; i < _votingOptions.length; i++) {
            votingOptions.push(VotingOption({description: _votingOptions[i], voteCount: 0}));
        }

        // // Grant roles via AccessControlManager
        // accessControlManager.grantRoleToContract(USER_ROLE, address(this));

        // Mark the poll as initially active
        isFinalized = false;
    }

    /**
     * @dev Function for users to cast or update a vote for a specific option.
     * @param user Address of the voter.
     * @param optionIndex The index of the voting option chosen.
     * @param amount The amount of tokens allocated to this vote.
     */
    function castVote(address user, uint256 optionIndex, uint256 amount) 
        external 
        onlyActivePoll 
        onlyRoleFromManager(accessControlManager.USER_ROLE()) 
    {
        require(optionIndex < votingOptions.length, "Invalid voting option");

        // Record the user's vote
        votingOptions[optionIndex].voteCount += amount;
        votes[user][optionIndex] += amount;

        emit VoteCast(user, optionIndex, amount);
    }

    /**
     * @dev Function to reset all votes for a specific user.
     * Removes the user's votes from all options and resets vote counts.
     * @param user Address of the user whose votes are being reset.
     */
    function resetVotes(address user) external onlyRoleFromManager(accessControlManager.USER_ROLE()) {
        for (uint256 i = 0; i < votingOptions.length; i++) {
            uint256 userVotes = votes[user][i];
            if (userVotes > 0) {
                votingOptions[i].voteCount -= userVotes; // Decrease the vote count
                votes[user][i] = 0; // Reset the user's vote for this option
            }
        }
        emit VotesReset(user);
    }

    /**
     * @dev Function to retrieve all votes cast by a specific user.
     * @param user Address of the user whose votes are being retrieved.
     * @return optionIndexes Array of option indexes voted by the user.
     * @return amounts Array of token amounts voted by the user for each option.
     */
    function getUserVotes(address user) 
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
    function getEligibility() external view returns (uint256, string memory, uint256) {
        return (minAge, location, minTokensRequired);
    }

    /**
     * @dev Function to finalize the poll after the end date has passed.
     * This can be called by anyone and ensures results are immutable after finalization.
     */
    function finalizePoll() public {
        require(block.timestamp > endDate, "Poll is still active");
        require(!isFinalized, "Poll is already finalized");

        isFinalized = true;
        uint256[] memory results = new uint256[](votingOptions.length);

        for (uint256 i = 0; i < votingOptions.length; i++) {
            results[i] = votingOptions[i].voteCount;
        }
        emit PollFinalized(pollTitle, results);
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
}

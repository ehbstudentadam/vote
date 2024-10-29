// Voting.sol - Updated Voting Contract with Additional Commentary
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./TokenDistribution.sol";
import "./Poll.sol";

contract Voting {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    TokenDistribution public tokenDistribution;

    struct VoteOptions {
        uint256[] optionIndexes;
        uint256[] amounts;
    }

    struct PermitSignature {
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // Event to notify when a vote is cast
    event VoteCast(
        address indexed voter,
        uint256[] optionIndexes,
        uint256[] amounts
    );

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
     * @dev Constructor to initialize the voting contract with the admin and token distribution.
     * The ADMIN_ROLE is automatically granted to the deployer.
     * @param _tokenDistribution The Token Distribution contract address.
     * @param _accessControlManager Address of the centralized AccessControlManager.
     */
    constructor(address _tokenDistribution, address _accessControlManager) {
        require(
            _tokenDistribution != address(0),
            "Invalid token distribution address"
        );

        // Initialize the token distribution contract
        tokenDistribution = TokenDistribution(_tokenDistribution);
        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
    }

    /**
     * @dev Casts votes for multiple options in a specified poll. This function allows
     *      eligible users to vote on poll options using a token-based voting system.
     *      Users authorize token transfers with EIP-2612 permits to avoid additional gas fees.
     *
     * @param pollAddress The address of the poll contract where the user is voting.
     * @param voteOptions A struct containing the indexes of voting options and corresponding token amounts.
     * @param userPermit A struct containing the EIP-2612 permit signature for user-to-contract token transfer.
     * @param returnPermit A struct containing the EIP-2612 permit signature for contract-to-user token return if the user has already voted.
     */
    function castVotes(
        address pollAddress,
        VoteOptions memory voteOptions, // Struct for option indexes and token amounts per option
        PermitSignature memory userPermit, // Struct for user's EIP-2612 signature for user-to-contract token approval
        PermitSignature memory returnPermit // Struct for user's EIP-2612 signature for returning prior tokens to user
    ) external onlyRoleFromManager(accessControlManager.USER_ROLE()) {
        // Validate input parameters
        require(pollAddress != address(0), "Invalid poll address");
        require(
            voteOptions.optionIndexes.length == voteOptions.amounts.length,
            "Mismatched indexes and amounts"
        );
        require(userPermit.deadline > block.timestamp, "User permit expired");
        require(
            returnPermit.deadline > block.timestamp,
            "Return permit expired"
        );

        // Instantiate the Poll contract and confirm eligibility to vote
        Poll poll = Poll(pollAddress);

        // Verify poll state - check if it's active and not finalized
        require(block.timestamp <= poll.endDate(), "Poll ended");
        require(!poll.isFinalized(), "Poll finalized");

        // Handle previous votes if the user has already voted
        (
            uint256[] memory existingOptionIndexes,
            uint256[] memory existingAmounts
        ) = poll.getUserVotes(msg.sender);
        uint256 totalPreviousTokens = 0;
        if (existingOptionIndexes.length > 0) {
            // Reset previous votes in Poll contract
            poll.resetVotes(msg.sender);

            // Sum previous token amounts for refunding purposes
            for (uint256 i = 0; i < existingAmounts.length; i++) {
                totalPreviousTokens += existingAmounts[i];
            }

            // Use the returnPermit to authorize transfer of previous tokens back to user
            if (totalPreviousTokens > 0) {
                tokenDistribution.permit(
                    pollAddress,
                    msg.sender,
                    totalPreviousTokens,
                    returnPermit.deadline,
                    returnPermit.v,
                    returnPermit.r,
                    returnPermit.s
                );
                tokenDistribution.transferFrom(
                    pollAddress,
                    msg.sender,
                    totalPreviousTokens
                );
            }
        }

        // Calculate total tokens required for the new votes
        uint256 totalTokens = 0;
        for (uint256 i = 0; i < voteOptions.amounts.length; i++) {
            require(voteOptions.amounts[i] > 0, "Amount must be >0");
            totalTokens += voteOptions.amounts[i];
        }
        require(totalTokens >= poll.minTokensRequired(), "Insufficient tokens");

        // Use userPermit to authorize contract to spend user's tokens for voting
        tokenDistribution.permit(
            msg.sender,
            address(this),
            totalTokens,
            userPermit.deadline,
            userPermit.v,
            userPermit.r,
            userPermit.s
        );
        tokenDistribution.transferFrom(msg.sender, pollAddress, totalTokens);

        // Submit each vote in the Poll contract
        for (uint256 i = 0; i < voteOptions.optionIndexes.length; i++) {
            uint256 optionIndex = voteOptions.optionIndexes[i];
            uint256 amount = voteOptions.amounts[i];
            require(
                optionIndex < poll.getTotalOptions(),
                "Invalid option index"
            );

            // Record the vote in the Poll contract
            poll.castVote(msg.sender, optionIndex, amount);
        }

        // Check if the poll has ended and is not finalized, then call finalizePoll()
        if (block.timestamp > poll.endDate() && !poll.isFinalized()) {
            try poll.finalizePoll() {
                // Finalize poll successfully if eligible
            } catch {
                // Handle cases where finalizePoll might still fail, if needed
            }
        }

        // Emit an event to record that the votes have been cast
        emit VoteCast(
            msg.sender,
            voteOptions.optionIndexes,
            voteOptions.amounts
        );
    }

}

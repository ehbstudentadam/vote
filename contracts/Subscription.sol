// Subscription.sol - Subscription Contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./AccessControlManager.sol";
import "./TokenDistribution.sol";
import "./Poll.sol";

contract Subscription {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Reference to the Token Distribution contract
    TokenDistribution public tokenDistribution;

    // Event emitted when a user successfully subscribes to a poll
    event UserSubscribed(
        address indexed user,
        address poll,
        uint256 tokenAmount
    );

    // Struct to store eligibility criteria for each poll
    struct EligibilityCriteria {
        uint256 minAge;
        string location;
        uint256 minTokensRequired;
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
     * @dev Constructor for Subscription contract.
     * Initializes roles and connects the Token Distribution contract.
     * The ADMIN_ROLE is granted to the deployer automatically.
     * @param _tokenDistribution Address of the TokenDistribution contract.
     * @param _accessControlManager Address of the centralized AccessControlManager.
     */
    constructor(address _tokenDistribution, address _accessControlManager) {
        require(
            _tokenDistribution != address(0),
            "Invalid token distribution address"
        );
        tokenDistribution = TokenDistribution(_tokenDistribution);

        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
    }

    /**
     * @dev Subscribes a user to a poll if they meet eligibility requirements from the poll itself.
     * @param poll The address of the poll.
     * @param user The address of the user to subscribe.
     * @param userAge The age of the user.
     * @param userLocation The location of the user.
     * @param userTokensAvailable The number of tokens the user has available.
     */
    function subscribeUser(
        address poll,
        address user,
        uint256 userAge,
        string memory userLocation,
        uint256 userTokensAvailable
    ) external onlyRoleFromManager(accessControlManager.USER_ROLE()) {
        // Get eligibility requirements from the Poll contract
        Poll pollContract = Poll(poll);
        (
            uint256 minAge,
            string memory requiredLocation,
            uint256 minTokensRequired
        ) = pollContract.getEligibility();

        // Check eligibility
        require(userAge >= minAge, "User does not meet age requirement");
        require(
            keccak256(abi.encodePacked(userLocation)) ==
                keccak256(abi.encodePacked(requiredLocation)),
            "User location does not match"
        );
        require(
            userTokensAvailable >= minTokensRequired,
            "Not enough tokens to participate"
        );

        uint256 tokenAmount = minTokensRequired;
        tokenDistribution.distributeTokens(user, poll, tokenAmount);

        emit UserSubscribed(user, poll, tokenAmount);
    }
}

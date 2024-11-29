// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./AccessControlManager.sol";
import "./TokenDistribution.sol";
import "./Poll.sol";
import "./UserRegistration.sol";
import "hardhat/console.sol";

contract Subscription {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Reference to the Token Distribution contract
    TokenDistribution public tokenDistribution;

    // Reference to the User Registration contract
    UserRegistration public userRegistration;

    // Event emitted when a user successfully subscribes to a poll
    event UserSubscribed(
        address indexed user,
        address poll,
        uint256 tokenAmount
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
     * @dev Constructor for Subscription contract.
     * Initializes roles and connects the Token Distribution and User Registration contracts.
     * The ADMIN_ROLE is granted to the deployer automatically.
     * @param _tokenDistribution Address of the TokenDistribution contract.
     * @param _userRegistration Address of the UserRegistration contract.
     * @param _accessControlManager Address of the centralized AccessControlManager.
     */
    constructor(
        address _tokenDistribution,
        address _userRegistration,
        address _accessControlManager
    ) {
        require(
            _tokenDistribution != address(0),
            "Invalid token distribution address"
        );
        require(
            _userRegistration != address(0),
            "Invalid user registration address"
        );
        tokenDistribution = TokenDistribution(_tokenDistribution);
        userRegistration = UserRegistration(_userRegistration);

        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
    }

    /**
     * @dev Subscribes a user to a poll if they meet eligibility requirements from the poll itself.
     * @param poll The address of the poll.
     * @param user The address of the user to subscribe.
     */
    function subscribeUser(
        address poll,
        address user
    ) external onlyRoleFromManager(accessControlManager.USER_ROLE()) {
        // Check eligibility
        require(
            checkEligibility(poll, user),
            "User does not meet eligibility requirements"
        );

        // Get the minimum tokens required for the poll
        Poll pollContract = Poll(poll);
        (, , uint256 minTokensRequired) = pollContract.getEligibility();

        // Distribute tokens for the subscription
        tokenDistribution.distributeTokens(user, poll, minTokensRequired);

        emit UserSubscribed(user, poll, minTokensRequired);
    }

    /**
     * @dev Checks if a user meets the eligibility requirements for a specific poll.
     * @param poll The address of the poll.
     * @param user The address of the user.
     * @return bool Returns true if the user meets all eligibility criteria, false otherwise.
     */
    function checkEligibility(
        address poll,
        address user
    ) public view returns (bool) {
        // Get eligibility requirements from the Poll contract
        Poll pollContract = Poll(poll);
        (
            uint256 minAge,
            ,
            uint256 minTokensRequired
        ) = pollContract.getEligibility();

        console.log("poll minAge:", minAge);
        console.log("poll minTokensRequired:", minTokensRequired);

        // Get user data from the UserRegistration contract
        (
            ,
            uint256 age,
            ,
            bool isActive
        ) = userRegistration.users(user);

        // Ensure the user is active
        if (!isActive) {
            console.log("not acitve");
            return false;
        }

        // Check age requirement
        if (age < minAge) {
            console.log("age < minAge");
            return false;
        }

        // Check location requirement
        // if (
        //     keccak256(abi.encodePacked(location)) !=
        //     keccak256(abi.encodePacked(requiredLocation))
        // ) {
        //     return false;
        // }

        // Check token requirement
        // uint256 userTokensAvailable = msg.sender.balance;
        // if (userTokensAvailable < minTokensRequired) {
        //     return false;
        // }

        return true;
    }
}

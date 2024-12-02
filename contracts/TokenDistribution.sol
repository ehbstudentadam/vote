// TokenDistribution.sol - Token Distribution Contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./AccessControlManager.sol";

contract TokenDistribution is ERC1155 {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Mapping to track the total tokens distributed per poll
    mapping(address => uint256) public pollTotalSupply;

    // Events to emit on important actions
    event TokensMinted(address indexed poll, uint256 pollId, uint256 amount);
    event TokensDistributed(
        address indexed poll,
        address indexed user,
        uint256 amount
    );
    event TokensBurned(address indexed poll, uint256 amount);

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
     * @dev Constructor to initialize the token contract.
     * Sets up roles and initializes the token name, symbol, and permit functionality.
     * @param _accessControlManager Address of the centralized AccessControlManager.
     */
    constructor(address _accessControlManager) ERC1155("") {
        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
    }

    function mintNFTsForPoll(
        address poll,
        uint256 amount
    )
        external
        onlyRoleFromManager(accessControlManager.DISTRIBUTOR_ROLE())
        returns (uint256)
    {
        require(poll != address(0), "Invalid poll address");
        require(amount > 0, "Total supply must be greater than zero");

        // Generate a unique pollId
        uint256 pollId = uint256(uint160(poll));

        // Mint the NFTs to the poll
        _mint(poll, pollId, amount, "");

        // Emit event for minting
        emit TokensMinted(poll, pollId, amount);

        return pollId;
    }

    /**
     * @dev Distribute tokens to a user for a specific poll. Called during user registration.
     * Only callable by entities with the DISTRIBUTOR_ROLE.
     * @param user The address of the user receiving the tokens.
     * @param poll The address of the poll contract.
     * @param amount The number of tokens to transfer to the user.
     */
    function distributeTokens(
        address user,
        address poll,
        uint256 amount
    ) external onlyRoleFromManager(accessControlManager.DISTRIBUTOR_ROLE()) {
        require(user != address(0), "Invalid user address");
        require(poll != address(0), "Invalid poll address");
        require(amount > 0, "Token amount must be greater than zero");

        // Generate the pollId from the poll address
        uint256 pollId = uint256(uint160(poll));

        // Safely transfer the tokens from the poll's balance to the user
        _safeTransferFrom(poll, user, pollId, amount, "");

        emit TokensDistributed(poll, user, amount); // Emit event for token distribution
    }

    /**
     * @dev Retrieve the total token supply allocated to a specific poll.
     * @param poll The address of the poll contract.
     * @return The total number of tokens minted for the poll.
     */
    function getTotalSupplyForPoll(
        address poll
    ) external view returns (uint256) {
        return pollTotalSupply[poll]; // Return total supply minted for the poll
    }
}

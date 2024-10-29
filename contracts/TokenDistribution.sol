// TokenDistribution.sol - Token Distribution Contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; // Import burnable extension for token burning capability
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol"; // Import permit extension for EIP-2612 permit functionality
import "./AccessControlManager.sol";

contract TokenDistribution is ERC20, ERC20Burnable, ERC20Permit {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Mapping to track the total tokens distributed per poll
    mapping(address => uint256) public pollTotalSupply;

    // Events to emit on important actions
    event TokensMinted(address indexed poll, uint256 amount);
    event TokensDistributed(address indexed poll, address indexed user, uint256 amount);
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
    constructor(address _accessControlManager) ERC20("VotingToken", "VOTE") ERC20Permit("VotingToken") {
        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
    }

    /**
     * @dev Mint tokens for a specific poll. Called by PollFactory to allocate tokens for each poll.
     * Only callable by entities with the DISTRIBUTOR_ROLE.
     * @param poll The address of the poll contract receiving minted tokens.
     * @param amount The amount of tokens to mint for the poll.
     */
    function mintTokensForPoll(address poll, uint256 amount) external onlyRoleFromManager(accessControlManager.DISTRIBUTOR_ROLE()) {
        require(poll != address(0), "Invalid poll address");
        require(amount > 0, "Amount must be greater than zero");

        _mint(poll, amount); // Mint tokens to the poll contract's address
        pollTotalSupply[poll] = amount; // Track total supply for the poll

        emit TokensMinted(poll, amount); // Emit event for token minting
    }

    /**
     * @dev Distribute tokens to a user for a specific poll. Called during user registration.
     * Only callable by entities with the DISTRIBUTOR_ROLE.
     * @param user The address of the user receiving the tokens.
     * @param poll The address of the poll contract.
     * @param amount The number of tokens to transfer to the user.
     */
    function distributeTokens(address user, address poll, uint256 amount) external onlyRoleFromManager(accessControlManager.DISTRIBUTOR_ROLE()) {
        require(user != address(0), "Invalid user address");
        require(poll != address(0), "Invalid poll address");
        require(amount > 0, "Token amount must be greater than zero");

        // Transfer tokens from the poll contract's balance to the user
        _transfer(poll, user, amount);

        emit TokensDistributed(poll, user, amount); // Emit event for token distribution
    }

    /**
     * @dev Burn any remaining tokens in the poll’s balance after poll finalization.
     * Only callable by entities with the DISTRIBUTOR_ROLE.
     * @param poll The address of the poll contract whose tokens are to be burned.
     */
    function burnRemainingTokens(address poll) external onlyRoleFromManager(accessControlManager.DISTRIBUTOR_ROLE()) {
        uint256 remainingTokens = balanceOf(poll); // Get the balance of the poll contract
        require(remainingTokens > 0, "No tokens to burn");

        _burn(poll, remainingTokens); // Burn the remaining tokens
        emit TokensBurned(poll, remainingTokens); // Emit event for tokens burned
    }

    /**
     * @dev Retrieve the total token supply allocated to a specific poll.
     * @param poll The address of the poll contract.
     * @return The total number of tokens minted for the poll.
     */
    function getTotalSupplyForPoll(address poll) external view returns (uint256) {
        return pollTotalSupply[poll]; // Return total supply minted for the poll
    }
}

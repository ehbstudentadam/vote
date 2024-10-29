// TokenDistribution.sol - Updated to include burnable tokens
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; // Import burnable extension

contract TokenDistribution is AccessControl, ERC20, ERC20Burnable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // Mapping to track the number of tokens distributed per poll
    mapping(uint256 => mapping(address => uint256)) public pollTokens;

    event TokensDistributed(
        uint256 pollId,
        address indexed user,
        uint256 amount
    );
    event TokensRefunded(uint256 pollId, address indexed user, uint256 amount);

    constructor(address admin) ERC20("VotingToken", "VOTE") {
        _grantRole(ADMIN_ROLE, admin);
    }

    // Function to mint tokens for each poll
    function mintTokensForPoll(
        address pollCreator,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        _mint(pollCreator, amount); // Mint the total supply of tokens to the poll creator
    }

    // Function to distribute tokens for a poll to a user
    function distributeTokens(
        address user,
        uint256 pollId,
        uint256 amount
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(amount > 0, "Token amount must be greater than zero");
        _transfer(msg.sender, user, amount); // Transfer tokens to the user
        pollTokens[pollId][user] += amount;
        emit TokensDistributed(pollId, user, amount);
    }

    // Function for the user to use tokens for voting in a poll
    function useTokens(uint256 pollId, uint256 amount) external {
        require(
            pollTokens[pollId][msg.sender] >= amount,
            "Not enough tokens allocated for voting"
        );
        pollTokens[pollId][msg.sender] -= amount;
    }

    // Function to refund unused tokens when modifying votes
    function refundTokens(uint256 pollId, uint256 amount) external {
        pollTokens[pollId][msg.sender] += amount;
        emit TokensRefunded(pollId, msg.sender, amount);
    }

    // Function to get the token balance for a user in a specific poll
    function getTokenBalance(
        uint256 pollId,
        address user
    ) external view returns (uint256) {
        return pollTokens[pollId][user];
    }

    // Add a distributor (who can distribute tokens)
    function addDistributor(address distributor) external onlyRole(ADMIN_ROLE) {
        grantRole(DISTRIBUTOR_ROLE, distributor);
    }

    // Revoke a distributor (remove token distribution rights)
    function revokeDistributor(
        address distributor
    ) external onlyRole(ADMIN_ROLE) {
        revokeRole(DISTRIBUTOR_ROLE, distributor);
    }
}

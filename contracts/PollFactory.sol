// PollFactory.sol - Poll Factory Contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./Poll.sol";
import "./TokenDistribution.sol";
import "./AccessControlManager.sol";

contract PollFactory {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Reference to the Token Distribution contract
    TokenDistribution public tokenDistribution;

    // Event emitted when a new poll is created
    event PollCreated(
        address indexed pollAddress,
        address indexed creator,
        string title,
        uint256 endDate,
        uint256 pollId
    );

    // Array to track all polls created by the factory
    address[] public allPolls;

    // Mapping to track polls created by each instance
    mapping(address => address[]) public pollsByInstance;

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
     * @dev Constructor for PollFactory.
     * Initializes the token distribution contract and assigns the ADMIN_ROLE to the deployer.
     * @param _tokenDistribution Address of the TokenDistribution contract.
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
     * @dev Function for registered instances to create a new poll and mint tokens.
     * This function deploys a new Poll contract and allocates the required NFTs.
     * @param title The title of the poll.
     * @param options An array of options available for voting in the poll.
     * @param endDate The end date of the poll (as a UNIX timestamp).
     * @param minAge The minimum age required to vote in the poll.
     * @param location The location restriction for participation in the poll.
     * @param minTokensRequired The minimum number of tokens required for participation.
     * @param totalTokenSupply The total token supply to be minted for this specific poll.
     * @return The address of the newly created poll contract.
     */
    function createPoll(
        string memory title,
        string[] memory options,
        uint256 endDate,
        uint256 minAge,
        string memory location,
        uint256 minTokensRequired,
        uint256 totalTokenSupply
    )
        external
        onlyRoleFromManager(accessControlManager.INSTANCE_ROLE())
        returns (address)
    {
        require(bytes(title).length > 0, "Poll title is required");
        require(endDate > block.timestamp, "End date must be in the future");
        require(
            totalTokenSupply > 0,
            "Total token supply must be greater than zero"
        );

        // Ensure the PollFactory has the DISTRIBUTOR_ROLE to mint tokens
        require(
            accessControlManager.hasRole(
                accessControlManager.DISTRIBUTOR_ROLE(),
                address(this)
            ),
            "PollFactory: Missing DISTRIBUTOR_ROLE"
        );

        // Deploy a new Poll contract with the provided parameters
        Poll newPoll = new Poll(
            title,
            options,
            endDate,
            minAge,
            location,
            minTokensRequired,
            msg.sender, // Creator of the poll (an instance)
            address(accessControlManager),
            address(tokenDistribution)
        );

        address pollAddress = address(newPoll);

        // Call TokenDistribution to mint NFTs for the poll
        uint256 pollId = tokenDistribution.mintNFTsForPoll(
            pollAddress,
            totalTokenSupply
        );

        // Track the newly created poll in the allPolls array
        allPolls.push(pollAddress);

        // Track the poll by the instance address
        pollsByInstance[msg.sender].push(pollAddress);

        // Emit the PollCreated event to log the poll creation
        emit PollCreated(pollAddress, msg.sender, title, endDate, pollId);

        // Return the address of the new poll contract
        return pollAddress;
    }

    /**
     * @dev Function to retrieve the total number of polls created by the factory.
     * Useful for tracking purposes.
     * @return The total number of polls created.
     */
    function getPollCount() external view returns (uint256) {
        return allPolls.length;
    }

    /**
     * @dev Function to retrieve all polls created by a specific instance.
     * @param instance The address of the instance to query.
     * @return An array of poll addresses created by the instance.
     */
    function getPollsByInstance(
        address instance
    ) external view returns (address[] memory) {
        return pollsByInstance[instance];
    }
}

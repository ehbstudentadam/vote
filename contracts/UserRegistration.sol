// UserRegistration.sol - User Registration Smart Contract Hardhat
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "./AccessControlManager.sol";
import "hardhat/console.sol";

contract UserRegistration {
    // Centralized access control contract reference
    AccessControlManager public accessControlManager;

    // Struct to hold attributes for each user
    struct User {
        string name;
        uint256 age;
        string email;
        bool isActive;
    }

    // Struct to hold attributes for each instance (poll creator)
    struct Instance {
        string organization;
        string contact;
        bool isActive;
    }

    // Mapping to store user data by address
    mapping(address => User) public users;

    // Mapping to store instance data by address
    mapping(address => Instance) public instances;

    // Events for user and instance registration
    event UserRegistered(
        address indexed user,
        string name,
        uint256 age,
        string email
    );
    event InstanceRegistered(
        address indexed instance,
        string organization,
        string contact
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
     * @dev Constructor sets up the initial roles.
     * The ADMIN_ROLE is granted to the deployer, who is given authority to manage users and instances.
     */
    constructor(address _accessControlManager) {
        // Set the centralized access control manager
        accessControlManager = AccessControlManager(_accessControlManager);
    }

    /**
     * @dev Registers a new user by assigning USER_ROLE and storing user information.
     * Can be called directly by a new user from the frontend.
     * @param user The address of the user to register.
     * @param name The user's name.
     * @param age The user's age.
     * @param email The user's email address.
     */
    function registerUser(
        address user,
        string memory name,
        uint256 age,
        string memory email
    ) external {
        require(!accessControlManager.hasRoleForContract(accessControlManager.USER_ROLE(), msg.sender), "User already registered");
        require(age > 0, "Age must be positive");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(email).length > 0, "Email cannot be empty");

        // Assign USER_ROLE to the user
        accessControlManager.grantRoleToWallet(accessControlManager.USER_ROLE(), user);

        // Store user information in the mapping
        users[user] = User(name, age, email, true);
        emit UserRegistered(user, name, age, email);
    }

    /**
     * @dev Registers a new instance with specified details.
     * @param instance The address of the instance to register.
     * @param organization The organization's name.
     * @param contact The contact email for the organization.
     */
    function registerInstance(
        address instance,
        string memory organization,
        string memory contact
    ) external {
        require(!accessControlManager.hasRoleForContract(accessControlManager.INSTANCE_ROLE(), msg.sender), "Instance already registered");
        require(bytes(organization).length > 0, "Organization cannot be empty");
        require(bytes(contact).length > 0, "Contact cannot be empty");

        // Assign INSTANCE_ROLE to the instance
        accessControlManager.grantRoleToWallet(accessControlManager.INSTANCE_ROLE(), instance);

        // Store instance information in the mapping
        instances[instance] = Instance(organization, contact, true);
        console.log('userregistration contract');
        emit InstanceRegistered(instance, organization, contact);
    }

    /**
     * @dev Checks if an address is a registered user.
     * @param account The address to check.
     * @return bool True if the address is a registered user, otherwise false.
     */
    function isUser(address account) external view returns (bool) {
        return accessControlManager.hasRoleForContract(accessControlManager.USER_ROLE(), account) && users[account].isActive;
    }

    /**
     * @dev Checks if an address is a registered instance (poll creator).
     * @param account The address to check.
     * @return bool True if the address is a registered instance, otherwise false.
     */
    function isInstance(address account) external view returns (bool) {
        return accessControlManager.hasRoleForContract(accessControlManager.INSTANCE_ROLE(), account) && instances[account].isActive;
    }

    /**
     * @dev Revokes a user’s access by removing USER_ROLE and marking them inactive. 
     * Only callable by ADMIN_ROLE.
     * @param user The address of the user to revoke.
     */
    function revokeUser(address user) external onlyRoleFromManager(accessControlManager.ADMIN_ROLE()) {
        require(accessControlManager.hasRoleForContract(accessControlManager.USER_ROLE(), user), "Address is not a registered user");

        // Remove role and mark user as inactive
        accessControlManager.revokeRole(accessControlManager.USER_ROLE(), user);
        users[user].isActive = false;
    }

    /**
     * @dev Revokes an instance's access by removing INSTANCE_ROLE and marking it inactive.
     * Only callable by ADMIN_ROLE.
     * @param instance The address of the instance to revoke.
     */
    function revokeInstance(address instance) external onlyRoleFromManager(accessControlManager.ADMIN_ROLE()) {
        require(accessControlManager.hasRoleForContract(accessControlManager.INSTANCE_ROLE(), instance), "Address is not a registered instance");

        // Remove role and mark instance as inactive
        accessControlManager.revokeRole(accessControlManager.INSTANCE_ROLE(), instance);
        instances[instance].isActive = false;
    }
}

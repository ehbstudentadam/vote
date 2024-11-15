// AccessControlManager.sol - central access control contract
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

contract AccessControlManager is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
    bytes32 public constant INSTANCE_ROLE = keccak256("INSTANCE_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    constructor() {
        // Set the admin role hierarchy
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(USER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(INSTANCE_ROLE, ADMIN_ROLE);
        _setRoleAdmin(DISTRIBUTOR_ROLE, ADMIN_ROLE);

        // Grant deployer the DEFAULT_ADMIN_ROLE and ADMIN_ROLE
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Function to assign a role to an address.
     * Only INSTANCE_ROLE and USER_ROLE can be assigned.
     * It will only assign the role if the user has no role assigned yet.
     * If the user has the same role, it will skip the grantRole operation.
     * If the user has a different role, it will revert with an error.
     */
    function grantRoleToWallet(
        bytes32 role,
        address contractAddress
    ) external {
        // Ensure only INSTANCE_ROLE or USER_ROLE can be assigned
        require(
            role == INSTANCE_ROLE || role == USER_ROLE,
            "Only INSTANCE_ROLE and USER_ROLE can be assigned"
        );

        // Check if the user already has a role
        bool hasInstanceRole = hasRole(INSTANCE_ROLE, contractAddress);
        bool hasAdminRole = hasRole(ADMIN_ROLE, contractAddress);
        bool hasUserRole = hasRole(USER_ROLE, contractAddress);

        console.log('hasInstanceRole', hasInstanceRole);
        console.log('hasAdminRole', hasAdminRole);
        console.log('hasUserRole', hasUserRole);

        // Check if the user has no role assigned yet
        if (!hasInstanceRole && !hasAdminRole && !hasUserRole) {
            grantRole(role, contractAddress);
        }
        // If the user has a different role, perform error handling
        else {
            revert("User already has a different role assigned");
        }
    }

    /**
     * @dev Function to assign a role to an address, restricted to ADMIN_ROLE.
     */
    function grantRoleToContract(bytes32 role, address contractAddress) external onlyRole(ADMIN_ROLE) {
        grantRole(role, contractAddress);
    }


    /**
     * @dev Function to check if a contract or address has a specific role.
     */
    function hasRoleForContract(
        bytes32 role,
        address contractAddress
    ) external view returns (bool) {
        return hasRole(role, contractAddress);
    }
}

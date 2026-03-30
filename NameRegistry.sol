// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ARC Name Registry
/// @notice Registers human-readable names to ARC addresses (ENS-like)
contract NameRegistry {
    // name -> owner address
    mapping(string => address) private _nameToOwner;
    // owner -> list of names
    mapping(address => string[]) private _ownerToNames;
    // name -> index in owner's list (1-based, 0 = not registered)
    mapping(string => uint256) private _nameIndex;

    event NameRegistered(string indexed name, address indexed owner, uint256 timestamp);

    error NameTooShort();
    error NameTooLong();
    error NameAlreadyTaken(address currentOwner);
    error InvalidCharacter();

    /// @notice Register a name to msg.sender. Name must be 3-32 chars, lowercase alphanumeric + hyphens.
    function register(string calldata name) external {
        bytes memory b = bytes(name);

        if (b.length < 3) revert NameTooShort();
        if (b.length > 32) revert NameTooLong();

        // validate: only lowercase a-z, 0-9, hyphen
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool valid = (c >= 0x61 && c <= 0x7A) || // a-z
                         (c >= 0x30 && c <= 0x39) || // 0-9
                         (c == 0x2D);                // hyphen
            if (!valid) revert InvalidCharacter();
        }

        if (_nameToOwner[name] != address(0)) {
            revert NameAlreadyTaken(_nameToOwner[name]);
        }

        _nameToOwner[name] = msg.sender;
        _ownerToNames[msg.sender].push(name);
        _nameIndex[name] = _ownerToNames[msg.sender].length; // 1-based

        emit NameRegistered(name, msg.sender, block.timestamp);
    }

    /// @notice Resolve a name to its owner address. Returns address(0) if not registered.
    function resolve(string calldata name) external view returns (address) {
        return _nameToOwner[name];
    }

    /// @notice Check if a name is available for registration.
    function isAvailable(string calldata name) external view returns (bool) {
        return _nameToOwner[name] == address(0);
    }

    /// @notice Get all names registered by an address.
    function getNames(address owner) external view returns (string[] memory) {
        return _ownerToNames[owner];
    }

    /// @notice Reverse resolve: get the primary name for an address (first registered).
    function reverseResolve(address addr) external view returns (string memory) {
        string[] memory names = _ownerToNames[addr];
        if (names.length == 0) return "";
        return names[0];
    }

    /// @notice Get total number of names registered by an address.
    function nameCount(address owner) external view returns (uint256) {
        return _ownerToNames[owner].length;
    }
}

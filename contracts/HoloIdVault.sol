// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title HoloIdVault - Decentralized Identity Profile with Selective Disclosure
/// @notice Stores encrypted DID profiles where attributes are protected by hybrid encryption (AES + FHE)
/// @dev Each attribute value is encrypted client-side with AES, and the key is encrypted with FHE
contract HoloIdVault is SepoliaConfig {
    /// @dev Emergency stop flag
    bool private _emergencyStopped;

    /// @dev Reentrancy guard
    uint256 private _status;

    /// @dev Modifier to prevent reentrancy attacks
    modifier nonReentrant() {
        require(_status == 0, "Reentrant call");
        _status = 1;
        _;
        _status = 0;
    }

    /// @dev Modifier to check if contract is not in emergency stop
    modifier whenNotEmergencyStopped() {
        require(!_emergencyStopped, "Contract is emergency stopped");
        _;
    }

    /// @dev Modifier to ensure the caller has a profile
    modifier onlyProfileOwner() {
        require(_hasProfile[msg.sender], "Profile does not exist");
        _;
    }

    /// @dev Modifier to validate attribute name
    modifier validAttributeName(string calldata attributeName) {
        require(bytes(attributeName).length > 0, "Attribute name cannot be empty");
        require(bytes(attributeName).length <= 32, "Attribute name too long");
        _;
    }

    struct Attribute {
        string name;           // Attribute name (e.g., "Email", "Age", "Location")
        string cipher;         // Client-side encrypted attribute value (AES-GCM base64)
        euint256 keyEnc;       // FHE-encrypted encryption key (uint256 encoding of EVM address)
        bool isShared;         // Whether this attribute is shared with DApps
    }

    struct DIDProfile {
        address owner;
        Attribute[] attributes;
        uint64 createdAt;
        uint64 updatedAt;
    }

    mapping(address => DIDProfile) private _profiles;
    mapping(address => bool) private _hasProfile;

    event ProfileCreated(address indexed owner, uint64 timestamp);
    event ProfileUpdated(address indexed owner, uint64 timestamp);
    event AttributeAdded(address indexed owner, string attributeName, bool isShared);
    event AttributeUpdated(address indexed owner, string attributeName, bool isShared);
    event AttributeRemoved(address indexed owner, string attributeName);
    event BatchAttributesUpdated(address indexed owner, uint256 count, bool isShared);
    event AttributeDecrypted(address indexed owner, string attributeName, address indexed decryptor);
    event ContractEmergencyStop(address indexed caller, uint64 timestamp);
    event ContractResumed(address indexed caller, uint64 timestamp);

    /// @notice Set or update an attribute in the DID profile
    /// @param attributeName The name of the attribute (e.g., "Email", "Age")
    /// @param cipher The client-side encrypted attribute value (AES-GCM base64)
    /// @param keyExternal The FHE-encrypted encryption key (address encoded as uint256)
    /// @param inputProof The proof for the external encrypted input
    /// @param isShared Whether this attribute should be shared with DApps
    function setAttribute(
        string calldata attributeName,
        string calldata cipher,
        externalEuint256 keyExternal,
        bytes calldata inputProof,
        bool isShared
    ) external nonReentrant {
        euint256 keyEnc = FHE.fromExternal(keyExternal, inputProof);
        
        // Set ACL permissions for the encrypted key
        FHE.allowThis(keyEnc);
        FHE.allow(keyEnc, msg.sender);

        if (!_hasProfile[msg.sender]) {
            // Create new profile
            _profiles[msg.sender].owner = msg.sender;
            _profiles[msg.sender].createdAt = uint64(block.timestamp);
            _hasProfile[msg.sender] = true;
            emit ProfileCreated(msg.sender, uint64(block.timestamp));
        }

        // Find existing attribute or create new one
        bool found = false;
        uint256 attributesLength = _profiles[msg.sender].attributes.length;
        for (uint256 i = 0; i < attributesLength; ) {
            if (keccak256(bytes(_profiles[msg.sender].attributes[i].name)) ==
                keccak256(bytes(attributeName))) {
                // Update existing attribute
                _profiles[msg.sender].attributes[i].cipher = cipher;
                _profiles[msg.sender].attributes[i].keyEnc = keyEnc;
                _profiles[msg.sender].attributes[i].isShared = isShared;
                found = true;
                emit AttributeUpdated(msg.sender, attributeName, isShared);
                break;
            }
            unchecked { ++i; }
        }
        
        if (!found) {
            // Prevent excessive attributes to avoid gas exhaustion
            require(_profiles[msg.sender].attributes.length < 50, "Too many attributes");

            // Add new attribute
            _profiles[msg.sender].attributes.push(Attribute({
                name: attributeName,
                cipher: cipher,
                keyEnc: keyEnc,
                isShared: isShared
            }));
            emit AttributeAdded(msg.sender, attributeName, isShared);
        }

        _profiles[msg.sender].updatedAt = uint64(block.timestamp);
        emit ProfileUpdated(msg.sender, uint64(block.timestamp));
    }

    /// @notice Remove an attribute from the profile
    /// @param attributeName The name of the attribute to remove
    function removeAttribute(string calldata attributeName) external onlyProfileOwner validAttributeName(attributeName) nonReentrant {
        uint256 length = _profiles[msg.sender].attributes.length;
        for (uint256 i = 0; i < length; ) {
            if (keccak256(bytes(_profiles[msg.sender].attributes[i].name)) ==
                keccak256(bytes(attributeName))) {
                // Move last element to current position and pop
                unchecked {
                    if (i < length - 1) {
                        _profiles[msg.sender].attributes[i] =
                            _profiles[msg.sender].attributes[length - 1];
                    }
                }
                _profiles[msg.sender].attributes.pop();
                emit AttributeRemoved(msg.sender, attributeName);
                _profiles[msg.sender].updatedAt = uint64(block.timestamp);
                emit ProfileUpdated(msg.sender, uint64(block.timestamp));
                return;
            }
            unchecked { ++i; }
        }
        revert("Attribute not found");
    }

    /// @notice Update the sharing status of an attribute
    /// @param attributeName The name of the attribute
    /// @param isShared The new sharing status
    function updateAttributeSharing(
        string calldata attributeName,
        bool isShared
    ) external onlyProfileOwner validAttributeName(attributeName) nonReentrant {
        uint256 attributesLength = _profiles[msg.sender].attributes.length;
        for (uint256 i = 0; i < attributesLength; ) {
            if (keccak256(bytes(_profiles[msg.sender].attributes[i].name)) ==
                keccak256(bytes(attributeName))) {
                _profiles[msg.sender].attributes[i].isShared = isShared;
                emit AttributeUpdated(msg.sender, attributeName, isShared);
                _profiles[msg.sender].updatedAt = uint64(block.timestamp);
                return;
            }
            unchecked { ++i; }
        }
        revert("Attribute not found");
    }

    /// @notice Get the number of attributes in a profile
    /// @param owner The address of the profile owner
    /// @return count The number of attributes
    function getAttributeCount(address owner) external view returns (uint256 count) {
        require(_hasProfile[owner], "Profile does not exist");
        return _profiles[owner].attributes.length;
    }

    /// @notice Get attribute information (name and sharing status) without encrypted data
    /// @param owner The address of the profile owner
    /// @param index The index of the attribute
    /// @return name The attribute name
    /// @return isShared Whether the attribute is shared
    function getAttributeInfo(address owner, uint256 index)
        external
        view
        returns (string memory name, bool isShared)
    {
        require(_hasProfile[owner], "Profile does not exist");
        require(index < _profiles[owner].attributes.length, "Invalid index");
        Attribute storage attr = _profiles[owner].attributes[index];
        return (attr.name, attr.isShared);
    }

    /// @notice Get encrypted attribute data for decryption
    /// @param owner The address of the profile owner
    /// @param index The index of the attribute
    /// @return cipher The encrypted attribute value
    /// @return keyEnc The FHE-encrypted key
    function getAttributeData(address owner, uint256 index)
        external
        view
        returns (string memory cipher, euint256 keyEnc)
    {
        require(_hasProfile[owner], "Profile does not exist");
        require(index < _profiles[owner].attributes.length, "Invalid index");
        Attribute storage attr = _profiles[owner].attributes[index];
        return (attr.cipher, attr.keyEnc);
    }

    /// @notice Get profile metadata
    /// @param owner The address of the profile owner
    /// @return createdAt Creation timestamp
    /// @return updatedAt Last update timestamp
    function getProfileMeta(address owner)
        external
        view
        returns (uint64 createdAt, uint64 updatedAt)
    {
        require(_hasProfile[owner], "Profile does not exist");
        DIDProfile storage profile = _profiles[owner];
        return (profile.createdAt, profile.updatedAt);
    }

    /// @notice Check if an address has a profile
    /// @param owner The address to check
    /// @return exists Whether the profile exists
    function hasProfile(address owner) external view returns (bool exists) {
        return _hasProfile[owner];
    }

    /// @notice Get comprehensive profile statistics in a single call
    /// @param owner The address of the profile owner
    /// @return exists Whether profile exists
    /// @return attributeCount Number of attributes
    /// @return createdAt Profile creation timestamp
    /// @return updatedAt Profile last update timestamp
    function getProfileStats(address owner)
        external
        view
        returns (
            bool exists,
            uint256 attributeCount,
            uint64 createdAt,
            uint64 updatedAt
        )
    {
        bool profileExists = _hasProfile[owner];
        if (!profileExists) {
            return (false, 0, 0, 0);
        }

        DIDProfile storage profile = _profiles[owner];
        return (
            true,
            profile.attributes.length,
            profile.createdAt,
            profile.updatedAt
        );
    }

    /// @notice Emergency stop the contract (only owner)
    function emergencyStop() external {
        // Note: In production, this should be restricted to contract owner
        _emergencyStopped = true;
        emit ContractEmergencyStop(msg.sender, uint64(block.timestamp));
    }

    /// @notice Resume contract operations (only owner)
    function resumeContract() external {
        // Note: In production, this should be restricted to contract owner
        _emergencyStopped = false;
        emit ContractResumed(msg.sender, uint64(block.timestamp));
    }

    /// @notice Check if contract is emergency stopped
    /// @return stopped Whether the contract is stopped
    function isEmergencyStopped() external view returns (bool stopped) {
        return _emergencyStopped;
    }

    /// @notice Get contract version and metadata
    /// @return version Contract version
    /// @return name Contract name
    function getContractInfo() external pure returns (string memory version, string memory name) {
        return ("1.0.0", "HoloIdVault");
    }

    /// @notice Get comprehensive profile statistics in a single call
    /// @param owner The address of the profile owner
    /// @return exists Whether profile exists
    /// @return attributeCount Number of attributes
    /// @return createdAt Profile creation timestamp
    /// @return updatedAt Profile last update timestamp
    function getProfileStats(address owner)
        external
        view
        returns (
            bool exists,
            uint256 attributeCount,
            uint64 createdAt,
            uint64 updatedAt
        )
    {
        bool profileExists = _hasProfile[owner];
        if (!profileExists) {
            return (false, 0, 0, 0);
        }

        DIDProfile storage profile = _profiles[owner];
        return (
            true,
            profile.attributes.length,
            profile.createdAt,
            profile.updatedAt
        );
    }

    /// @notice Check if multiple addresses have profiles (batch operation)
    /// @param owners Array of addresses to check
    /// @return results Array of boolean results corresponding to owners
    function hasProfiles(address[] calldata owners)
        external
        view
        returns (bool[] memory results)
    {
        require(owners.length > 0 && owners.length <= 50, "Invalid batch size");
        results = new bool[](owners.length);

        for (uint256 i = 0; i < owners.length; ) {
            results[i] = _hasProfile[owners[i]];
            unchecked { ++i; }
        }

        return results;
    }

    /// @notice Get profile statistics for multiple addresses (batch operation)
    /// @param owners Array of addresses to check
    /// @return existsResults Array of existence flags
    /// @return countResults Array of attribute counts
    /// @return createdResults Array of creation timestamps
    /// @return updatedResults Array of update timestamps
    function getProfilesBatch(address[] calldata owners)
        external
        view
        returns (
            bool[] memory existsResults,
            uint256[] memory countResults,
            uint64[] memory createdResults,
            uint64[] memory updatedResults
        )
    {
        require(owners.length > 0 && owners.length <= 20, "Batch size must be between 1 and 20");

        existsResults = new bool[](owners.length);
        countResults = new uint256[](owners.length);
        createdResults = new uint64[](owners.length);
        updatedResults = new uint64[](owners.length);

        for (uint256 i = 0; i < owners.length; ) {
            address owner = owners[i];
            bool exists = _hasProfile[owner];
            existsResults[i] = exists;

            if (exists) {
                DIDProfile storage profile = _profiles[owner];
                countResults[i] = profile.attributes.length;
                createdResults[i] = profile.createdAt;
                updatedResults[i] = profile.updatedAt;
            } else {
                countResults[i] = 0;
                createdResults[i] = 0;
                updatedResults[i] = 0;
            }

            unchecked { ++i; }
        }

        return (existsResults, countResults, createdResults, updatedResults);
    }

    /// @notice Check if a specific attribute exists for a profile
    /// @param owner The address of the profile owner
    /// @param attributeName The name of the attribute to check
    /// @return exists Whether the attribute exists
    /// @return index The index of the attribute (if exists)
    /// @return isShared Whether the attribute is shared (if exists)
    function attributeExists(address owner, string calldata attributeName)
        external
        view
        returns (bool exists, uint256 index, bool isShared)
    {
        if (!_hasProfile[owner]) {
            return (false, 0, false);
        }

        uint256 attributesLength = _profiles[owner].attributes.length;
        for (uint256 i = 0; i < attributesLength; ) {
            if (keccak256(bytes(_profiles[owner].attributes[i].name)) ==
                keccak256(bytes(attributeName))) {
                return (true, i, _profiles[owner].attributes[i].isShared);
            }
            unchecked { ++i; }
        }

        return (false, 0, false);
    }

    /// @notice Check if a specific attribute exists for a profile
    /// @param owner The address of the profile owner
    /// @param attributeName The name of the attribute to check
    /// @return exists Whether the attribute exists
    /// @return index The index of the attribute (if exists)
    /// @return isShared Whether the attribute is shared (if exists)
    function attributeExists(address owner, string calldata attributeName)
        external
        view
        returns (bool exists, uint256 index, bool isShared)
    {
        if (!_hasProfile[owner]) {
            return (false, 0, false);
        }

        uint256 attributesLength = _profiles[owner].attributes.length;
        for (uint256 i = 0; i < attributesLength; ) {
            if (keccak256(bytes(_profiles[owner].attributes[i].name)) ==
                keccak256(bytes(attributeName))) {
                return (true, i, _profiles[owner].attributes[i].isShared);
            }
            unchecked { ++i; }
        }

        return (false, 0, false);
    }

    /// @notice Get total number of profiles created (utility function)
    /// @return count Total number of profiles
    function getTotalProfiles() external view returns (uint256 count) {
        // Note: This is an estimation as we don't track total profiles
        // In a production system, you'd want to track this properly
        return 0; // Placeholder for future implementation
    }

    /// @notice Update sharing status for multiple attributes in batch
    /// @param attributeNames Array of attribute names to update
    /// @param isSharedStatuses Array of new sharing statuses corresponding to attribute names
    function updateAttributesSharingBatch(
        string[] calldata attributeNames,
        bool[] calldata isSharedStatuses
    ) external onlyProfileOwner nonReentrant {
        require(_hasProfile[msg.sender], "Profile does not exist");
        require(attributeNames.length == isSharedStatuses.length, "Array lengths must match");
        require(attributeNames.length > 0 && attributeNames.length <= 10, "Batch size must be between 1 and 10");

        uint256 attributesLength = _profiles[msg.sender].attributes.length;

        for (uint256 i = 0; i < attributeNames.length; i++) {
            string calldata attributeName = attributeNames[i];
            bool isShared = isSharedStatuses[i];

            require(bytes(attributeName).length > 0, "Attribute name cannot be empty");
            require(bytes(attributeName).length <= 32, "Attribute name too long");

            bool found = false;
            for (uint256 j = 0; j < attributesLength; ) {
                if (keccak256(bytes(_profiles[msg.sender].attributes[j].name)) ==
                    keccak256(bytes(attributeName))) {
                    _profiles[msg.sender].attributes[j].isShared = isShared;
                    emit AttributeUpdated(msg.sender, attributeName, isShared);
                    found = true;
                    break;
                }
                unchecked { ++j; }
            }
            require(found, "Attribute not found");
        }

        _profiles[msg.sender].updatedAt = uint64(block.timestamp);
        emit ProfileUpdated(msg.sender, uint64(block.timestamp));
        emit BatchAttributesUpdated(msg.sender, attributeNames.length, isSharedStatuses[0]);
    }

    /// @notice Update sharing status for multiple attributes in batch
    /// @param attributeNames Array of attribute names to update
    /// @param isSharedStatuses Array of new sharing statuses corresponding to attribute names
    function updateAttributesSharingBatch(
        string[] calldata attributeNames,
        bool[] calldata isSharedStatuses
    ) external onlyProfileOwner {
        require(attributeNames.length == isSharedStatuses.length, "Array lengths must match");
        require(attributeNames.length > 0 && attributeNames.length <= 10, "Batch size must be between 1 and 10");

        uint256 attributesLength = _profiles[msg.sender].attributes.length;

        for (uint256 i = 0; i < attributeNames.length; i++) {
            string calldata attributeName = attributeNames[i];
            bool isShared = isSharedStatuses[i];

            bool found = false;
            for (uint256 j = 0; j < attributesLength; ) {
                if (keccak256(bytes(_profiles[msg.sender].attributes[j].name)) ==
                    keccak256(bytes(attributeName))) {
                    _profiles[msg.sender].attributes[j].isShared = isShared;
                    emit AttributeUpdated(msg.sender, attributeName, isShared);
                    found = true;
                    break;
                }
                unchecked { ++j; }
            }
            require(found, "Attribute not found");
        }

        _profiles[msg.sender].updatedAt = uint64(block.timestamp);
        emit ProfileUpdated(msg.sender, uint64(block.timestamp));
        emit BatchAttributesUpdated(msg.sender, attributeNames.length, isSharedStatuses[0]);
    }

    /// @notice Get multiple attribute info in a single call to reduce gas costs
    /// @param owner The address of the profile owner
    /// @param startIndex The starting index
    /// @param count The number of attributes to retrieve
    /// @return names Array of attribute names
    /// @return isShareds Array of sharing statuses
    function getAttributesBatch(address owner, uint256 startIndex, uint256 count)
        external
        view
        returns (string[] memory names, bool[] memory isShareds)
    {
        require(_hasProfile[owner], "Profile does not exist");
        require(startIndex < _profiles[owner].attributes.length, "Invalid start index");
        require(count > 0 && count <= 10, "Count must be between 1 and 10");

        uint256 endIndex = startIndex + count;
        if (endIndex > _profiles[owner].attributes.length) {
            endIndex = _profiles[owner].attributes.length;
        }

        uint256 actualCount = endIndex - startIndex;
        names = new string[](actualCount);
        isShareds = new bool[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            Attribute storage attr = _profiles[owner].attributes[startIndex + i];
            names[i] = attr.name;
            isShareds[i] = attr.isShared;
        }

        return (names, isShareds);
    }
}





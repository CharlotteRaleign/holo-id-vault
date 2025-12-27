# HoloIdVault

A decentralized identity (DID) profile management system with selective attribute disclosure using hybrid encryption (AES-256 + FHE) via Zama's FHEVM. This application allows users to create encrypted DID profiles where they can control which attributes are shared with DApps.

## 🎥 Demo Video

Watch the demo video to see HoloIdVault in action:

[![Demo Video]](https://youtu.be/B71NGejVO1I)


## 🌐 Live Demo

**Test the application on Vercel:**
- 🔗 [https://holo-id-vault.vercel.app/](https://holo-id-vault.vercel.app/)

**Note:** Make sure to connect your wallet to the Sepolia testnet (Chain ID: 11155111) when using the live demo.

### Demo Credentials
- **Network:** Sepolia Testnet
- **Contract Address:** `0x2510402cB6E796cED16b15046713CC5404eeFC55`
- **Chain ID:** 11155111

### Demo Credentials
- **Network:** Sepolia Testnet
- **Contract Address:** `0x2510402cB6E796cED16b15046713CC5404eeFC55`
- **Chain ID:** 11155111

## 📋 Contract Addresses

### Local Development (Hardhat)
- **Network:** Local Hardhat Network (Chain ID: 31337)
- **Contract Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **RPC URL:** `http://127.0.0.1:8545`

### Sepolia Testnet
- **Network:** Sepolia Testnet (Chain ID: 11155111)
- **Contract Address:** `0x2510402cB6E796cED16b15046713CC5404eeFC55`
- **Explorer:** [View on Etherscan](https://sepolia.etherscan.io/address/0x2510402cB6E796cED16b15046713CC5404eeFC55)

## Features

- **DID Profile Management**: Create and manage decentralized identity profiles with multiple attributes
- **Hybrid Encryption**: Attribute values encrypted with AES-GCM, keys encrypted with FHE
- **Selective Disclosure**: Control which attributes are shared with DApps via toggle switches
- **Privacy-Preserving**: Only the profile owner can decrypt their attribute values
- **Complete Workflow**: Create profile → Set attributes → Toggle sharing → Decrypt on demand
- **Batch Operations**: Efficient multi-attribute retrieval to reduce gas costs
- **Gas Optimization**: Unchecked arithmetic for safe loop operations
- **Enhanced Security**: Access controls and bounds checking throughout
- **Accessibility**: ARIA labels and keyboard navigation support
- **Local & Sepolia Support**: Works on both local Hardhat network and Sepolia testnet

## Project Structure

```
encrypted-notes/
├── contracts/
│   └── HoloIdVault.sol         # Main DID profile smart contract
├── deploy/
│   └── deploy.ts               # Deployment script
├── ui/                         # Frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   └── DIDProfile.tsx  # Main DID profile component
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utility functions
│   │   │   └── crypto.ts       # AES-GCM encryption/decryption
│   │   └── config/             # Configuration files
│   └── public/                 # Static assets
├── hardhat.config.ts
├── package.json
└── README.md
```

## Smart Contract

The `HoloIdVault` contract stores DID profiles with:

- **Attributes**: Each attribute has:
  - `name`: Attribute name (e.g., "Email", "Age", "Location")
  - `cipher`: Client-side encrypted attribute value (AES-GCM base64)
  - `keyEnc`: FHE-encrypted encryption key (uint256 encoding of EVM address)
  - `isShared`: Whether this attribute is shared with DApps

- **Profile Metadata**: Owner address, creation timestamp, last update timestamp

### Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title HoloIdVault - Decentralized Identity Profile with Selective Disclosure
/// @notice Stores encrypted DID profiles where attributes are protected by hybrid encryption (AES + FHE)
/// @dev Each attribute value is encrypted client-side with AES, and the key is encrypted with FHE
contract HoloIdVault is SepoliaConfig {
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
    event AttributeAdded(address indexed owner, string attributeName);
    event AttributeUpdated(address indexed owner, string attributeName, bool isShared);
    event AttributeRemoved(address indexed owner, string attributeName);

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
    ) external {
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
        for (uint256 i = 0; i < _profiles[msg.sender].attributes.length; i++) {
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
        }
        
        if (!found) {
            // Add new attribute
            _profiles[msg.sender].attributes.push(Attribute({
                name: attributeName,
                cipher: cipher,
                keyEnc: keyEnc,
                isShared: isShared
            }));
            emit AttributeAdded(msg.sender, attributeName);
        }

        _profiles[msg.sender].updatedAt = uint64(block.timestamp);
        emit ProfileUpdated(msg.sender, uint64(block.timestamp));
    }

    /// @notice Remove an attribute from the profile
    /// @param attributeName The name of the attribute to remove
    function removeAttribute(string calldata attributeName) external {
        require(_hasProfile[msg.sender], "Profile does not exist");
        
        uint256 length = _profiles[msg.sender].attributes.length;
        for (uint256 i = 0; i < length; i++) {
            if (keccak256(bytes(_profiles[msg.sender].attributes[i].name)) == 
                keccak256(bytes(attributeName))) {
                // Move last element to current position and pop
                if (i < length - 1) {
                    _profiles[msg.sender].attributes[i] = 
                        _profiles[msg.sender].attributes[length - 1];
                }
                _profiles[msg.sender].attributes.pop();
                emit AttributeRemoved(msg.sender, attributeName);
                _profiles[msg.sender].updatedAt = uint64(block.timestamp);
                return;
            }
        }
        revert("Attribute not found");
    }

    /// @notice Update the sharing status of an attribute
    /// @param attributeName The name of the attribute
    /// @param isShared The new sharing status
    function updateAttributeSharing(
        string calldata attributeName,
        bool isShared
    ) external {
        require(_hasProfile[msg.sender], "Profile does not exist");
        
        for (uint256 i = 0; i < _profiles[msg.sender].attributes.length; i++) {
            if (keccak256(bytes(_profiles[msg.sender].attributes[i].name)) == 
                keccak256(bytes(attributeName))) {
                _profiles[msg.sender].attributes[i].isShared = isShared;
                emit AttributeUpdated(msg.sender, attributeName, isShared);
                _profiles[msg.sender].updatedAt = uint64(block.timestamp);
                return;
            }
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
}
```

### Key Functions

- `setAttribute(name, cipher, keyExternal, inputProof, isShared)`: Set or update an attribute
- `removeAttribute(name)`: Remove an attribute from the profile
- `updateAttributeSharing(name, isShared)`: Update the sharing status of an attribute
- `getAttributeCount(owner)`: Get the number of attributes in a profile
- `getAttributeInfo(owner, index)`: Get attribute name and sharing status
- `getAttributeData(owner, index)`: Get encrypted data for decryption
- `hasProfile(owner)`: Check if an address has a profile

## Encryption/Decryption Flow

### Encryption (Save Attribute)

The encryption process uses a **hybrid encryption scheme** combining AES-256-GCM and FHE:

1. **User enters attribute value** (e.g., Email: "user@example.com")

2. **Generate random EVM address as encryption key**:
   ```typescript
   const randomWallet = Wallet.createRandom();
   const keyAddress = randomWallet.address;
   ```

3. **Client-side encrypt attribute value with AES-GCM**:
   ```typescript
   const cipher = await encryptStringWithKey(attr.value, keyAddress);
   ```
   
   **AES-GCM Encryption Details** (`ui/src/utils/crypto.ts`):
   - Uses **HKDF** (HMAC-based Key Derivation Function) with SHA-256 to derive a 256-bit AES key from the EVM address
   - Derivation parameters:
     - Salt: 16 zero bytes (deterministic per session)
     - Info: `'holo-id-vault-aes'` (application-specific context)
   - Generates a random 12-byte IV (Initialization Vector) for each encryption
   - Output format: Base64-encoded string containing `IV (12 bytes) + Ciphertext`

4. **FHE encrypt key address as uint256**:
   ```typescript
   const keyUint256 = BigInt(ethers.getAddress(keyAddress));
   const input = instance.createEncryptedInput(contractAddress, userAddress);
   input.add256(keyUint256);
   const encryptedInput = await input.encrypt();
   ```
   
   - Converts the 20-byte EVM address to a uint256 (using lower 160 bits)
   - Uses FHEVM SDK to create an encrypted input with proof
   - The encrypted key is stored on-chain as `euint256` (encrypted uint256)

5. **Store to contract**:
   ```solidity
   setAttribute(name, cipher, keyExternal, inputProof, isShared)
   ```
   
   - The contract verifies the FHE proof and stores:
     - `cipher`: AES-encrypted attribute value (string)
     - `keyEnc`: FHE-encrypted encryption key (euint256)
     - `isShared`: Sharing permission flag (bool)

### Decryption (View Attribute)

The decryption process reverses the encryption steps:

1. **User requests decryption** for a specific attribute

2. **Get encrypted data from contract**:
   ```typescript
   const [cipher, keyEncHandle] = await contract.getAttributeData(owner, index);
   ```

3. **Decrypt FHE-encrypted key using user's private key**:
   ```typescript
   const keypair = instance.generateKeypair();
   const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
   const signature = await signer.signTypedData(...);
   
   const result = await instance.userDecrypt(
     handleContractPairs,
     keypair.privateKey,
     keypair.publicKey,
     signature,
     contractAddresses,
     userAddress,
     startTimestamp,
     durationDays
   );
   
   // Convert uint256 back to hex address (lower 160 bits)
   const keyUint256Str = result[keyEncHandle];
   const big = BigInt(keyUint256Str);
   const keyAddress = '0x' + (big & ((1n << 160n) - 1n)).toString(16).padStart(40, '0');
   ```
   
   - Uses FHEVM's `userDecrypt` function with EIP-712 signature for authorization
   - Only the profile owner can decrypt (verified by signature)
   - Converts the decrypted uint256 back to a 20-byte EVM address

4. **Decrypt attribute value with AES-GCM**:
   ```typescript
   const decryptedValue = await decryptStringWithKey(cipher, keyAddress);
   ```
   
   **AES-GCM Decryption Details**:
   - Extracts the IV from the first 12 bytes of the base64-decoded cipher
   - Uses the same HKDF derivation to recreate the AES key from the address
   - Decrypts the remaining ciphertext using AES-GCM with the derived key and IV
   - Returns the original plaintext string

5. **Display decrypted value to user**

### Key Security Properties

- **Attribute Values**: Encrypted with AES-256-GCM (industry-standard symmetric encryption)
  - Fast and efficient for arbitrary text data
  - Supports any string length
  - IV ensures uniqueness even for identical plaintexts

- **Encryption Keys**: Encrypted with FHE (Fully Homomorphic Encryption)
  - Keys stored on-chain in encrypted form (`euint256`)
  - Only decryptable by the profile owner (via FHEVM userDecrypt with signature)
  - Enables selective disclosure control without revealing keys

- **Selective Disclosure**: Each attribute has an `isShared` flag
  - When `isShared = true`, the attribute metadata (name, sharing status) is visible to DApps
  - When `isShared = false`, the attribute remains completely private
  - Users can toggle sharing status at any time
  - **Important**: Only metadata is shared; encrypted values remain private until explicitly decrypted by the owner

## Architecture

### Hybrid Encryption Scheme

The system uses a **two-layer encryption approach**:

1. **Outer Layer (AES-256-GCM)**:
   - Encrypts the actual attribute values (e.g., email addresses, locations)
   - Fast, efficient, and supports arbitrary data lengths
   - Key derivation: HKDF-SHA256 from random EVM address

2. **Inner Layer (FHE)**:
   - Encrypts the AES encryption keys
   - Keys stored on-chain in encrypted form
   - Only the profile owner can decrypt (via FHEVM with cryptographic proof)
   - Enables privacy-preserving operations on encrypted data

### Why Hybrid Encryption?

- **Performance**: AES-GCM is fast for encrypting/decrypting attribute values
- **Flexibility**: Supports arbitrary string lengths without on-chain storage limits
- **Privacy**: FHE protects the encryption keys, ensuring only the owner can decrypt
- **Selective Disclosure**: The FHE layer enables fine-grained access control

## Development

### Prerequisites

- Node.js 20+
- Hardhat node running (for local development)
- MetaMask or Rainbow Wallet
- Sepolia ETH (for testnet deployment and testing)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   cd ui && npm install && cd ..
   ```

   Or use the setup script:
   ```bash
   npm run setup
   ```

2. **Start local Hardhat node** (in one terminal):
   ```bash
   npm run node
   ```

3. **Deploy contract** (in another terminal):
   ```bash
   npm run deploy:localhost
   ```

4. **Generate contract ABI**:
   ```bash
   npm run frontend:genabi
   ```

### Sepolia Testnet

1. **Set environment variables** (do not commit these to version control):
   ```bash
   export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY"
   export PRIVATE_KEY="your_private_key"
   ```

   Or on Windows PowerShell:
   ```powershell
   $env:SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY"
   $env:PRIVATE_KEY="your_private_key"
   ```

2. **Deploy to Sepolia**:
   ```bash
   npm run deploy:sepolia
   ```

3. **Generate contract ABI**:
   ```bash
   npm run frontend:genabi
   ```

## Frontend

The frontend is built with React, Vite, and RainbowKit for wallet connectivity.

### Features

- **Wallet Connection**: RainbowKit integration in top-right corner
- **DID Profile Management**: Create and manage your decentralized identity
- **Attribute Management**: Add, update, and remove attributes (Email, Age, Location, Verified Status)
- **Selective Disclosure**: Toggle which attributes are shared with DApps
- **Decrypt Attributes**: Decrypt and view attribute values on demand

### Configuration

After deploying the contract, automatically generate the contract configuration:

```bash
cd ui
npm run genabi
```

This script will:
- Read deployment files from `../deployments/`
- Update `src/config/contracts.ts` with the correct address and ABI
- Support both localhost and Sepolia networks

### Running Frontend

```bash
cd ui
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

### Network Configuration

Make sure your wallet is connected to the correct network:
- **Local Development**: Hardhat Network (Chain ID: 31337)
- **Testnet**: Sepolia Testnet (Chain ID: 11155111)

If you encounter connection issues, check:
1. Wallet is connected to the correct network
2. RPC endpoint is accessible (for Sepolia, ensure your Infura API key is valid)
3. You have sufficient ETH for gas fees

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests on Sepolia
npm run test:sepolia

# Run all test suites
npm run test:all
```

## Troubleshooting

### Common Issues

1. **"Still connecting to Sepolia..." in MetaMask**
   - Wait for the connection to complete
   - Try refreshing the page
   - Manually switch to Sepolia network in MetaMask
   - Consider configuring a custom RPC URL in `ui/src/config/wagmi.ts`

2. **CALL_EXCEPTION errors**
   - Ensure wallet is connected to the correct network
   - Verify contract is deployed on the selected network
   - Check that contract address in `ui/src/config/contracts.ts` matches deployment

3. **FHEVM initialization errors**
   - Ensure FHEVM SDK is properly loaded
   - Check browser console for detailed error messages
   - Verify network supports FHEVM (Sepolia or local Hardhat with FHEVM plugin)

## Recent Updates

### Version 1.0.0 (November 2025)
- ✅ Complete FHE-based DID profile system implementation
- ✅ Enhanced security with reentrancy protection and access controls
- ✅ Improved UI/UX with batch operations and accessibility features
- ✅ Comprehensive test coverage and gas optimizations
- ✅ Full TypeScript support and modern React architecture

### Key Features Implemented
- **Hybrid Encryption**: AES-256 client-side + FHE key encryption
- **Selective Disclosure**: Granular control over attribute sharing
- **Batch Operations**: Efficient bulk attribute management
- **Cross-Platform**: Ethereum Sepolia deployment ready
- **Developer Friendly**: Complete tooling and documentation

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

MIT

/*
  This file is auto-generated.
  Command: 'npm run genabi'
  Last updated: 2025-11-18T12:12:00.570Z
*/

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Local Hardhat network
  11155111: "0x2510402cB6E796cED16b15046713CC5404eeFC55", // Sepolia testnet
} as const;

export const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "attributeName",
        "type": "string"
      }
    ],
    "name": "AttributeAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "attributeName",
        "type": "string"
      }
    ],
    "name": "AttributeRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "attributeName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isShared",
        "type": "bool"
      }
    ],
    "name": "AttributeUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "name": "ProfileCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "name": "ProfileUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getAttributeCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getAttributeData",
    "outputs": [
      {
        "internalType": "string",
        "name": "cipher",
        "type": "string"
      },
      {
        "internalType": "euint256",
        "name": "keyEnc",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getAttributeInfo",
    "outputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isShared",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "getProfileMeta",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "createdAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "updatedAt",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "hasProfile",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "attributeName",
        "type": "string"
      }
    ],
    "name": "removeAttribute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "attributeName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "cipher",
        "type": "string"
      },
      {
        "internalType": "externalEuint256",
        "name": "keyExternal",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "isShared",
        "type": "bool"
      }
    ],
    "name": "setAttribute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "attributeName",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isShared",
        "type": "bool"
      }
    ],
    "name": "updateAttributeSharing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Deployment info
export const DEPLOYMENT_INFO = {
  localhost: { address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },
  sepolia: { address: '0x2510402cB6E796cED16b15046713CC5404eeFC55' },
} as const;

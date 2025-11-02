
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const MysteryGardenABI = {
  "abi": [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "growthValue",
          "type": "uint256"
        }
      ],
      "name": "PlantGrown",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "PlantMatured",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "PlantPlanted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        },
        {
          "internalType": "externalEuint32",
          "name": "timeEncrypted",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "timeProof",
          "type": "bytes"
        }
      ],
      "name": "calculateGrowth",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        }
      ],
      "name": "getGrowth",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "",
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
      "name": "getOwnerPlant",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
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
        }
      ],
      "name": "getOwnerPlantCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        }
      ],
      "name": "getPlantInfo",
      "outputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "plantedAt",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isMature",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        }
      ],
      "name": "getPlantParameters",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "weather",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "fertility",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "waterLevel",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "growth",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "plantId",
          "type": "uint256"
        }
      ],
      "name": "markAsMature",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "ownerPlants",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "externalEuint32",
          "name": "weatherEncrypted",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint32",
          "name": "fertilityEncrypted",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint32",
          "name": "waterLevelEncrypted",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "weatherProof",
          "type": "bytes"
        },
        {
          "internalType": "bytes",
          "name": "fertilityProof",
          "type": "bytes"
        },
        {
          "internalType": "bytes",
          "name": "waterLevelProof",
          "type": "bytes"
        }
      ],
      "name": "plant",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "plants",
      "outputs": [
        {
          "internalType": "euint32",
          "name": "weather",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "fertility",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "waterLevel",
          "type": "bytes32"
        },
        {
          "internalType": "euint32",
          "name": "growth",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "plantedAt",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isMature",
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
      "inputs": [],
      "name": "totalPlants",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
} as const;

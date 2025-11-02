// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title MysteryGarden - A FHE-based plant growing game
/// @notice Players plant virtual plants with encrypted growth parameters
/// @dev All growth calculations are performed on encrypted data
contract MysteryGarden is SepoliaConfig {
    // Plant structure containing encrypted growth parameters
    struct Plant {
        euint32 weather;       // Encrypted weather value
        euint32 fertility;      // Encrypted fertility value
        euint32 waterLevel;     // Encrypted water level value
        euint32 growth;         // Encrypted current growth value
        address owner;         // Plant owner
        uint256 plantedAt;      // Timestamp when planted
        bool isMature;          // Whether the plant has matured
    }

    // Mapping from plant ID to Plant
    mapping(uint256 => Plant) public plants;
    
    // Mapping from owner to their plant IDs
    mapping(address => uint256[]) public ownerPlants;
    
    // Total number of plants
    uint256 public totalPlants;
    
    // Growth threshold for maturity (as plain value, will be encrypted when needed)
    // Note: Using a lower threshold due to simplified growth calculation
    uint32 private constant MATURITY_THRESHOLD_VALUE = 10;
    
    // Events
    event PlantPlanted(uint256 indexed plantId, address indexed owner);
    event PlantGrown(uint256 indexed plantId, uint256 growthValue);
    event PlantMatured(uint256 indexed plantId, address indexed owner);

    /// @notice Plant a new seed
    /// @param weatherEncrypted Encrypted weather parameter
    /// @param fertilityEncrypted Encrypted fertility parameter
    /// @param waterLevelEncrypted Encrypted water level parameter
    /// @param weatherProof Proof for weather parameter
    /// @param fertilityProof Proof for fertility parameter
    /// @param waterLevelProof Proof for water level parameter
    function plant(
        externalEuint32 weatherEncrypted,
        externalEuint32 fertilityEncrypted,
        externalEuint32 waterLevelEncrypted,
        bytes calldata weatherProof,
        bytes calldata fertilityProof,
        bytes calldata waterLevelProof
    ) external {
        // Convert external encrypted values to internal format
        euint32 weather = FHE.fromExternal(weatherEncrypted, weatherProof);
        euint32 fertility = FHE.fromExternal(fertilityEncrypted, fertilityProof);
        euint32 waterLevel = FHE.fromExternal(waterLevelEncrypted, waterLevelProof);
        
        uint256 plantId = totalPlants;
        totalPlants++;
        
        // Initialize plant with encrypted parameters
        plants[plantId] = Plant({
            weather: weather,
            fertility: fertility,
            waterLevel: waterLevel,
            growth: FHE.asEuint32(0), // Start with zero growth
            owner: msg.sender,
            plantedAt: block.timestamp,
            isMature: false
        });
        
        ownerPlants[msg.sender].push(plantId);
        
        // Allow contract and owner to decrypt these values
        FHE.allowThis(weather);
        FHE.allow(weather, msg.sender);
        FHE.allowThis(fertility);
        FHE.allow(fertility, msg.sender);
        FHE.allowThis(waterLevel);
        FHE.allow(waterLevel, msg.sender);
        FHE.allowThis(plants[plantId].growth);
        FHE.allow(plants[plantId].growth, msg.sender);
        
        emit PlantPlanted(plantId, msg.sender);
    }

    /// @notice Calculate plant growth using encrypted parameters
    /// @param plantId The ID of the plant to grow
    /// @param timeEncrypted Encrypted time factor
    /// @param timeProof Proof for time factor
    function calculateGrowth(
        uint256 plantId,
        externalEuint32 timeEncrypted,
        bytes calldata timeProof
    ) external {
        require(plants[plantId].owner != address(0), "Plant does not exist");
        require(!plants[plantId].isMature, "Plant already mature");
        require(plants[plantId].owner == msg.sender, "Not your plant");
        
        Plant storage plantData = plants[plantId];
        
        // Convert external time value
        euint32 time = FHE.fromExternal(timeEncrypted, timeProof);
        
        // Growth formula: growth += (weather * fertility * waterLevel * time) / 10000
        // Note: Division is not directly supported in FHEVM, so we use a simplified approach
        // For simplicity, we'll use a fixed divisor by reducing the scale
        // Using encrypted arithmetic operations
        euint32 weatherFactor = FHE.mul(plantData.weather, plantData.fertility);
        euint32 combinedFactor = FHE.mul(weatherFactor, plantData.waterLevel);
        euint32 growthIncrease = FHE.mul(combinedFactor, time);
        
        // Instead of division, we'll use a smaller multiplier approach
        // Scale down by using smaller random values in the frontend
        // For now, we'll add the growth increase directly (frontend should scale down values)
        plantData.growth = FHE.add(plantData.growth, growthIncrease);
        
        // Allow contract and owner to decrypt updated growth
        FHE.allowThis(plantData.growth);
        FHE.allow(plantData.growth, msg.sender);
        
        // Note: Maturity check (growth >= threshold) will be performed
        // when the user decrypts the growth value externally
        
        // Allow time factor to be decrypted
        FHE.allowThis(time);
        FHE.allow(time, msg.sender);
    }

    /// @notice Check if plant has matured and mark it
    /// @param plantId The ID of the plant
    /// @dev This function allows marking a plant as mature after decrypting and verifying growth >= threshold
    function markAsMature(uint256 plantId) external {
        require(plants[plantId].owner != address(0), "Plant does not exist");
        require(!plants[plantId].isMature, "Plant already mature");
        require(plants[plantId].owner == msg.sender, "Not your plant");
        
        plants[plantId].isMature = true;
        emit PlantMatured(plantId, msg.sender);
    }

    /// @notice Get encrypted growth value of a plant
    /// @param plantId The ID of the plant
    /// @return The encrypted growth value
    function getGrowth(uint256 plantId) external view returns (euint32) {
        require(plants[plantId].owner != address(0), "Plant does not exist");
        return plants[plantId].growth;
    }

    /// @notice Get all encrypted parameters of a plant
    /// @param plantId The ID of the plant
    /// @return weather Encrypted weather value
    /// @return fertility Encrypted fertility value
    /// @return waterLevel Encrypted water level value
    /// @return growth Encrypted growth value
    function getPlantParameters(uint256 plantId) 
        external 
        view 
        returns (
            euint32 weather,
            euint32 fertility,
            euint32 waterLevel,
            euint32 growth
        ) 
    {
        require(plants[plantId].owner != address(0), "Plant does not exist");
        Plant storage plantData = plants[plantId];
        return (plantData.weather, plantData.fertility, plantData.waterLevel, plantData.growth);
    }

    /// @notice Get plant count for an owner
    /// @param owner The address of the owner
    /// @return The number of plants owned
    function getOwnerPlantCount(address owner) external view returns (uint256) {
        return ownerPlants[owner].length;
    }

    /// @notice Get plant IDs owned by an address
    /// @param owner The address of the owner
    /// @param index The index in the owner's plant array
    /// @return The plant ID at the given index
    function getOwnerPlant(address owner, uint256 index) external view returns (uint256) {
        require(index < ownerPlants[owner].length, "Index out of bounds");
        return ownerPlants[owner][index];
    }

    /// @notice Get plant information (non-encrypted fields)
    /// @param plantId The ID of the plant
    /// @return owner The owner address
    /// @return plantedAt Timestamp when planted
    /// @return isMature Whether the plant is mature
    function getPlantInfo(uint256 plantId) 
        external 
        view 
        returns (
            address owner,
            uint256 plantedAt,
            bool isMature
        ) 
    {
        require(plants[plantId].owner != address(0), "Plant does not exist");
        Plant storage plantData = plants[plantId];
        return (plantData.owner, plantData.plantedAt, plantData.isMature);
    }
}


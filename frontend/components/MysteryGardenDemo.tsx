"use client";

import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useMysteryGarden } from "@/hooks/useMysteryGarden";
import { MysteryGardenABI } from "@/abi/MysteryGardenABI";
import { MysteryGardenAddresses } from "@/abi/MysteryGardenAddresses";

export const MysteryGardenDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const mysteryGarden = useMysteryGarden({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-primary-yellow px-6 py-3 font-semibold text-gray-900 shadow-md " +
    "transition-smooth hover:bg-primary-yellowDark hover:shadow-lg hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-primary-green px-6 py-3 font-semibold text-white shadow-md " +
    "transition-smooth hover:bg-primary-greenDark hover:shadow-lg hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-green focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  const cardClass = "rounded-xl bg-white border-2 border-primary-green card-shadow transition-smooth p-6";

  const titleClass = "font-bold text-gray-900 text-xl mb-4 flex items-center gap-2";

  // State for all plants information
  const [allPlantsInfo, setAllPlantsInfo] = useState<Array<{
    id: number;
    owner: string;
    plantedAt: bigint;
    isMature: boolean;
    growthHandle: string | null;
  }>>([]);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [selectedPlantGrowth, setSelectedPlantGrowth] = useState<{
    plantId: number;
    growthHandle: string;
    decryptedValue: string | bigint | null;
  } | null>(null);

  // Fetch all plants information
  useEffect(() => {
    if (!mysteryGarden.contractAddress || !ethersReadonlyProvider || !mysteryGarden.plantCount || mysteryGarden.plantCount === 0n) {
      setAllPlantsInfo([]);
      return;
    }

    const fetchAllPlants = async () => {
      setLoadingPlants(true);
      try {
        const contract = new ethers.Contract(
          mysteryGarden.contractAddress as string,
          MysteryGardenABI.abi,
          ethersReadonlyProvider
        );

        const plantCount = Number(mysteryGarden.plantCount);
        const plantsInfoPromises = [];

        for (let i = 0; i < plantCount; i++) {
          const plantInfoPromise = contract.getPlantInfo(i)
            .then((info: [string, bigint, boolean]) => ({
              id: i,
              owner: info[0],
              plantedAt: info[1],
              isMature: info[2],
              growthHandle: null as string | null,
            }))
            .catch(() => null);

          plantsInfoPromises.push(plantInfoPromise);
        }

        const plantsInfo = (await Promise.all(plantsInfoPromises)).filter(Boolean) as Array<{
          id: number;
          owner: string;
          plantedAt: bigint;
          isMature: boolean;
          growthHandle: string | null;
        }>;

        // Fetch growth handles for each plant
        const plantsWithGrowth = await Promise.all(
          plantsInfo.map(async (plant) => {
            try {
              const growthHandle = await contract.getGrowth(plant.id);
              return { ...plant, growthHandle: growthHandle !== ethers.ZeroHash ? growthHandle : null };
            } catch {
              return { ...plant, growthHandle: null };
            }
          })
        );

        setAllPlantsInfo(plantsWithGrowth);
      } catch (error) {
        console.error("Failed to fetch plants:", error);
      } finally {
        setLoadingPlants(false);
      }
    };

    fetchAllPlants();
  }, [mysteryGarden.contractAddress, ethersReadonlyProvider, mysteryGarden.plantCount]);

  // Handle plant click to show growth value
  const handlePlantClick = async (plantId: number) => {
    const plant = allPlantsInfo.find(p => p.id === plantId);
    if (!plant) {
      return;
    }

    // If already selected, deselect
    if (selectedPlantGrowth?.plantId === plantId) {
      setSelectedPlantGrowth(null);
      mysteryGarden.setSelectedPlantId(undefined);
      return;
    }

    // Set selected plant - this will trigger refreshGrowthHandle in the hook
    mysteryGarden.setSelectedPlantId(plantId);
    setSelectedPlantGrowth({
      plantId,
      growthHandle: plant.growthHandle || "",
      decryptedValue: null,
    });
  };

  // Memoize the current plant's growth handle
  const currentPlantGrowthHandle = useMemo(() => {
    if (!selectedPlantGrowth) return null;
    const plant = allPlantsInfo.find(p => p.id === selectedPlantGrowth.plantId);
    return plant?.growthHandle || null;
  }, [allPlantsInfo, selectedPlantGrowth?.plantId]);

  // Update selected plant growth when handle changes or decryption completes
  useEffect(() => {
    if (!selectedPlantGrowth) return;

    const plantId = selectedPlantGrowth.plantId;

    setSelectedPlantGrowth((prev) => {
      if (!prev || prev.plantId !== plantId) return prev;
      
      const currentHandle = prev.growthHandle || "";
      const newHandle = currentPlantGrowthHandle || "";
      
      // Check if we should update decrypted value
      const shouldUpdateDecrypted = (mysteryGarden.handle === newHandle || mysteryGarden.handle === currentHandle) && 
                                   mysteryGarden.isDecrypted && 
                                   prev.decryptedValue === null;
      
      // Check if mysteryGarden handle matches and should update
      const handleFromMystery = mysteryGarden.handle && 
                               mysteryGarden.handle !== ethers.ZeroHash && 
                               mysteryGarden.handle !== currentHandle &&
                               (mysteryGarden.handle === newHandle || mysteryGarden.handle === currentPlantGrowthHandle);
      
      // Check if plant handle changed
      const handleChanged = newHandle && 
                           newHandle !== currentHandle && 
                           newHandle !== ethers.ZeroHash && 
                           newHandle !== "";
      
      if (!handleChanged && !shouldUpdateDecrypted && !handleFromMystery) {
        return prev; // No changes needed
      }
      
      const updated = { ...prev };
      
      if (handleFromMystery && mysteryGarden.handle) {
        updated.growthHandle = mysteryGarden.handle;
      } else if (handleChanged) {
        updated.growthHandle = newHandle;
      }
      
      if (shouldUpdateDecrypted) {
        const clearValue = mysteryGarden.clear;
        updated.decryptedValue = (typeof clearValue === 'string' || typeof clearValue === 'bigint') ? clearValue : null;
      }
      
      return updated;
    });
  }, [mysteryGarden.handle, mysteryGarden.isDecrypted, mysteryGarden.clear, selectedPlantGrowth?.plantId, currentPlantGrowthHandle]);

  if (!isConnected) {
    return (
      <div className="mx-auto mt-20">
        <div className="text-center">
          <div className="text-6xl mb-6">🌱</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Mystery Garden</h2>
          <p className="text-gray-600 mb-8 text-lg">Connect your MetaMask wallet to start growing encrypted plants</p>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-primary-yellow px-8 py-4 font-bold text-gray-900 shadow-lg text-xl transition-smooth hover:bg-primary-yellowDark hover:shadow-xl hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow focus-visible:ring-offset-2"
            onClick={connect}
          >
            Connect to MetaMask
          </button>
        </div>
      </div>
    );
  }

  if (mysteryGarden.isDeployed === false) {
    return (
      <div className="mx-auto mt-20 p-6">
        <div className="rounded-xl bg-red-50 border-2 border-red-300 p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-xl font-bold text-red-900">Contract Not Found</h3>
          </div>
          <p className="text-red-700 text-lg">
            The MysteryGarden contract is not deployed on this network.
          </p>
          <p className="text-red-600 mt-2">Chain ID: {chainId?.toString() || "Unknown"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-6 px-3 md:px-0 mt-8">
      {/* Network & Contract Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cardClass}>
          <p className={titleClass}>
            <span className="text-2xl">🌐</span>
            Network Information
          </p>
          <div className="space-y-2">
            {printProperty("Chain ID", chainId)}
            {printProperty(
              "Wallet Address",
              ethersSigner ? `${ethersSigner.address.slice(0, 6)}...${ethersSigner.address.slice(-4)}` : "Not connected"
            )}
          </div>
        </div>

        <div className={cardClass}>
          <p className={titleClass}>
            <span className="text-2xl">📜</span>
            Contract Details
          </p>
          <div className="space-y-2">
            {printProperty("Contract Address", mysteryGarden.contractAddress ? `${mysteryGarden.contractAddress.slice(0, 6)}...${mysteryGarden.contractAddress.slice(-4)}` : "Not deployed")}
            {printProperty("Total Plants", mysteryGarden.plantCount?.toString() ?? "Loading...")}
            {printProperty("Deployment Status", mysteryGarden.isDeployed ? "✅ Deployed" : "❌ Not deployed")}
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className={cardClass}>
        <p className={titleClass}>
          <span className="text-2xl">🔐</span>
          FHEVM Status
        </p>
        <div className="space-y-2">
          {printProperty(
            "Instance",
            fhevmInstance ? "✅ Ready" : "❌ Not available"
          )}
          {printProperty("Status", fhevmStatus)}
          {printProperty("Error", fhevmError ?? "✅ No errors")}
        </div>
      </div>

      {/* Game Rules & Information */}
      <div className={cardClass}>
        <p className={titleClass}>
          <span className="text-2xl">📖</span>
          Game Rules & Mechanics
        </p>
        <div className="space-y-4 mt-4">
          <div className="bg-primary-yellowLight border-l-4 border-primary-yellow p-4 rounded">
            <h4 className="font-bold text-gray-900 mb-2">Growth Calculation Formula</h4>
            <p className="text-gray-800 text-sm leading-relaxed">
              Each time you grow a plant, the growth value increases based on the following formula:
            </p>
            <div className="mt-2 bg-white p-3 rounded border border-primary-yellow">
              <code className="text-primary-greenDark font-mono text-sm">
                Growth = Growth + (Weather × Fertility × Water Level × Time)
              </code>
            </div>
            <p className="text-gray-700 text-xs mt-2">
              <strong>Note:</strong> All parameters are encrypted using FHE (Fully Homomorphic Encryption) and calculations are performed on encrypted data to ensure privacy. You can only decrypt your own plants' growth values.
            </p>
          </div>
          
          <div className="bg-primary-greenLight border-l-4 border-primary-green p-4 rounded">
            <h4 className="font-bold text-gray-900 mb-2">Maturity Conditions</h4>
            <p className="text-gray-800 text-sm leading-relaxed mb-2">
              A plant can be marked as mature when all of the following conditions are met:
            </p>
            <ul className="list-disc list-inside text-gray-700 text-sm space-y-1 ml-2">
              <li>The growth value must be decrypted and verified to be greater than or equal to the maturity threshold (100)</li>
              <li>You must be the owner of the plant</li>
              <li>The plant must not already be marked as mature</li>
            </ul>
            <p className="text-gray-700 text-xs mt-2">
              <strong>How to mark as mature:</strong> First decrypt the growth value to check if it meets the threshold, then click the "Mark as Mature" button. The maturity check is performed client-side after decryption to ensure the growth value meets the requirement.
            </p>
          </div>
        </div>
      </div>

      {/* Plant Selection */}
      <div className={cardClass}>
        <p className={titleClass}>
          <span className="text-2xl">🌿</span>
          Plant Selection
        </p>
        <div className="mt-4">
          {loadingPlants ? (
            <div className="text-center py-8">
              <div className="animate-spin text-4xl mb-4">🌱</div>
              <p className="text-gray-600">Loading plants...</p>
            </div>
          ) : allPlantsInfo.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-lg">No plants available. Plant your first seed to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allPlantsInfo.map((plant) => {
                const isSelected = selectedPlantGrowth?.plantId === plant.id;
                const isMyPlant = ethersSigner && plant.owner.toLowerCase() === ethersSigner.address.toLowerCase();
                return (
                  <div
                    key={plant.id}
                    onClick={() => handlePlantClick(plant.id)}
                    className={`
                      rounded-lg border-2 p-4 cursor-pointer transition-smooth
                      ${isSelected 
                        ? "bg-primary-yellowLight border-primary-yellow shadow-lg scale-105" 
                        : "bg-white border-primary-green hover:border-primary-yellow hover:shadow-md hover:scale-102"
                      }
                      ${plant.isMature ? "ring-2 ring-primary-green" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg text-gray-900">Plant #{plant.id}</span>
                      {plant.isMature && <span className="text-xl">✅</span>}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className={`flex items-center gap-1 ${isMyPlant ? "text-primary-greenDark font-semibold" : ""}`}>
                        <span>{isMyPlant ? "👤 Your Plant" : "👤 Other"}</span>
                      </div>
                      {plant.isMature && (
                        <div className="text-primary-greenDark font-semibold">Mature</div>
                      )}
                      {!plant.growthHandle && (
                        <div className="text-gray-500 text-xs">No growth yet</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Show selected plant growth */}
          {selectedPlantGrowth !== null && (
            <div className="mt-6 p-4 bg-primary-yellowLight border-2 border-primary-yellow rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-lg text-gray-900">Plant #{selectedPlantGrowth.plantId} Growth</h4>
                <button
                  onClick={() => {
                    setSelectedPlantGrowth(null);
                    mysteryGarden.setSelectedPlantId(undefined);
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-smooth text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-primary-yellow">
                  <span className="text-gray-700 font-medium">Growth Handle:</span>
                  <span className="font-mono text-xs text-gray-900 break-all text-right">
                    {(selectedPlantGrowth.growthHandle && selectedPlantGrowth.growthHandle !== ethers.ZeroHash && selectedPlantGrowth.growthHandle !== "") 
                      ? `${selectedPlantGrowth.growthHandle.slice(0, 10)}...${selectedPlantGrowth.growthHandle.slice(-8)}` 
                      : (mysteryGarden.handle && mysteryGarden.handle !== ethers.ZeroHash)
                      ? `${mysteryGarden.handle.slice(0, 10)}...${mysteryGarden.handle.slice(-8)}`
                      : "No growth handle yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-700 font-medium">Growth Value:</span>
                  <span className="font-bold text-lg text-gray-900">
                    {selectedPlantGrowth.decryptedValue !== null 
                      ? `🌱 ${selectedPlantGrowth.decryptedValue}`
                      : (selectedPlantGrowth.growthHandle && selectedPlantGrowth.growthHandle !== ethers.ZeroHash && selectedPlantGrowth.growthHandle !== "") || (mysteryGarden.handle && mysteryGarden.handle !== ethers.ZeroHash)
                      ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              mysteryGarden.decryptGrowthHandle();
                            }}
                            className="text-primary-green hover:text-primary-greenDark font-semibold underline transition-smooth"
                            disabled={mysteryGarden.isDecrypting || !mysteryGarden.canDecrypt}
                          >
                            {mysteryGarden.isDecrypting ? "Decrypting..." : "Click to Decrypt"}
                          </button>
                        )
                      : "🔒 No growth data yet"}
                  </span>
                </div>
                {mysteryGarden.selectedPlantId === selectedPlantGrowth.plantId && mysteryGarden.isMature && (
                  <div className="mt-3 p-3 bg-primary-greenLight border-2 border-primary-green rounded-lg flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <span className="text-primary-greenDark font-semibold">This plant is mature and ready to harvest!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Growth Information */}
      <div className={cardClass}>
        <p className={titleClass}>
          <span className="text-2xl">📊</span>
          Growth Information
        </p>
        <div className="space-y-3 mt-4">
          {printProperty("Growth Handle", mysteryGarden.handle || "No growth handle yet")}
          {printProperty(
            "Decrypted Growth Value",
            mysteryGarden.isDecrypted ? `🌱 ${mysteryGarden.clear}` : "🔒 Encrypted (click decrypt to view)"
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className={primaryButtonClass}
          disabled={!mysteryGarden.canPlant}
          onClick={mysteryGarden.plant}
        >
          {mysteryGarden.isPlanting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">🌱</span>
              Planting...
            </span>
          ) : mysteryGarden.canPlant ? (
            "🌱 Plant New Seed"
          ) : (
            "Cannot Plant"
          )}
        </button>
        <button
          className={secondaryButtonClass}
          disabled={!mysteryGarden.canGrow}
          onClick={mysteryGarden.grow}
        >
          {mysteryGarden.isGrowing ? (
            <span className="flex items-center gap-2">
              <span className="animate-pulse">🌿</span>
              Growing...
            </span>
          ) : mysteryGarden.canGrow ? (
            "🌿 Grow Plant"
          ) : mysteryGarden.isMature ? (
            "✅ Plant is Mature"
          ) : (
            "Cannot Grow"
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className={secondaryButtonClass}
          disabled={!mysteryGarden.canDecrypt}
          onClick={mysteryGarden.decryptGrowthHandle}
        >
          {mysteryGarden.isDecrypting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">🔓</span>
              Decrypting...
            </span>
          ) : mysteryGarden.canDecrypt ? (
            "🔓 Decrypt Growth"
          ) : mysteryGarden.isDecrypted ? (
            `✅ Decrypted: ${mysteryGarden.clear}`
          ) : (
            "Nothing to Decrypt"
          )}
        </button>
        <button
          className={primaryButtonClass}
          disabled={mysteryGarden.selectedPlantId === undefined || mysteryGarden.isMature}
          onClick={mysteryGarden.markAsMature}
        >
          {mysteryGarden.isMature ? (
            "✅ Plant is Mature"
          ) : (
            "🏆 Mark as Mature"
          )}
        </button>
      </div>

      {/* Status Message */}
      {mysteryGarden.message && (
        <div className={`rounded-xl border-2 p-6 transition-smooth ${
          mysteryGarden.message.includes("Failed") || mysteryGarden.message.includes("error")
            ? "bg-red-50 border-red-300"
            : mysteryGarden.message.includes("completed") || mysteryGarden.message.includes("success")
            ? "bg-primary-greenLight border-primary-green"
            : "bg-primary-yellowLight border-primary-yellow"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {mysteryGarden.message.includes("Failed") || mysteryGarden.message.includes("error") 
                ? "⚠️" 
                : mysteryGarden.message.includes("completed") || mysteryGarden.message.includes("success")
                ? "✅"
                : "ℹ️"}
            </span>
            <p className="font-semibold text-gray-900 break-words">{mysteryGarden.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
      <span className="text-gray-700 font-medium">{name}:</span>
      <span className="font-mono font-semibold text-gray-900 text-right break-all">{displayValue}</span>
    </div>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
      <span className="text-gray-700 font-medium">{name}:</span>
      <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
        value 
          ? "bg-primary-greenLight text-primary-greenDark" 
          : "bg-red-100 text-red-700"
      }`}>
        {value ? "✓ True" : "✗ False"}
      </span>
    </div>
  );
}


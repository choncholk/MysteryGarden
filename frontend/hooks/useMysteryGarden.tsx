"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { MysteryGardenAddresses } from "@/abi/MysteryGardenAddresses";
import { MysteryGardenABI } from "@/abi/MysteryGardenABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type MysteryGardenInfoType = {
  abi: typeof MysteryGardenABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getMysteryGardenByChainId(
  chainId: number | undefined
): MysteryGardenInfoType {
  if (!chainId) {
    return { abi: MysteryGardenABI.abi };
  }

  const entry =
    MysteryGardenAddresses[chainId.toString() as keyof typeof MysteryGardenAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: MysteryGardenABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: MysteryGardenABI.abi,
  };
}

export const useMysteryGarden = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [plantCount, setPlantCount] = useState<bigint | undefined>(undefined);
  const [selectedPlantId, setSelectedPlantId] = useState<number | undefined>(undefined);
  const [growthHandle, setGrowthHandle] = useState<string | undefined>(undefined);
  const [clearGrowth, setClearGrowth] = useState<ClearValueType | undefined>(undefined);
  const [isMature, setIsMature] = useState<boolean>(false);
  const [isPlanting, setIsPlanting] = useState<boolean>(false);
  const [isGrowing, setIsGrowing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const clearGrowthRef = useRef<ClearValueType>(undefined);
  const mysteryGardenRef = useRef<MysteryGardenInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isPlantingRef = useRef<boolean>(isPlanting);
  const isGrowingRef = useRef<boolean>(isGrowing);

  const isDecrypted = growthHandle && growthHandle === clearGrowth?.handle;

  const mysteryGarden = useMemo(() => {
    const c = getMysteryGardenByChainId(chainId);

    mysteryGardenRef.current = c;

    if (!c.address) {
      setMessage(`MysteryGarden deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!mysteryGarden) {
      return undefined;
    }
    return (Boolean(mysteryGarden.address) && mysteryGarden.address !== ethers.ZeroAddress);
  }, [mysteryGarden]);

  const canPlant = useMemo(() => {
    return mysteryGarden.address && instance && ethersSigner && !isPlanting;
  }, [mysteryGarden.address, instance, ethersSigner, isPlanting]);

  const canGrow = useMemo(() => {
    return mysteryGarden.address && instance && ethersSigner && selectedPlantId !== undefined && !isGrowing && !isMature;
  }, [mysteryGarden.address, instance, ethersSigner, selectedPlantId, isGrowing, isMature]);

  const canDecrypt = useMemo(() => {
    return (
      mysteryGarden.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      growthHandle &&
      growthHandle !== ethers.ZeroHash &&
      growthHandle !== clearGrowth?.handle
    );
  }, [
    mysteryGarden.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    growthHandle,
    clearGrowth,
  ]);

  const refreshPlantCount = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    if (
      !mysteryGardenRef.current ||
      !mysteryGardenRef.current?.chainId ||
      !mysteryGardenRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setPlantCount(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = mysteryGardenRef.current.chainId;
    const thisMysteryGardenAddress = mysteryGardenRef.current.address;

    const thisMysteryGardenContract = new ethers.Contract(
      thisMysteryGardenAddress,
      mysteryGardenRef.current.abi,
      ethersReadonlyProvider
    );

    thisMysteryGardenContract
      .totalPlants()
      .then((value) => {
        console.log("[useMysteryGarden] totalPlants()=" + value);
        if (
          sameChain.current(thisChainId) &&
          thisMysteryGardenAddress === mysteryGardenRef.current?.address
        ) {
          setPlantCount(value);
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        setMessage("MysteryGarden.totalPlants() call failed! error=" + e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    refreshPlantCount();
  }, [refreshPlantCount]);

  const refreshGrowthHandle = useCallback(() => {
    if (selectedPlantId === undefined) {
      setGrowthHandle(undefined);
      return;
    }

    if (isRefreshingRef.current) {
      return;
    }

    if (
      !mysteryGardenRef.current ||
      !mysteryGardenRef.current?.chainId ||
      !mysteryGardenRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setGrowthHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = mysteryGardenRef.current.chainId;
    const thisMysteryGardenAddress = mysteryGardenRef.current.address;
    const thisPlantId = selectedPlantId;

    const thisMysteryGardenContract = new ethers.Contract(
      thisMysteryGardenAddress,
      mysteryGardenRef.current.abi,
      ethersReadonlyProvider
    );

    thisMysteryGardenContract
      .getGrowth(thisPlantId)
      .then((value) => {
        console.log("[useMysteryGarden] getGrowth()=" + value);
        if (
          sameChain.current(thisChainId) &&
          thisMysteryGardenAddress === mysteryGardenRef.current?.address &&
          thisPlantId === selectedPlantId
        ) {
          setGrowthHandle(value);
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        setMessage("MysteryGarden.getGrowth() call failed! error=" + e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, sameChain, selectedPlantId]);

  const refreshPlantInfo = useCallback(() => {
    if (selectedPlantId === undefined) {
      setIsMature(false);
      return;
    }

    if (
      !mysteryGardenRef.current ||
      !mysteryGardenRef.current?.chainId ||
      !mysteryGardenRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setIsMature(false);
      return;
    }

    const thisChainId = mysteryGardenRef.current.chainId;
    const thisMysteryGardenAddress = mysteryGardenRef.current.address;
    const thisPlantId = selectedPlantId;

    const thisMysteryGardenContract = new ethers.Contract(
      thisMysteryGardenAddress,
      mysteryGardenRef.current.abi,
      ethersReadonlyProvider
    );

    thisMysteryGardenContract
      .getPlantInfo(thisPlantId)
      .then((value) => {
        // Convert BigInt to string for logging
        const logValue = [
          value[0], // owner (string)
          value[1].toString(), // plantedAt (bigint -> string)
          value[2] // isMature (boolean)
        ];
        console.log("[useMysteryGarden] getPlantInfo()=" + JSON.stringify(logValue));
        if (
          sameChain.current(thisChainId) &&
          thisMysteryGardenAddress === mysteryGardenRef.current?.address &&
          thisPlantId === selectedPlantId
        ) {
          setIsMature(value[2]); // value[2] is isMature
        }
      })
      .catch((e) => {
        console.log("[useMysteryGarden] getPlantInfo() failed, error=" + e);
        setIsMature(false);
      });
  }, [ethersReadonlyProvider, sameChain, selectedPlantId]);

  useEffect(() => {
    if (selectedPlantId !== undefined) {
      refreshGrowthHandle();
      refreshPlantInfo();
    } else {
      setIsMature(false);
    }
  }, [refreshGrowthHandle, refreshPlantInfo, selectedPlantId]);

  const decryptGrowthHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!mysteryGarden.address || !instance || !ethersSigner) {
      return;
    }

    if (growthHandle === clearGrowthRef.current?.handle) {
      return;
    }

    if (!growthHandle) {
      setClearGrowth(undefined);
      clearGrowthRef.current = undefined;
      return;
    }

    if (growthHandle === ethers.ZeroHash) {
      setClearGrowth({ handle: growthHandle, clear: BigInt(0) });
      clearGrowthRef.current = { handle: growthHandle, clear: BigInt(0) };
      return;
    }

    const thisChainId = chainId;
    const thisMysteryGardenAddress = mysteryGarden.address;
    const thisGrowthHandle = growthHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypt");

    const run = async () => {
      const isStale = () =>
        thisMysteryGardenAddress !== mysteryGardenRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [mysteryGarden.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          [{ handle: thisGrowthHandle, contractAddress: thisMysteryGardenAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setClearGrowth({ handle: thisGrowthHandle, clear: res[thisGrowthHandle] });
        clearGrowthRef.current = {
          handle: thisGrowthHandle,
          clear: res[thisGrowthHandle],
        };

        setMessage(
          "Growth handle clear value is " + clearGrowthRef.current.clear
        );
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    mysteryGarden.address,
    instance,
    growthHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const plant = useCallback(() => {
    if (isPlantingRef.current) {
      return;
    }

    if (!mysteryGarden.address || !instance || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisMysteryGardenAddress = mysteryGarden.address;
    const thisEthersSigner = ethersSigner;

    isPlantingRef.current = true;
    setIsPlanting(true);
    setMessage("Start planting...");

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const isStale = () =>
        thisMysteryGardenAddress !== mysteryGardenRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const input = instance.createEncryptedInput(
          thisMysteryGardenAddress,
          thisEthersSigner.address
        );

        // Generate random encrypted values for weather, fertility, and waterLevel
        // Using values between 1-8 for each parameter with weighted distribution
        // Smaller numbers have higher probability (weights: [8,7,6,5,4,3,2,1])
        // Since contract doesn't divide by 10000, we scale down the inputs instead
        // Formula: growth += weather * fertility * waterLevel * time
        // With max values (8 * 8 * 8 * 2 = 1024), growth per grow operation is manageable
        // This results in growth increments of 1-1024 per grow operation
        // Weighted random function: smaller numbers appear more frequently
        const generateWeightedRandom = () => {
          // Weights for values 1-8: [8, 7, 6, 5, 4, 3, 2, 1]
          // Total weight = 36
          const weights = [8, 7, 6, 5, 4, 3, 2, 1];
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          let random = Math.random() * totalWeight;
          
          for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
              return i + 1; // Return value between 1-8
            }
          }
          return 1; // Fallback
        };
        
        const weather = generateWeightedRandom();
        const fertility = generateWeightedRandom();
        const waterLevel = generateWeightedRandom();

        input.add32(weather);
        input.add32(fertility);
        input.add32(waterLevel);

        const enc = await input.encrypt();

        if (isStale()) {
          setMessage("Ignore plant");
          return;
        }

        setMessage("Call plant...");

        const thisMysteryGardenContract = new ethers.Contract(
          thisMysteryGardenAddress,
          mysteryGarden.abi,
          thisEthersSigner
        );

        // Note: All three parameters share the same proof
        const tx: ethers.TransactionResponse =
          await thisMysteryGardenContract.plant(
            enc.handles[0],
            enc.handles[1],
            enc.handles[2],
            enc.inputProof,
            enc.inputProof,
            enc.inputProof
          );

        setMessage(`Wait for tx:${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Plant completed status=${receipt?.status}`);

        if (isStale()) {
          setMessage("Ignore plant");
          return;
        }

        refreshPlantCount();
      } catch (e) {
        setMessage(`Plant Failed! ${e}`);
      } finally {
        isPlantingRef.current = false;
        setIsPlanting(false);
      }
    };

    run();
  }, [
    ethersSigner,
    mysteryGarden.address,
    mysteryGarden.abi,
    instance,
    chainId,
    refreshPlantCount,
    sameChain,
    sameSigner,
  ]);

  const grow = useCallback(() => {
    if (selectedPlantId === undefined) {
      return;
    }

    if (isGrowingRef.current) {
      return;
    }

    if (!mysteryGarden.address || !instance || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisMysteryGardenAddress = mysteryGarden.address;
    const thisEthersSigner = ethersSigner;
    const thisPlantId = selectedPlantId;

    isGrowingRef.current = true;
    setIsGrowing(true);
    setMessage("Start growing...");

    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const isStale = () =>
        thisMysteryGardenAddress !== mysteryGardenRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const input = instance.createEncryptedInput(
          thisMysteryGardenAddress,
          thisEthersSigner.address
        );

        // Time factor for growth (1-2) - smaller values to control growth rate
        // Reduced to keep growth increments reasonable
        const timeFactor = Math.floor(Math.random() * 2) + 1;
        input.add32(timeFactor);

        const enc = await input.encrypt();

        if (isStale()) {
          setMessage("Ignore grow");
          return;
        }

        setMessage("Call calculateGrowth...");

        const thisMysteryGardenContract = new ethers.Contract(
          thisMysteryGardenAddress,
          mysteryGarden.abi,
          thisEthersSigner
        );

        const tx: ethers.TransactionResponse =
          await thisMysteryGardenContract.calculateGrowth(
            thisPlantId,
            enc.handles[0],
            enc.inputProof
          );

        setMessage(`Wait for tx:${tx.hash}...`);

        const receipt = await tx.wait();

        setMessage(`Grow completed status=${receipt?.status}`);

        if (isStale()) {
          setMessage("Ignore grow");
          return;
        }

        refreshGrowthHandle();
      } catch (e) {
        setMessage(`Grow Failed! ${e}`);
      } finally {
        isGrowingRef.current = false;
        setIsGrowing(false);
      }
    };

    run();
  }, [
    ethersSigner,
    mysteryGarden.address,
    mysteryGarden.abi,
    instance,
    chainId,
    selectedPlantId,
    refreshGrowthHandle,
    sameChain,
    sameSigner,
  ]);

  const markAsMature = useCallback(async () => {
    if (selectedPlantId === undefined) {
      return;
    }

    if (!mysteryGarden.address || !ethersSigner) {
      return;
    }

    try {
      const thisMysteryGardenContract = new ethers.Contract(
        mysteryGarden.address,
        mysteryGarden.abi,
        ethersSigner
      );

      setMessage("Marking plant as mature...");
      const tx = await thisMysteryGardenContract.markAsMature(selectedPlantId);
      await tx.wait();
      setMessage("Plant marked as mature!");
      refreshGrowthHandle();
      refreshPlantInfo();
    } catch (e) {
      setMessage(`Mark as mature failed! ${e}`);
    }
  }, [mysteryGarden.address, mysteryGarden.abi, ethersSigner, selectedPlantId, refreshGrowthHandle, refreshPlantInfo]);

  return {
    contractAddress: mysteryGarden.address,
    isDeployed,
    canPlant,
    canGrow,
    canDecrypt,
    plant,
    grow,
    decryptGrowthHandle,
    markAsMature,
    refreshPlantCount,
    refreshGrowthHandle,
    refreshPlantInfo,
    isDecrypted,
    message,
    clear: clearGrowth?.clear,
    handle: growthHandle,
    isDecrypting,
    isRefreshing,
    isPlanting,
    isGrowing,
    isMature,
    plantCount,
    selectedPlantId,
    setSelectedPlantId,
  };
};


import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "MysteryGarden";

// <root>/backend
const rel = "../backend";

// <root>/frontend/abi
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/packages/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

// Network configuration mapping
const NETWORK_CONFIG = {
  localhost: { chainId: 31337, chainName: "hardhat" },
  hardhat: { chainId: 31337, chainName: "hardhat" },
  sepolia: { chainId: 11155111, chainName: "sepolia" },
};

function readDeployment(chainName, chainId, contractName) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);

  if (!fs.existsSync(chainDeploymentDir)) {
    return undefined;
  }

  const deploymentFile = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(deploymentFile)) {
    return undefined;
  }

  try {
    const jsonString = fs.readFileSync(deploymentFile, "utf-8");
    const obj = JSON.parse(jsonString);
    obj.chainId = chainId;
    obj.chainName = chainName;
    return obj;
  } catch (e) {
    console.warn(`Warning: Failed to read deployment for ${chainName}: ${e.message}`);
    return undefined;
  }
}

// Auto-discover all available deployments
const allDeployments = {};
let firstDeployment = null;

// Try to read deployments from known networks
const knownNetworksNotDeployed = [];
for (const [networkName, config] of Object.entries(NETWORK_CONFIG)) {
  const deployment = readDeployment(networkName, config.chainId, CONTRACT_NAME);
  if (deployment) {
    allDeployments[config.chainId.toString()] = {
      address: deployment.address,
      chainId: config.chainId,
      chainName: config.chainName,
    };
    if (!firstDeployment) {
      firstDeployment = deployment;
    }
    console.log(`Found deployment on ${config.chainName} (${config.chainId}): ${deployment.address}`);
  } else {
    // Track known networks that don't have deployments
    knownNetworksNotDeployed.push({
      networkName,
      chainName: config.chainName,
      chainId: config.chainId,
    });
  }
}

// Scan deployments directory for any other networks
if (fs.existsSync(deploymentsDir)) {
  const entries = fs.readdirSync(deploymentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const networkName = entry.name;
      // Skip if already processed
      if (NETWORK_CONFIG[networkName]) {
        continue;
      }
      
      // Try to read deployment from unknown network
      const deploymentFile = path.join(deploymentsDir, networkName, `${CONTRACT_NAME}.json`);
      if (fs.existsSync(deploymentFile)) {
        try {
          const jsonString = fs.readFileSync(deploymentFile, "utf-8");
          const obj = JSON.parse(jsonString);
          const chainId = obj.chainId || obj.receipt?.chainId;
          
          if (chainId) {
            allDeployments[chainId.toString()] = {
              address: obj.address,
              chainId: chainId,
              chainName: networkName,
            };
            if (!firstDeployment) {
              firstDeployment = { ...obj, chainId, chainName: networkName };
            }
            console.log(`Found deployment on ${networkName} (${chainId}): ${obj.address}`);
          }
          // If chainId is undefined, silently skip (no warning needed)
        } catch (e) {
          console.warn(`Warning: Failed to read deployment from ${networkName}: ${e.message}`);
        }
      }
    }
  }
}

// Validate ABI consistency across all deployments
if (firstDeployment) {
  for (const [chainId, deploymentInfo] of Object.entries(allDeployments)) {
    const networkName = deploymentInfo.chainName;
    const deployment = readDeployment(networkName, deploymentInfo.chainId, CONTRACT_NAME);
    if (deployment && JSON.stringify(deployment.abi) !== JSON.stringify(firstDeployment.abi)) {
      console.warn(
        `Warning: ABI mismatch detected! Deployment on ${networkName} (${chainId}) has different ABI than other deployments.`
      );
    }
  }
}

// Only show deployment warnings for known networks that don't have deployments
// Deduplicate by chainId to avoid duplicate messages for networks with same chainId
if (knownNetworksNotDeployed.length > 0) {
  const seenChainIds = new Set();
  const uniqueNetworks = [];
  for (const network of knownNetworksNotDeployed) {
    if (!seenChainIds.has(network.chainId)) {
      seenChainIds.add(network.chainId);
      uniqueNetworks.push(network);
    }
  }
  
  if (uniqueNetworks.length > 0) {
    console.log(`\nKnown networks without deployments:`);
    for (const network of uniqueNetworks) {
      console.log(`  - ${network.chainName} (${network.chainId}): Not deployed. Run 'npm run deploy:${network.networkName === "hardhat" ? "localhost" : network.networkName}' to deploy.`);
    }
    console.log();
  }
}


// Generate ABI from first available deployment, or use empty ABI if none found
const abi = firstDeployment ? firstDeployment.abi : [];

const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi }, null, 2)} as const;
`;

// Generate addresses object from all found deployments
const addressesEntries = Object.entries(allDeployments)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([chainId, info]) => {
    return `  "${chainId}": { address: "${info.address}", chainId: ${info.chainId}, chainName: "${info.chainName}" }`;
  })
  .join(",\n");

const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = {${addressesEntries ? "\n" + addressesEntries + "\n" : ""}};
`;

console.log(`\nGenerated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);
if (Object.keys(allDeployments).length > 0) {
  console.log(`\nFound ${Object.keys(allDeployments).length} deployment(s):`);
  for (const [chainId, info] of Object.entries(allDeployments)) {
    console.log(`  - ${info.chainName} (${chainId}): ${info.address}`);
  }
} else {
  console.log(`\nNo deployments found.`);
}
console.log();

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);


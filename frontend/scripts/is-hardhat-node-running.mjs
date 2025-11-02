import { JsonRpcProvider } from "ethers";

async function isHardhatNodeRunning() {
  try {
    const provider = new JsonRpcProvider("http://localhost:8545");
    const blockNumber = await provider.getBlockNumber();
    console.log(`Hardhat node is running at block ${blockNumber}`);
    return true;
  } catch (e) {
    console.log("Hardhat node is not running");
    return false;
  }
}

isHardhatNodeRunning().then((isRunning) => {
  if (!isRunning) {
    console.error("Please start Hardhat node first: cd backend && npx hardhat node");
    process.exit(1);
  }
});


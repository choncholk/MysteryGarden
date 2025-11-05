import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy MysteryGarden contract with FHEVM support
  const deployedMysteryGarden = await deploy("MysteryGarden", {
    from: deployer,
    log: true,
  });

  console.log(`MysteryGarden contract: `, deployedMysteryGarden.address);
};
export default func;
func.id = "deploy_mysteryGarden"; // id required to prevent reexecution
func.tags = ["MysteryGarden"];


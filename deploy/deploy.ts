import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deployment script for HoloIdVault contract
 * Deploys the FHE-enabled DID profile storage contract to specified network
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  console.log("Deploying HoloIdVault contract with account:", deployer);

  const holoIdVault = await deploy("HoloIdVault", {
    from: deployer,
    args: [],
    log: true,
    gasLimit: 8000000, // Set gas limit for deployment
    waitConfirmations: 1, // Wait for 1 confirmation
  });

  console.log("HoloIdVault deployed to:", holoIdVault.address);
  console.log("Deployment transaction:", holoIdVault.transactionHash);
  console.log("Block number:", holoIdVault.receipt?.blockNumber);

  // Verify deployment by checking if contract code exists
  const code = await hre.ethers.provider.getCode(holoIdVault.address);
  if (code === '0x') {
    throw new Error(`Contract deployment failed - no code at ${holoIdVault.address}`);
  }
  console.log("Contract verification successful ✓");
};

export default func;
func.tags = ["HoloIdVault"];





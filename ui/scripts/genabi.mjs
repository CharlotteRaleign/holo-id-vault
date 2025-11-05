import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const CONTRACT_NAME = 'HoloIdVault';

// Root hardhat project (one level up from ui)
const rootDir = resolve('..');
const deploymentsDir = join(rootDir, 'deployments');

// Output directory
const outDir = resolve('./src/config');
const abiFile = join(outDir, 'contracts.ts');

function readDeployment(chainName) {
  const chainDeploymentDir = join(deploymentsDir, chainName);
  
  if (!existsSync(chainDeploymentDir)) {
    console.warn(`⚠️  Deployment directory not found: ${chainDeploymentDir}`);
    console.warn(`   Run: npx hardhat deploy --network ${chainName}`);
    return null;
  }

  const jsonFile = join(chainDeploymentDir, `${CONTRACT_NAME}.json`);
  if (!existsSync(jsonFile)) {
    console.warn(`⚠️  Deployment file not found: ${jsonFile}`);
    return null;
  }

  try {
    const content = readFileSync(jsonFile, 'utf-8');
    const deployment = JSON.parse(content);
    return {
      address: deployment.address,
      abi: deployment.abi,
      chainName,
    };
  } catch (error) {
    console.error(`❌ Error reading deployment: ${error.message}`);
    return null;
  }
}

// Read deployments
const localhostDeploy = readDeployment('localhost');
const sepoliaDeploy = readDeployment('sepolia');

// Determine which deployment to use
let deploy = localhostDeploy || sepoliaDeploy;

if (!deploy) {
  console.error('❌ No deployment found. Please deploy the contract first:');
  console.error('   npx hardhat deploy --network localhost');
  process.exit(1);
}

// Generate TypeScript code
const tsCode = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
  Last updated: ${new Date().toISOString()}
*/

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: Record<number, \`0x\${string}\`> = {
  ${localhostDeploy ? `31337: "${localhostDeploy.address}", // Local Hardhat network` : ''}
  ${sepoliaDeploy ? `11155111: "${sepoliaDeploy.address}", // Sepolia testnet` : ''}
} as const;

export const CONTRACT_ABI = ${JSON.stringify(deploy.abi, null, 2)} as const;

// Deployment info
export const DEPLOYMENT_INFO = {
  ${localhostDeploy ? `localhost: { address: '${localhostDeploy.address}' },` : 'localhost: null,'}
  ${sepoliaDeploy ? `sepolia: { address: '${sepoliaDeploy.address}' },` : 'sepolia: null,'}
} as const;
`;

// Write file
writeFileSync(abiFile, tsCode, 'utf-8');

console.log(`✅ Generated: ${abiFile}`);
console.log(`   Contract: ${CONTRACT_NAME}`);
console.log(`   Address: ${deploy.address}`);
console.log(`   Chain: ${deploy.chainName}`);

if (localhostDeploy && sepoliaDeploy) {
  console.log(`\n📋 Both networks available:`);
  console.log(`   Localhost: ${localhostDeploy.address}`);
  console.log(`   Sepolia: ${sepoliaDeploy.address}`);
}

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, localhost } from "wagmi/chains";
import { http } from "wagmi";

// Custom Hardhat local chain to match your Hardhat node (chainId 31337)
const hardhat = {
  ...localhost,
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const appChains = [hardhat, sepolia] as const;

// WalletConnect Project ID
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '88306a972a77389d91871e08d26516af';

export const config = getDefaultConfig({
  appName: 'EncryptedNotes',
  projectId: projectId,
  chains: appChains,
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
  },
  ssr: false,
});


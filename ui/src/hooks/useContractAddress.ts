import { useChainId } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';

/**
 * Hook to get the contract address based on the current network
 */
export function useContractAddress(): `0x${string}` {
  const chainId = useChainId();
  
  const address = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  
  if (!address) {
    console.warn(`Unknown chain ID: ${chainId}, using localhost address`);
    return CONTRACT_ADDRESSES[31337];
  }
  
  return address;
}


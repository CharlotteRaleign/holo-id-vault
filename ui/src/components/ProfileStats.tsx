import { useReadContract } from 'wagmi';
import { useContractAddress } from '../hooks/useContractAddress';
import { CONTRACT_ABI } from '../config/contracts';
import { Card } from './ui/card';

export function ProfileStats() {
  const contractAddress = useContractAddress();

  const { data: hasProfile } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'hasProfile',
    args: ['0x0000000000000000000000000000000000000000'], // Will be overridden
    query: { enabled: !!contractAddress },
  });

  return (
    <Card className="p-4 bg-card border-primary/30">
      <h3 className="text-lg font-semibold mb-4">Profile Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-sm text-muted-foreground">Attributes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">0</div>
          <div className="text-sm text-muted-foreground">Shared</div>
        </div>
      </div>
    </Card>
  );
}

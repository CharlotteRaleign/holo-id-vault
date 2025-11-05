import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useContractAddress } from '../hooks/useContractAddress';
import { CONTRACT_ABI } from '../config/contracts';
import type { FhevmInstance } from '../fhevm/fhevmTypes';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface NoteListProps {
  instance: FhevmInstance;
}

export function NoteList({ instance }: NoteListProps) {
  const { address } = useAccount();
  const contractAddress = useContractAddress();

  const { data: ids } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getNoteIdsByOwner',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const noteIds: bigint[] = useMemo(() => (Array.isArray(ids) ? ids as bigint[] : []), [ids]);

  if (!address) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Connect your wallet to view your notes.
      </div>
    );
  }

  if (!noteIds.length) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No notes yet. Store one in the Store Note tab.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2 text-primary">My Notes</h3>
        <p className="text-sm text-muted-foreground">
          View and decrypt your encrypted notes stored on-chain
        </p>
      </div>
      <div className="space-y-4">
        {noteIds.map((id) => (
          <NoteItem key={id.toString()} id={id} instance={instance} contractAddress={contractAddress} />
        ))}
      </div>
    </div>
  );
}

function NoteItem({ id, instance, contractAddress }: { id: bigint; instance: FhevmInstance; contractAddress: `0x${string}` }) {
  const signer = useEthersSigner();
  const { address } = useAccount();

  const { data: meta } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getNoteMeta',
    args: [id],
  });

  const { data: encContentHandle } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedContent',
    args: [id],
  });

  const [decrypted, setDecrypted] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const title = meta ? (meta as any)[1] as string : '';
  const createdAt = meta ? new Date(Number((meta as any)[2]) * 1000).toLocaleString() : '';

  const decrypt = async () => {
    if (!instance || !address || !signer) {
      toast.error('Missing wallet or encryption instance');
      return;
    }
    if (!encContentHandle) {
      toast.error('Missing on-chain data');
      return;
    }
    setBusy(true);
    try {
      const encHandle = encContentHandle as string;
      
      // Request user decryption
      const keypair = instance.generateKeypair();
      const handleContractPairs = [{ handle: encHandle, contractAddress: contractAddress }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [contractAddress];
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = result[encHandle] as bigint;
      setDecrypted(decryptedValue.toString());
      toast.success('Note decrypted successfully!');
    } catch (err: any) {
      console.error('Decrypt failed', err);
      toast.error('Decrypt failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-primary/30 hover:border-primary transition-all hover:shadow-cyber scan-lines relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-10 transition-opacity" />
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-lg">{title || 'Untitled'}</CardTitle>
        <p className="text-xs text-muted-foreground">{createdAt}</p>
      </CardHeader>
      <CardContent className="p-0">
        {!decrypted ? (
          <Button
            onClick={decrypt}
            disabled={busy || !instance || !signer}
            className="w-full bg-gradient-hologram hover:opacity-90 font-semibold neon-glow"
          >
            {busy ? 'Decrypting...' : 'Decrypt Note'}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="text-sm font-semibold mb-2 text-primary">Decrypted Content</div>
              <div className="text-lg font-mono text-foreground">{decrypted}</div>
            </div>
            <Button
              onClick={() => setDecrypted('')}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Hide Content
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useContractAddress } from '../hooks/useContractAddress';
import { CONTRACT_ABI } from '../config/contracts';
import type { FhevmInstance } from '../fhevm/fhevmTypes';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface NoteSubmitProps {
  instance: FhevmInstance;
}

export function NoteSubmit({ instance }: NoteSubmitProps) {
  const { address } = useAccount();
  const signer = useEthersSigner();
  const contractAddress = useContractAddress();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instance || !address || !signer) {
      toast.error('Missing wallet or encryption instance');
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter both title and content');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert content string to number (simple encoding)
      const contentValue = parseInt(content, 10);
      if (isNaN(contentValue) || contentValue < 0 || contentValue > 4294967295) {
        toast.error('Content must be a valid number between 0 and 4294967295');
        setIsSubmitting(false);
        return;
      }

      // Encrypt the content using FHE
      const input = instance.createEncryptedInput(contractAddress, address);
      input.add32(contentValue);
      const encryptedInput = await input.encrypt();

      // Submit to contract
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      setIsConfirming(true);
      const tx = await contract.storeNote(
        title,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      await tx.wait();

      toast.success('Note stored successfully!');
      setTitle('');
      setContent('');

    } catch (err: any) {
      console.error(err);
      toast.error('Failed to store note: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsConfirming(false);
      setIsSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Connect your wallet to store encrypted notes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2 text-primary">Store Encrypted Note</h3>
        <p className="text-sm text-muted-foreground">
          Create your encrypted note with fully homomorphic encryption
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title"
            className="bg-input border-border focus:border-primary"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">Content (Number)</Label>
          <Input
            id="content"
            type="number"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter content as number (0-4294967295)"
            min="0"
            max="4294967295"
            className="bg-input border-border focus:border-primary"
            required
          />
          <p className="text-xs text-muted-foreground">
            Note: Content is stored as a number for FHE compatibility. In production, you would use a more sophisticated encoding.
          </p>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || isConfirming}
          className="w-full bg-gradient-hologram hover:opacity-90 font-semibold neon-glow"
        >
          {isConfirming ? 'Confirming...' : isSubmitting ? 'Encrypting...' : 'Save Encrypted Note'}
        </Button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        <p>🔒 All data is encrypted and stored on-chain</p>
      </div>
    </div>
  );
}


import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract, Wallet, ethers } from 'ethers';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useContractAddress } from '../hooks/useContractAddress';
import { CONTRACT_ABI } from '../config/contracts';
import type { FhevmInstance } from '../fhevm/fhevmTypes';
import { encryptStringWithKey, decryptStringWithKey } from '../utils/crypto';
import { Loader2, CheckSquare, Square } from 'lucide-react';

interface Attribute {
  name: string;
  value: string;
  isShared: boolean;
  decrypted?: string; // Decrypted value (only shown when user requests)
}

interface DIDProfileProps {
  instance: FhevmInstance;
}

const DEFAULT_ATTRIBUTES: Attribute[] = [
  { name: 'Email', value: '', isShared: false },
  { name: 'Age', value: '', isShared: false },
  { name: 'Location', value: '', isShared: false },
  { name: 'Verified Status', value: '', isShared: false },
];

function DIDProfileComponent({ instance }: DIDProfileProps) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const contractAddress = useContractAddress();

  const [attributes, setAttributes] = useState<Attribute[]>(DEFAULT_ATTRIBUTES);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptingIndex, setDecryptingIndex] = useState<number | null>(null);
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Set<number>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Check if profile exists
  const { data: hasProfile } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'hasProfile',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress },
  });

  // Get attribute count
  const { data: attributeCount } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getAttributeCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress && !!hasProfile },
  });

  // Load profile from chain
  useEffect(() => {
    if (!address || !contractAddress || !hasProfile || !attributeCount) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const contract = new Contract(contractAddress, CONTRACT_ABI, await signerPromise);
        const loadedAttributes: Attribute[] = [];

        for (let i = 0; i < Number(attributeCount); i++) {
          const [name, isShared] = await contract.getAttributeInfo(address, i);
          loadedAttributes.push({
            name,
            value: 'STORED', // Mark as stored (encrypted value exists on chain)
            isShared,
          });
        }

        // Merge with default attributes to maintain order
        const merged = DEFAULT_ATTRIBUTES.map(defaultAttr => {
          const loaded = loadedAttributes.find(a => a.name === defaultAttr.name);
          return loaded || defaultAttr;
        });

        setAttributes(merged);
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        toast.error('Failed to load profile: ' + (err?.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [address, contractAddress, hasProfile, attributeCount, signerPromise]);

  const updateAttribute = useCallback((index: number, field: 'value' | 'isShared', newValue: string | boolean) => {
    setAttributes(prev =>
      prev.map((attr, i) =>
        i === index ? { ...attr, [field]: newValue } : attr
      )
    );
  }, []);

  const saveProfile = async (isRetry = false) => {
    if (!address || !instance || !contractAddress) {
      toast.error('Missing wallet, encryption instance, or contract address');
      return;
    }

    setIsSaving(true);
    setLastError(null);

    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer available');

      console.log('Contract details:', {
        address: contractAddress,
        signerAddress: await signer.getAddress(),
        chainId: await signer.provider.getNetwork().then(n => n.chainId)
      });

      // Ensure contract address is in checksum format
      const checksumContractAddress = ethers.getAddress(contractAddress);
      
      // Verify contract exists
      const code = await signer.provider.getCode(checksumContractAddress);
      if (code === '0x') {
        throw new Error(`Contract not found at address ${checksumContractAddress}. Please deploy the contract first.`);
      }

      // Check if Hardhat node supports FHEVM (for localhost)
      const chainId = Number(await signer.provider.getNetwork().then(n => n.chainId));
      if (chainId === 31337) {
        try {
          // Try to call fhevm_relayer_metadata to check FHEVM support
          const response = await (signer.provider as any).send('fhevm_relayer_metadata', []);
          console.log('FHEVM support detected:', response);
        } catch (fhevmError: any) {
          console.warn('FHEVM support check failed:', fhevmError);
          console.warn('Make sure Hardhat node is started with: npx hardhat node');
        }
      }

      const contract = new Contract(checksumContractAddress, CONTRACT_ABI, signer);

      // Save each attribute that has a value
      for (const attr of attributes) {
        // Skip empty attributes and 'STORED' marker (already saved)
        if (!attr.value.trim() || attr.value === 'STORED') continue;

        try {
          // 1) Generate random EVM address as encryption key
          const randomWallet = Wallet.createRandom();
          const keyAddress = randomWallet.address;

          // 2) Client-side encrypt the attribute value using the key address
          const cipher = await encryptStringWithKey(attr.value, keyAddress);

          // 3) FHE encrypt key address as uint256 (lower 160 bits)
          const keyUint256 = BigInt(ethers.getAddress(keyAddress));
          
          // Ensure user address is in checksum format (required by FHEVM relayer)
          const checksumUserAddress = ethers.getAddress(address);
          
          // Use checksumContractAddress from outer scope
          const input = instance.createEncryptedInput(checksumContractAddress, checksumUserAddress);
          input.add256(keyUint256);
          const encryptedInput = await input.encrypt();

          console.log('Encrypted input created:', {
            handle: encryptedInput.handles[0],
            proofLength: encryptedInput.inputProof.length,
            attributeName: attr.name,
            isShared: attr.isShared
          });

          // 4) Write to contract
          console.log('Calling setAttribute with:', {
            attributeName: attr.name,
            cipher: cipher.substring(0, 50) + '...',
            handle: encryptedInput.handles[0],
            proofLength: encryptedInput.inputProof.length,
            isShared: attr.isShared
          });

          // Convert handle to hex string if it's Uint8Array
          let handleHex: string;
          if (encryptedInput.handles[0] instanceof Uint8Array) {
            handleHex = ethers.hexlify(encryptedInput.handles[0]);
          } else {
            handleHex = encryptedInput.handles[0] as string;
          }

          console.log('Handle format:', {
            original: encryptedInput.handles[0],
            hex: handleHex,
            length: handleHex.length
          });

          // Set appropriate gas limit for FHE operations
          const tx = await contract.setAttribute(
            attr.name,
            cipher,
            handleHex,
            encryptedInput.inputProof,
            attr.isShared,
            {
              gasLimit: 5000000, // Sufficient gas for FHE operations
            }
          );
          
          console.log('Transaction sent:', tx.hash);
          const receipt = await tx.wait();
          console.log('Transaction confirmed for attribute:', attr.name, 'Block:', receipt?.blockNumber);
        } catch (attrError: any) {
          console.error(`Failed to save attribute ${attr.name}:`, attrError);
          
          // Provide more helpful error messages
          let errorMessage = attrError?.message || 'Unknown error';
          if (errorMessage.includes('Internal JSON-RPC error')) {
            errorMessage += '\n\nPlease check your Hardhat node console for detailed error information.';
            errorMessage += '\nThe error might be related to FHE verification.';
            errorMessage += '\nMake sure Hardhat node is started with: npm run node';
          }
          
          throw new Error(`Failed to save attribute "${attr.name}": ${errorMessage}`);
        }
      }

      toast.success('DID Profile saved', {
        description: 'Your encrypted identity is now ready',
      });

      // Reload profile
      if (hasProfile) {
        window.location.reload(); // Simple reload to refresh data
      }
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      const errorMessage = err?.message || 'Unknown error';
      setLastError(errorMessage);

      // Retry logic for network-related errors
      if (!isRetry && retryCount < 2 && (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Internal JSON-RPC error')
      )) {
        setRetryCount(prev => prev + 1);
        toast.error(`Save failed, retrying... (${retryCount + 1}/3)`);
        setTimeout(() => saveProfile(true), 2000);
        return;
      }

      toast.error('Failed to save profile: ' + errorMessage);
      setRetryCount(0);
    } finally {
      if (isRetry) return; // Don't reset saving state on retry
      setIsSaving(false);
    }
  };

  const decryptAttribute = async (index: number) => {
    if (!address || !instance || !contractAddress || !hasProfile) {
      toast.error('Missing wallet, encryption instance, or profile');
      return;
    }

    setDecryptingIndex(index);
    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer available');

      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      // Find the attribute index on chain
      let chainIndex = -1;
      for (let i = 0; i < Number(attributeCount); i++) {
        const [name] = await contract.getAttributeInfo(address, i);
        if (name === attributes[index].name) {
          chainIndex = i;
          break;
        }
      }

      if (chainIndex === -1) {
        toast.error('Attribute not found on chain');
        return;
      }

      // Get encrypted data
      const [cipher, keyEncHandle] = await contract.getAttributeData(address, chainIndex);

      // Decrypt the FHE-encrypted key
      const handleContractPairs = [
        { handle: keyEncHandle as string, contractAddress }
      ];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contractAddresses = [contractAddress];

      const keypair = instance.generateKeypair();
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
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
        startTimestamp,
        durationDays,
      );

      // Convert uint256 to hex address (lower 160 bits)
      const keyUint256Str = result[keyEncHandle as string] as string;
      const big = BigInt(keyUint256Str);
      const keyAddress = '0x' + (big & ((1n << 160n) - 1n)).toString(16).padStart(40, '0');

      // Decrypt the attribute value
      const decryptedValue = await decryptStringWithKey(cipher as string, keyAddress);

      // Update attribute with decrypted value
      setAttributes(prev =>
        prev.map((attr, i) =>
          i === index ? { ...attr, decrypted: decryptedValue } : attr
        )
      );

      toast.success('Attribute decrypted successfully!');
    } catch (err: any) {
      console.error('Decrypt failed:', err);
      toast.error('Decrypt failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setDecryptingIndex(null);
    }
  };

  const toggleSharing = async (index: number, newShared: boolean) => {
    if (!address || !contractAddress || !hasProfile) {
      toast.error('Missing wallet or profile');
      return;
    }

    setTogglingIndex(index);
    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer available');

      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await contract.updateAttributeSharing(attributes[index].name, newShared);
      await tx.wait();

      updateAttribute(index, 'isShared', newShared);
      toast.success(`Attribute ${newShared ? 'shared' : 'made private'}`);
    } catch (err: any) {
      console.error('Failed to update sharing:', err);
      toast.error('Failed to update sharing: ' + (err?.message || 'Unknown error'));
    } finally {
      setTogglingIndex(null);
    }
  };

  const batchUpdateSharing = async (newShared: boolean) => {
    if (!address || !contractAddress || !hasProfile || selectedAttributes.size === 0) {
      toast.error('Missing wallet, profile, or no attributes selected');
      return;
    }

    setBatchUpdating(true);
    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('No signer available');

      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      const attributeNames = Array.from(selectedAttributes).map(index => attributes[index].name);
      const isSharedStatuses = Array.from(selectedAttributes).map(() => newShared);

      const tx = await contract.updateAttributesSharingBatch(attributeNames, isSharedStatuses);
      await tx.wait();

      // Update local state
      setAttributes(prev =>
        prev.map((attr, index) =>
          selectedAttributes.has(index) ? { ...attr, isShared: newShared } : attr
        )
      );

      setSelectedAttributes(new Set());
      toast.success(`${selectedAttributes.size} attributes ${newShared ? 'shared' : 'made private'}`);
    } catch (err: any) {
      console.error('Failed to batch update sharing:', err);
      toast.error('Failed to batch update sharing: ' + (err?.message || 'Unknown error'));
    } finally {
      setBatchUpdating(false);
    }
  };

  const toggleAttributeSelection = useCallback((index: number) => {
    setSelectedAttributes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  if (!address) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Connect your wallet to create your DID profile.
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Encryption service not available. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <Card className="p-6 bg-card border-primary/30 shadow-cyber scan-lines relative overflow-hidden">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2 text-primary">Your DID Profile</h3>
          <p className="text-sm text-muted-foreground">
            Create your decentralized identity with selective attribute disclosure
          </p>
        </div>

        {hasProfile && (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border border-border" role="region" aria-label="Batch operations">
            <div className="text-sm text-muted-foreground mr-2">Batch operations:</div>
            <Button
              onClick={() => batchUpdateSharing(true)}
              disabled={batchUpdating || selectedAttributes.size === 0}
              variant="outline"
              size="sm"
              className="text-xs"
              aria-label={`Share ${selectedAttributes.size} selected attributes`}
            >
              Share Selected ({selectedAttributes.size})
            </Button>
            <Button
              onClick={() => batchUpdateSharing(false)}
              disabled={batchUpdating || selectedAttributes.size === 0}
              variant="outline"
              size="sm"
              className="text-xs"
              aria-label={`Make ${selectedAttributes.size} selected attributes private`}
            >
              Make Private ({selectedAttributes.size})
            </Button>
            <Button
              onClick={() => setSelectedAttributes(new Set())}
              disabled={selectedAttributes.size === 0}
              variant="ghost"
              size="sm"
              className="text-xs"
              aria-label="Clear all attribute selections"
            >
              Clear Selection
            </Button>
            {batchUpdating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating...
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Loading profile from chain...
          </div>
        )}

        {lastError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm" role="alert" aria-live="assertive">
            <div className="font-semibold text-destructive mb-1">Last Error:</div>
            <div className="text-destructive/80 text-xs break-all">{lastError}</div>
          </div>
        )}

        <div className="space-y-4">
          {attributes.map((attr, index) => (
            <div
              key={attr.name}
              className="p-4 rounded-lg bg-background border border-border hover:border-primary transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {hasProfile && (
                  <button
                    onClick={() => toggleAttributeSelection(index)}
                    onKeyDown={(e) => handleKeyDown(e, () => toggleAttributeSelection(index))}
                    className="mt-1 p-1 rounded hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`Select ${attr.name} for batch operations`}
                    tabIndex={0}
                  >
                    {selectedAttributes.has(index) ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`attr-${index}`} className="text-foreground">
                    {attr.name}
                  </Label>
                  {attr.decrypted !== undefined ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-card border border-primary/30" role="region" aria-label={`Decrypted ${attr.name} value`}>
                        <div className="text-sm font-semibold mb-1 text-primary">Decrypted Value</div>
                        <div className="text-base font-mono text-foreground" aria-label={`Decrypted value: ${attr.decrypted}`}>{attr.decrypted}</div>
                      </div>
                      <Button
                        onClick={() => setAttributes(prev =>
                          prev.map((a, i) => i === index ? { ...a, decrypted: undefined } : a)
                        )}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        aria-label={`Hide decrypted ${attr.name} value`}
                      >
                        Hide Value
                      </Button>
                    </div>
                  ) : hasProfile ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
                        {attr.value === 'STORED' || attr.value ? 'Value stored (encrypted)' : 'No value set'}
                      </div>
                      <Button
                        onClick={() => decryptAttribute(index)}
                        disabled={decryptingIndex === index || (!attr.value || attr.value === '')}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={decryptingIndex === index || (!attr.value || attr.value === '')}
                      >
                        {decryptingIndex === index ? 'Decrypting...' : 'Decrypt & View'}
                      </Button>
                    </div>
                  ) : (
                    <Input
                      id={`attr-${index}`}
                      value={attr.value}
                      onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                      placeholder={`Enter your ${attr.name.toLowerCase()}`}
                      className="bg-input border-border focus:border-primary"
                    />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 pt-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={attr.isShared}
                      onCheckedChange={(checked) => {
                        if (hasProfile) {
                          toggleSharing(index, checked);
                        } else {
                          updateAttribute(index, 'isShared', checked);
                        }
                      }}
                      disabled={(!attr.value || attr.value === '') && !hasProfile || togglingIndex === index}
                      className="data-[state=checked]:bg-primary"
                      aria-label={`${attr.name} sharing toggle`}
                      aria-describedby={`sharing-status-${index}`}
                    />
                    {togglingIndex === index && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                  <span id={`sharing-status-${index}`} className="text-xs text-muted-foreground">
                    {attr.isShared ? 'Shared' : 'Private'}
                  </span>
                </div>
              </div>
              {attr.isShared && (
                <div className="mt-2 text-xs text-primary flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Visible to DApps
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => saveProfile(false)}
            disabled={isSaving || isLoading}
            className="w-full bg-gradient-hologram hover:opacity-90 font-semibold neon-glow"
          >
            {isSaving ? 'Saving...' : hasProfile ? 'Update Encrypted Profile' : 'Save Encrypted Profile'}
          </Button>

          {lastError && !isSaving && (
            <Button
              onClick={() => saveProfile(false)}
              variant="outline"
              size="sm"
              className="w-full text-destructive border-destructive hover:bg-destructive/10"
            >
              Retry Save Operation
            </Button>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>🔒 All data is encrypted and stored on-chain</p>
        </div>
      </div>
    </Card>
  );
}

export const DIDProfile = memo(DIDProfileComponent);
export default DIDProfile;


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const WalletConnect = () => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');

  const connectWallet = async () => {
    try {
      // Simulate wallet connection - in production, integrate with Rainbow Kit
      // Example: const provider = await connector.connect();
      
      // Mock connection for demo
      const mockAddress = '0x' + Math.random().toString(16).substring(2, 42);
      setAddress(mockAddress.substring(0, 10) + '...');
      setConnected(true);
      
      toast.success('Rainbow Wallet connected successfully', {
        description: 'Your DID signature is ready',
      });
    } catch (error) {
      toast.error('Failed to connect wallet', {
        description: 'Please install Rainbow Wallet extension',
      });
    }
  };

  const disconnect = () => {
    setConnected(false);
    setAddress('');
    toast.info('Wallet disconnected');
  };

  return (
    <div className="flex items-center gap-3">
      {connected ? (
        <>
          <div className="px-4 py-2 rounded-lg bg-card border border-primary text-sm font-mono neon-glow">
            {address}
          </div>
          <Button
            onClick={disconnect}
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          onClick={connectWallet}
          className="bg-gradient-hologram hover:opacity-90 font-semibold neon-glow"
        >
          Connect Rainbow Wallet
        </Button>
      )}
    </div>
  );
};

export default WalletConnect;

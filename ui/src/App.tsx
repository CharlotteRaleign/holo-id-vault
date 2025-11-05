import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useFhevm } from './fhevm/useFhevm';
import { useWalletClient } from 'wagmi';
import { DIDProfile } from './components/DIDProfile';
import { Lock, Loader2, Shield } from 'lucide-react';

function App() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  
  const provider = walletClient ? (walletClient as any) : undefined;
  
  const { instance, status, error } = useFhevm({
    provider,
    chainId,
    enabled: !!provider && !!chainId,
    initialMockChains: { 31337: "http://127.0.0.1:8545" },
  });

  return (
    <div className="min-h-screen bg-gradient-cyber relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      
      {/* Gradient glow effects */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-glow blur-3xl opacity-30" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-glow blur-3xl opacity-30" />
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-6 flex items-center justify-between border-b border-primary/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-hologram flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-hologram bg-clip-text text-transparent">
                MetaIdentity Hub
              </h1>
              <p className="text-xs text-muted-foreground">Decentralized Identity Protocol</p>
            </div>
          </div>
          <ConnectButton
            showBalance={{ smallScreen: false, largeScreen: true }}
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
          />
        </header>

        {/* FHE Status */}
        {status === 'loading' && (
          <div className="container mx-auto px-6 py-4">
            <div className="max-w-3xl mx-auto p-6 bg-card border border-primary/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="font-semibold text-primary">Initializing Encryption Service</p>
                  <p className="text-sm text-muted-foreground">Setting up FHEVM environment and cryptographic keys...</p>
                </div>
              </div>
              <div className="mt-4 w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <div className="container mx-auto px-6 py-4">
            <div className="max-w-3xl mx-auto p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-500 font-semibold">⚠️ Encryption Service Error:</p>
              <p className="text-sm text-yellow-500/80 mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        {status === 'idle' || status === 'loading' ? (
          <div className="container mx-auto px-6 py-16 text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="inline-block mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-hologram flex items-center justify-center mx-auto">
                  <Lock className="w-16 h-16 text-primary-foreground" />
                </div>
              </div>
              
              <h2 className="text-5xl md:text-6xl font-bold bg-gradient-hologram bg-clip-text text-transparent leading-tight">
                Selective Transparency.
                <br />
                Total Control.
              </h2>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Create encrypted DID profiles and reveal only selected attributes when interacting with DApps.
                Your identity, your rules.
              </p>

              <div className="flex flex-wrap gap-4 justify-center items-center pt-4">
                <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 text-sm">
                  <span className="text-muted-foreground">Protocol:</span>{' '}
                  <span className="font-mono text-primary">DID v2.0</span>
                </div>
                <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 text-sm">
                  <span className="text-muted-foreground">Chain:</span>{' '}
                  <span className="font-mono text-primary">Ethereum</span>
                </div>
                <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 text-sm">
                  <span className="text-muted-foreground">Encryption:</span>{' '}
                  <span className="font-mono text-primary flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    AES-256 + FHE
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* DID Profile Section */}
        {status === 'ready' && instance ? (
          <section className="container mx-auto px-6 py-16">
            <div className="max-w-3xl mx-auto">
              <DIDProfile instance={instance} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default App;






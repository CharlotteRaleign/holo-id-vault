import { useAccount, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useFhevm } from './fhevm/useFhevm';
import { useWalletClient } from 'wagmi';
import { DIDProfile } from './components/DIDProfile';
import { Lock, Loader2, Shield, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';

function App() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const particlesRef = useRef<HTMLDivElement>(null);
  const raysRef = useRef<HTMLDivElement>(null);
  const streamsRef = useRef<HTMLDivElement>(null);
  
  const provider = walletClient ? (walletClient as any) : undefined;
  
  const { instance, status, error } = useFhevm({
    provider,
    chainId,
    enabled: !!provider && !!chainId,
    initialMockChains: { 31337: "http://127.0.0.1:8545" },
  });

  // Generate floating particles
  useEffect(() => {
    if (!particlesRef.current) return;
    
    const particleCount = 30;
    const particles = particlesRef.current;
    particles.innerHTML = '';
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.animationDuration = `${10 + Math.random() * 10}s`;
      particles.appendChild(particle);
    }
  }, []);

  // Generate light rays
  useEffect(() => {
    if (!raysRef.current) return;
    
    const rayCount = 5;
    const rays = raysRef.current;
    rays.innerHTML = '';
    
    for (let i = 0; i < rayCount; i++) {
      const ray = document.createElement('div');
      ray.className = 'light-ray';
      ray.style.left = `${(i / rayCount) * 100}%`;
      ray.style.animationDelay = `${i * 1.6}s`;
      rays.appendChild(ray);
    }
  }, []);

  // Generate data streams
  useEffect(() => {
    if (!streamsRef.current) return;
    
    const streamCount = 8;
    const streams = streamsRef.current;
    streams.innerHTML = '';
    
    for (let i = 0; i < streamCount; i++) {
      const stream = document.createElement('div');
      stream.className = 'data-stream';
      stream.style.left = `${(i / streamCount) * 100}%`;
      stream.style.animationDelay = `${i * 0.4}s`;
      stream.style.animationDuration = `${2 + Math.random() * 2}s`;
      streams.appendChild(stream);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-cyber relative overflow-hidden glitch-bg">
      {/* Enhanced animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      
      {/* Multiple gradient orbs with animation */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      
      {/* Additional gradient glow effects */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-glow blur-3xl opacity-30 animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-glow blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-gradient-glow-purple blur-3xl opacity-25" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-glow-cyan blur-3xl opacity-20" />
      
      {/* Floating particles */}
      <div ref={particlesRef} className="particles" />
      
      {/* Light rays */}
      <div ref={raysRef} className="light-rays" />
      
      {/* Data streams */}
      <div ref={streamsRef} className="absolute inset-0 overflow-hidden pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-6 flex items-center justify-between border-b border-primary/20 backdrop-blur-sm bg-background/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-hologram flex items-center justify-center shadow-neon">
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
            <div className="max-w-3xl mx-auto p-6 bg-card border border-primary/30 rounded-lg backdrop-blur-sm">
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
            <div className="max-w-3xl mx-auto p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
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
                <div className="w-32 h-32 rounded-full bg-gradient-hologram flex items-center justify-center mx-auto shadow-neon animate-pulse">
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
                <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 text-sm backdrop-blur-sm hover:border-primary/50 transition-colors">
                  <span className="text-muted-foreground">Protocol:</span>{' '}
                  <span className="font-mono text-primary flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    DID v2.0
                  </span>
                </div>
                <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 text-sm backdrop-blur-sm hover:border-primary/50 transition-colors">
                  <span className="text-muted-foreground">Chain:</span>{' '}
                  <span className="font-mono text-primary flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Ethereum Sepolia
                  </span>
                </div>
                <div className="px-6 py-3 rounded-lg bg-card border border-primary/30 text-sm backdrop-blur-sm hover:border-primary/50 transition-colors">
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






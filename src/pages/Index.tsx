import IrisLogo from '@/components/IrisLogo';
import WalletConnect from '@/components/WalletConnect';
import DIDProfile from '@/components/DIDProfile';

const Index = () => {
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
            <IrisLogo size={60} />
            <div>
              <h1 className="text-2xl font-bold text-primary">MetaIdentity Hub</h1>
              <p className="text-xs text-muted-foreground">Decentralized Identity Protocol</p>
            </div>
          </div>
          <WalletConnect />
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-block mb-4">
              <IrisLogo size={120} />
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
                <span className="font-mono text-primary">AES-256</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                title: 'Zero-Knowledge Proofs',
                description: 'Verify attributes without revealing actual data',
                icon: '🔐',
              },
              {
                title: 'Selective Disclosure',
                description: 'Choose exactly what to share with each DApp',
                icon: '🎯',
              },
              {
                title: 'On-Chain Storage',
                description: 'Encrypted profiles stored on decentralized networks',
                icon: '⛓️',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-lg bg-card border border-primary/30 hover:border-primary transition-all hover:shadow-cyber scan-lines relative overflow-hidden group"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-primary">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-10 transition-opacity" />
              </div>
            ))}
          </div>

          {/* DID Profile Section */}
          <div className="max-w-3xl mx-auto">
            <DIDProfile />
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-6 py-16 border-t border-primary/20">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Active DIDs', value: '24,563' },
              { label: 'DApps Integrated', value: '142' },
              { label: 'Transactions', value: '1.2M' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-primary mb-2 hologram">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;

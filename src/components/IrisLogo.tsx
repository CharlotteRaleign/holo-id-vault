const IrisLogo = ({ size = 80 }: { size?: number }) => {
  return (
    <div 
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer rotating ring */}
      <div className="absolute inset-0 rounded-full border-2 border-primary animate-spin" style={{ animationDuration: '8s' }}>
        <div className="absolute top-0 left-1/2 w-1 h-3 bg-primary -translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-1 h-3 bg-primary -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 w-3 h-1 bg-primary -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 w-3 h-1 bg-primary -translate-y-1/2" />
      </div>
      
      {/* Middle iris shards */}
      <div className="absolute inset-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              transform: `rotate(${i * 45}deg)`,
            }}
          >
            <div 
              className="absolute top-0 left-1/2 w-0.5 bg-gradient-to-b from-accent to-transparent -translate-x-1/2 neon-glow"
              style={{ 
                height: `${size * 0.35}px`,
                animation: `pulse ${2 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Center core */}
      <div className="absolute inset-1/4 rounded-full bg-gradient-hologram neon-glow animate-pulse" style={{ animationDuration: '3s' }} />
      
      {/* Inner core */}
      <div className="absolute inset-1/3 rounded-full bg-primary opacity-80 blur-sm" />
    </div>
  );
};

export default IrisLogo;

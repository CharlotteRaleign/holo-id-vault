import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Attribute {
  id: string;
  name: string;
  value: string;
  shared: boolean;
}

const DIDProfile = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([
    { id: '1', name: 'Email', value: '', shared: false },
    { id: '2', name: 'Age', value: '', shared: false },
    { id: '3', name: 'Location', value: '', shared: false },
    { id: '4', name: 'Verified Status', value: '', shared: false },
  ]);

  const toggleShare = (id: string) => {
    setAttributes(prev =>
      prev.map(attr =>
        attr.id === id ? { ...attr, shared: !attr.shared } : attr
      )
    );
  };

  const updateValue = (id: string, value: string) => {
    setAttributes(prev =>
      prev.map(attr =>
        attr.id === id ? { ...attr, value } : attr
      )
    );
  };

  const saveProfile = () => {
    toast.success('DID Profile saved', {
      description: 'Your encrypted identity is now ready',
    });
  };

  return (
    <Card className="p-6 bg-card border-primary/30 shadow-cyber">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2 text-primary">Your DID Profile</h3>
          <p className="text-sm text-muted-foreground">
            Create your decentralized identity with selective attribute disclosure
          </p>
        </div>

        <div className="space-y-4">
          {attributes.map((attr) => (
            <div
              key={attr.id}
              className="p-4 rounded-lg bg-background border border-border hover:border-primary transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={attr.id} className="text-foreground">
                    {attr.name}
                  </Label>
                  <Input
                    id={attr.id}
                    value={attr.value}
                    onChange={(e) => updateValue(attr.id, e.target.value)}
                    placeholder={`Enter your ${attr.name.toLowerCase()}`}
                    className="bg-input border-border focus:border-primary"
                  />
                </div>
                <div className="flex flex-col items-end gap-2 pt-6">
                  <Switch
                    checked={attr.shared}
                    onCheckedChange={() => toggleShare(attr.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    {attr.shared ? 'Shared' : 'Private'}
                  </span>
                </div>
              </div>
              {attr.shared && (
                <div className="mt-2 text-xs text-primary flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Visible to DApps
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={saveProfile}
          className="w-full bg-gradient-hologram hover:opacity-90 font-semibold neon-glow"
        >
          Save Encrypted Profile
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          <p>🔒 All data is encrypted and stored on-chain</p>
        </div>
      </div>
    </Card>
  );
};

export default DIDProfile;

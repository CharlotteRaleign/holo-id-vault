import { useState } from 'react';
import { useAccount } from 'wagmi';
import { NoteSubmit } from './NoteSubmit';
import { NoteList } from './NoteList';
import type { FhevmInstance } from '../fhevm/fhevmTypes';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface NotesAppProps {
  instance: FhevmInstance;
}

export function NotesApp({ instance }: NotesAppProps) {
  const [activeTab, setActiveTab] = useState<'store' | 'list'>('store');
  const { isConnected } = useAccount();

  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 bg-card border-primary/30 shadow-cyber scan-lines relative overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'store' | 'list')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="store">Store Note</TabsTrigger>
              <TabsTrigger value="list">My Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="store">
              <NoteSubmit instance={instance} />
            </TabsContent>
            <TabsContent value="list">
              <NoteList instance={instance} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </section>
  );
}


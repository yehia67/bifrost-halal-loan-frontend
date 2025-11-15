'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiPromise } from '@polkadot/api';
import { createPolkadotApi, ConnectionStatus } from '../lib/polkadot';

interface PolkadotContextType {
  api: ApiPromise | null;
  status: ConnectionStatus;
  blockNumber: number;
  error: string | null;
  reconnect: () => void;
}

const PolkadotContext = createContext<PolkadotContextType | undefined>(undefined);

interface PolkadotProviderProps {
  children: ReactNode;
}

export const PolkadotProvider: React.FC<PolkadotProviderProps> = ({ children }) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const connectToPolkadot = async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      const polkadotApi = await createPolkadotApi();
      setApi(polkadotApi);
      setStatus('connected');

      // Subscribe to new block headers
      const unsubscribe = await polkadotApi.rpc.chain.subscribeNewHeads((header) => {
        setBlockNumber(header.number.toNumber());
      });

      // Handle disconnection
      polkadotApi.on('disconnected', () => {
        setStatus('disconnected');
        setApi(null);
      });

      polkadotApi.on('error', (error) => {
        console.error('Polkadot API error:', error);
        setError(error.message);
        setStatus('error');
      });

      return unsubscribe;
    } catch (err) {
      console.error('Failed to connect to Polkadot:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const reconnect = () => {
    if (api) {
      api.disconnect();
    }
    connectToPolkadot();
  };

  useEffect(() => {
    let mounted = true;
    
    const initConnection = async () => {
      if (mounted) {
        await connectToPolkadot();
      }
    };

    initConnection();

    return () => {
      mounted = false;
      if (api) {
        api.disconnect();
      }
    };
  }, []);

  const value: PolkadotContextType = {
    api,
    status,
    blockNumber,
    error,
    reconnect,
  };

  return (
    <PolkadotContext.Provider value={value}>
      {children}
    </PolkadotContext.Provider>
  );
};

export const usePolkadot = (): PolkadotContextType => {
  const context = useContext(PolkadotContext);
  if (!context) {
    throw new Error('usePolkadot must be used within a PolkadotProvider');
  }
  return context;
};

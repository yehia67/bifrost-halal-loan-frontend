import { ApiPromise, WsProvider } from '@polkadot/api';

// Network configuration
export const NETWORK_CONFIG = {
  rpc: 'ws://localhost:9944',
  decimals: 12,
  symbol: 'UNIT',
  name: 'Development Network'
};

// Create API instance
export const createPolkadotApi = async (): Promise<ApiPromise> => {
  const wsProvider = new WsProvider(NETWORK_CONFIG.rpc);
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  return api;
};

// Format balance with proper decimals
export const formatBalance = (balance: string | number, decimals: number = NETWORK_CONFIG.decimals): string => {
  const balanceNum = typeof balance === 'string' ? parseInt(balance) : balance;
  return (balanceNum / Math.pow(10, decimals)).toFixed(4);
};

// Connection status type
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

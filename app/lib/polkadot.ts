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
  try {
    // Handle zero or empty values
    if (!balance || balance === '0' || balance === 0) {
      return '0.0000';
    }
    
    // Convert to string first to handle big numbers
    const balanceStr = balance.toString();
    
    // Use BigInt for large numbers to avoid precision loss
    const balanceBigInt = BigInt(balanceStr);
    const divisor = BigInt(Math.pow(10, decimals));
    
    // Calculate the integer and fractional parts
    const integerPart = balanceBigInt / divisor;
    const remainder = balanceBigInt % divisor;
    
    // Convert remainder to decimal string with proper padding
    const fractionalPart = remainder.toString().padStart(decimals, '0');
    const truncatedFractional = fractionalPart.substring(0, 4).padEnd(4, '0');
    
    return `${integerPart}.${truncatedFractional}`;
  } catch (error) {
    console.warn('Error formatting balance:', balance, error);
    return '0.0000';
  }
};

// Connection status type
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Helper function to get pallet address
export const getHalalLendingPalletAddress = async (api: any): Promise<string> => {
  try {
    // Method 1: Try to get from constants
    if (api.consts.halalLending?.palletId) {
      const palletId = api.consts.halalLending.palletId;
      
      try {
        // Try to use the pallet's account derivation method
        if (typeof palletId.toAccountId === 'function') {
          const accountId = palletId.toAccountId();
          return accountId.toString();
        }
        
        // If that doesn't work, manually derive the account
        const palletIdBytes = palletId.toU8a();
        
        // Import crypto utilities for proper account derivation
        const { blake2AsU8a } = await import('@polkadot/util-crypto');
        
        // Create proper pallet account using Substrate's derivation method
        const prefix = new TextEncoder().encode('modl');
        const suffix = new Uint8Array(4); // 4 bytes for index (0)
        const combined = new Uint8Array(prefix.length + palletIdBytes.length + suffix.length);
        combined.set(prefix, 0);
        combined.set(palletIdBytes, prefix.length);
        combined.set(suffix, prefix.length + palletIdBytes.length);
        
        // Hash to get 32-byte account
        const accountBytes = blake2AsU8a(combined, 256);
        const accountId = api.createType('AccountId32', accountBytes);
        return accountId.toString();
      } catch (conversionError) {
        console.warn('PalletId conversion failed, trying fallback:', conversionError);
        // Continue to next method
      }
    }
    
    // Method 2: Try to get from query
    if (api.query.halalLending?.accountId) {
      const accountId = await api.query.halalLending.accountId();
      return accountId.toString();
    }
    
    // Method 3: Use Polkadot utility for pallet account derivation
    try {
      const { stringToU8a, u8aConcat } = await import('@polkadot/util');
      
      // Create pallet account using standard Substrate method
      const palletIdString = 'hlallend';
      const palletIdBytes = stringToU8a(palletIdString.padEnd(8, '\0').slice(0, 8));
      
      // Create the account derivation: "modl" + palletId + index
      const modlPrefix = stringToU8a('modl');
      const index = new Uint8Array(4); // index 0
      const combined = u8aConcat(modlPrefix, palletIdBytes, index);
      
      // Hash to create 32-byte account
      const { blake2AsU8a } = await import('@polkadot/util-crypto');
      const accountBytes = blake2AsU8a(combined, 256);
      
      // Create AccountId and return as string
      const accountId = api.createType('AccountId32', accountBytes);
      return accountId.toString();
    } catch (utilError) {
      console.warn('Polkadot utilities failed, using manual method:', utilError);
      
      // Manual fallback method
      const palletIdString = 'hlallend';
      const palletIdBytes = new Uint8Array(8);
      for (let i = 0; i < Math.min(palletIdString.length, 8); i++) {
        palletIdBytes[i] = palletIdString.charCodeAt(i);
      }
      
      // Create proper account derivation manually
      const prefix = new TextEncoder().encode('modl');
      const suffix = new Uint8Array(4); // index 0
      const combined = new Uint8Array(prefix.length + palletIdBytes.length + suffix.length);
      combined.set(prefix, 0);
      combined.set(palletIdBytes, prefix.length);
      combined.set(suffix, prefix.length + palletIdBytes.length);
      
      // Simple hash fallback (not cryptographically secure, but for development)
      const accountBytes = new Uint8Array(32);
      for (let i = 0; i < combined.length && i < 32; i++) {
        accountBytes[i] = combined[i];
      }
      
      const accountId = api.createType('AccountId32', accountBytes);
      return accountId.toString();
    }
  } catch (error) {
    console.error('Failed to get pallet address:', error);
    throw new Error('Could not determine pallet address');
  }
};

'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePolkadot } from '../contexts/PolkadotContext';
import { formatBalance } from '../lib/polkadot';

interface BalanceInfo {
  currency: string;
  balance: string;
  formatted: string;
}

export default function PalletBalance() {
  const { api, status } = usePolkadot();
  const [balances, setBalances] = useState<BalanceInfo[]>([]);
  const [palletAddress, setPalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPalletBalances = useCallback(async () => {
    if (!api || !palletAddress) return;

    setLoading(true);
    setError(null);

    const currencies = [
      { id: 'DOT', name: 'DOT', decimals: 12 },
      { id: 'USDT', name: 'USDT', decimals: 6 },
      { id: 'USDC', name: 'USDC', decimals: 6 },
      { id: 'KSM', name: 'KSM', decimals: 12 },
    ];

    try {
      const balancePromises = currencies.map(async (currency) => {
        try {
          let balance = '0';
          
          // For native token (DOT), use system.account
          if (currency.id === 'DOT') {
            const accountInfo: any = await api.query.system.account(palletAddress);
            balance = accountInfo.data?.free?.toString() || '0';
          } 
          // For other tokens, try to use orml_tokens or assets pallet
          else {
            // Try different methods to get token balances
            try {
              // Method 1: Try orml_tokens (common in Substrate chains)
              if (api.query.tokens?.accounts) {
                const tokenBalance: any = await api.query.tokens.accounts(palletAddress, currency.id);
                balance = tokenBalance.free?.toString() || tokenBalance.toString() || '0';
              }
              // Method 2: Try assets pallet
              else if (api.query.assets?.account) {
                const assetBalance: any = await api.query.assets.account(currency.id, palletAddress);
                balance = assetBalance?.balance?.toString() || '0';
              }
            } catch (tokenError) {
              console.warn(`Could not fetch ${currency.id} balance:`, tokenError);
              balance = '0';
            }
          }

          const formatted = formatBalance(balance, currency.decimals);
          
          return {
            currency: currency.name,
            balance,
            formatted
          };
        } catch (err) {
          console.error(`Error fetching ${currency.name} balance:`, err);
          return {
            currency: currency.name,
            balance: '0',
            formatted: '0.0000'
          };
        }
      });

      const results = await Promise.all(balancePromises);
      setBalances(results);
    } catch (err) {
      console.error('Failed to fetch pallet balances:', err);
      setError('Failed to fetch pallet balances');
    } finally {
      setLoading(false);
    }
  }, [api, palletAddress]);

  // Get pallet address and fetch balances
  useEffect(() => {
    const getPalletAddress = async () => {
      if (!api) return;

      try {
        // Import the helper function
        const { getHalalLendingPalletAddress } = await import('../lib/polkadot');
        const address = await getHalalLendingPalletAddress(api);
        
        setPalletAddress(address);
        console.log('Pallet Address for balance check:', address);
      } catch (err) {
        console.error('Failed to get pallet address:', err);
        setError('Failed to get pallet address');
      }
    };

    if (api && status === 'connected') {
      getPalletAddress();
    }
  }, [api, status]);

  // Fetch balances when pallet address is available
  useEffect(() => {
    if (palletAddress && api && status === 'connected') {
      getPalletBalances();
    }
  }, [palletAddress, api, status, getPalletBalances]);

  const refreshBalances = () => {
    getPalletBalances();
  };

  const getTotalValue = () => {
    // Simple calculation - in a real app you'd use price feeds
    const dotBalance = balances.find(b => b.currency === 'DOT');
    return dotBalance ? `~${dotBalance.formatted} DOT equivalent` : 'Calculating...';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          🏦 Pallet Balance
        </h2>
        <button
          onClick={refreshBalances}
          disabled={loading || status !== 'connected'}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {status !== 'connected' ? (
        <p className="text-gray-800">Please connect to Polkadot network first</p>
      ) : (
        <div className="space-y-4">
          {/* Pallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Pallet Address
            </label>
            <div className="p-2 bg-gray-50 border rounded font-mono text-xs text-gray-800 break-all">
              {palletAddress || 'Loading...'}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Balances Table */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Token Balances</h3>
            <div className="border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Currency</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Balance</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Raw Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.length > 0 ? (
                    balances.map((balance, index) => (
                      <tr key={balance.currency} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-900">{balance.currency}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-800">
                          {balance.formatted}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs text-gray-600">
                          {balance.balance}
                        </td>
                      </tr>
                    ))
                  ) : loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-800">
                        Loading balances...
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-800">
                        No balance data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Value Estimate */}
          {balances.length > 0 && (
            <div className="bg-blue-50 p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-900">Estimated Total Value:</span>
                <span className="text-blue-800 font-mono">{getTotalValue()}</span>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
            <p><strong>Note:</strong> These are the funds available in the halal lending pallet for loan operations. 
            Balances are fetched directly from the blockchain.</p>
          </div>
        </div>
      )}
    </div>
  );
}

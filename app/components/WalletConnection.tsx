'use client';

import { useState } from 'react';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

export default function WalletConnection() {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Enable the extension
      const extensions = await web3Enable('Bifrost Halal Loan');
      
      if (extensions.length === 0) {
        throw new Error('No Polkadot extension found. Please install Polkadot.js extension.');
      }

      // Get all accounts
      const allAccounts = await web3Accounts();
      
      if (allAccounts.length === 0) {
        throw new Error('No accounts found. Please create an account in your Polkadot extension.');
      }

      setAccounts(allAccounts);
      setSelectedAccount(allAccounts[0]); // Select first account by default
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccounts([]);
    setSelectedAccount(null);
    setIsConnected(false);
    setError(null);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        👛 Wallet Connection
      </h2>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-gray-600">
            Connect your Polkadot wallet to interact with the network
          </p>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-medium">✅ Connected</span>
            <button
              onClick={disconnectWallet}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Disconnect
            </button>
          </div>

          {selectedAccount && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected Account
                </label>
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-medium">{selectedAccount.meta.name}</div>
                  <div className="text-sm text-gray-600 font-mono">
                    {selectedAccount.address}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Short: {formatAddress(selectedAccount.address)}
                  </div>
                </div>
              </div>

              {accounts.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Switch Account
                  </label>
                  <select
                    value={selectedAccount.address}
                    onChange={(e) => {
                      const account = accounts.find(acc => acc.address === e.target.value);
                      if (account) setSelectedAccount(account);
                    }}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {accounts.map((account) => (
                      <option key={account.address} value={account.address}>
                        {account.meta.name} ({formatAddress(account.address)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500">
            Found {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

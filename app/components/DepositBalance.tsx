'use client';

import { useState, useEffect } from 'react';
import { usePolkadot } from '../contexts/PolkadotContext';

export default function DepositBalance() {
  const { api, status } = usePolkadot();
  const [amount, setAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('DOT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [palletAddress, setPalletAddress] = useState<string>('');

  const currencies = [
    { value: 'DOT', label: 'DOT' },
    { value: 'USDT', label: 'USDT' },
    { value: 'USDC', label: 'USDC' },
    { value: 'KSM', label: 'KSM' },
  ];

  const checkAvailablePallets = () => {
    if (!api) return;
    
    console.log('Available pallets:');
    console.log('- balances:', !!api.tx.balances);
    console.log('- currencies:', !!api.tx.currencies);
    console.log('- tokens:', !!api.tx.tokens);
    console.log('- assets:', !!api.tx.assets);
    
    if (api.tx.balances) {
      console.log('- balances.transfer:', !!api.tx.balances.transfer);
      console.log('- balances.transferKeepAlive:', !!api.tx.balances.transferKeepAlive);
    }
  };

  const depositBalance = async () => {
    if (!api || !amount || !palletAddress) {
      setError('Please enter amount and ensure pallet address is loaded');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check available pallets for debugging
      checkAvailablePallets();
      
      // Dynamic import to avoid SSR issues
      const { web3FromAddress, web3Accounts } = await import('@polkadot/extension-dapp');
      
      // Get accounts
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet first.');
      }

      const account = accounts[0]; // Use first account
      const injector = await web3FromAddress(account.address);

      // Convert amount to proper units based on selected currency
      let decimals = 12; // Default for DOT
      if (selectedCurrency === 'USDT' || selectedCurrency === 'USDC') {
        decimals = 6;
      }
      
      // Use string-based conversion to avoid JavaScript number precision issues
      // For large amounts, parseFloat * Math.pow can exceed MAX_SAFE_INTEGER
      const amountStr = parseFloat(amount).toString();
      const [integerPart, decimalPart = ''] = amountStr.split('.');
      
      // Pad decimal part to required decimals or truncate if longer
      const paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals);
      const fullAmountStr = integerPart + paddedDecimal;
      
      const amountInUnits = api.createType('Balance', fullAmountStr);

      // Create transfer extrinsic with proper error checking
      let transfer;
      
      if (selectedCurrency === 'DOT') {
        // For native DOT, use balances pallet
        if (api.tx.balances?.transfer) {
          transfer = api.tx.balances.transfer(palletAddress, amountInUnits);
        } else if (api.tx.balances?.transferKeepAlive) {
          // Use transferKeepAlive as fallback (more commonly available)
          transfer = api.tx.balances.transferKeepAlive(palletAddress, amountInUnits);
        } else {
          throw new Error('Balances pallet not available. Please check your chain configuration.');
        }
      } else {
        // For other currencies, try different pallets
        if (api.tx.currencies?.transfer) {
          // Bifrost uses currencies pallet
          transfer = api.tx.currencies.transfer(palletAddress, selectedCurrency, amountInUnits);
        } else if (api.tx.tokens?.transfer) {
          // ORML tokens pallet
          transfer = api.tx.tokens.transfer(palletAddress, selectedCurrency, amountInUnits);
        } else if (api.tx.assets?.transfer) {
          // Assets pallet
          transfer = api.tx.assets.transfer(selectedCurrency, palletAddress, amountInUnits);
        } else {
          throw new Error(`No transfer method available for ${selectedCurrency}. Please use DOT for now.`);
        }
      }

      // Sign and send transaction
      const hash = await transfer.signAndSend(account.address, { 
        signer: injector.signer,
        nonce: -1 // Let the API determine the nonce
      });

      setSuccess(`Deposit successful! Transaction hash: ${hash.toString()}`);
      setAmount('');
    } catch (err) {
      console.error('Deposit failed:', err);
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  // Load pallet address when API is ready
  useEffect(() => {
    const getPalletAddress = async () => {
      if (!api) return;

      try {
        // Import the helper function
        const { getHalalLendingPalletAddress } = await import('../lib/polkadot');
        const address = await getHalalLendingPalletAddress(api);
        
        setPalletAddress(address);
        console.log('Pallet Address:', address);
      } catch (err) {
        console.error('Failed to get pallet address:', err);
        setError('Failed to get pallet address');
      }
    };

    if (api && status === 'connected') {
      getPalletAddress();
    }
  }, [api, status]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        💰 Deposit Balance to Pallet
      </h2>

      {status !== 'connected' ? (
        <p className="text-gray-800">Please connect to Polkadot network first</p>
      ) : (
        <div className="space-y-4">
          {/* Pallet Address Display */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Pallet Address
            </label>
            <div className="p-2 bg-gray-50 border rounded font-mono text-xs text-gray-800 break-all">
              {palletAddress || 'Loading...'}
            </div>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Refresh Address
              </button>
              <button
                onClick={checkAvailablePallets}
                className="text-sm text-green-600 hover:text-green-700"
              >
                Check Pallets
              </button>
            </div>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Currency
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount to deposit"
              step="0.000001"
              min="0"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-700 text-sm break-words">{success}</p>
            </div>
          )}

          {/* Deposit Button */}
          <button
            onClick={depositBalance}
            disabled={loading || !amount || !palletAddress}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Depositing...' : `Deposit ${amount || '0'} ${selectedCurrency}`}
          </button>

          {/* Info */}
          <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border">
            <p><strong>Note:</strong> This transfers funds directly to the halal lending pallet address. 
            The pallet will hold these funds for loan operations.</p>
          </div>
        </div>
      )}
    </div>
  );
}

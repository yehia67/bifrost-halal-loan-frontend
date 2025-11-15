'use client';

import { usePolkadot } from '../contexts/PolkadotContext';
import { NETWORK_CONFIG } from '../lib/polkadot';

export default function PolkadotStatus() {
  const { status, blockNumber, error, reconnect } = usePolkadot();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'connecting': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        {getStatusIcon()} Polkadot Network Status
      </h2>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Connection Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Network:</span>
          <span className="text-gray-800">{NETWORK_CONFIG.name}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">RPC Endpoint:</span>
          <span className="text-gray-800 font-mono text-sm">{NETWORK_CONFIG.rpc}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Symbol:</span>
          <span className="text-gray-800 font-semibold">{NETWORK_CONFIG.symbol}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Decimals:</span>
          <span className="text-gray-800">{NETWORK_CONFIG.decimals}</span>
        </div>

        {status === 'connected' && (
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-900">Current Block:</span>
            <span className="text-blue-600 font-mono">#{blockNumber}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {(status === 'error' || status === 'disconnected') && (
          <button
            onClick={reconnect}
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}

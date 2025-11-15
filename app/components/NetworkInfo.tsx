'use client';

import { usePolkadot } from '../contexts/PolkadotContext';
import { useEffect, useState } from 'react';

interface ChainInfo {
  name: string;
  version: string;
  properties: any;
}

export default function NetworkInfo() {
  const { api, status } = usePolkadot();
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchChainInfo = async () => {
      if (api && status === 'connected') {
        setLoading(true);
        try {
          const [name, version, properties] = await Promise.all([
            api.rpc.system.chain(),
            api.rpc.system.version(),
            api.rpc.system.properties()
          ]);

          setChainInfo({
            name: name.toString(),
            version: version.toString(),
            properties: properties.toHuman()
          });
        } catch (error) {
          console.error('Failed to fetch chain info:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchChainInfo();
  }, [api, status]);

  if (status !== 'connected') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <h2 className="text-xl font-semibold mb-4">⛓️ Chain Information</h2>
        <p className="text-gray-500">Connect to network to view chain information</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      <h2 className="text-xl font-semibold mb-4">⛓️ Chain Information</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : chainInfo ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Chain Name:</span>
            <span className="text-gray-700">{chainInfo.name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-medium">Runtime Version:</span>
            <span className="text-gray-700 font-mono text-sm">{chainInfo.version}</span>
          </div>

          {chainInfo.properties && (
            <>
              {chainInfo.properties.ss58Format && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">SS58 Format:</span>
                  <span className="text-gray-700">{chainInfo.properties.ss58Format}</span>
                </div>
              )}
              
              {chainInfo.properties.tokenDecimals && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Token Decimals:</span>
                  <span className="text-gray-700">{chainInfo.properties.tokenDecimals}</span>
                </div>
              )}
              
              {chainInfo.properties.tokenSymbol && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Token Symbol:</span>
                  <span className="text-gray-700 font-semibold">{chainInfo.properties.tokenSymbol}</span>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-gray-500">Failed to load chain information</p>
      )}
    </div>
  );
}

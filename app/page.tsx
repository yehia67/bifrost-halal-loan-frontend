import PolkadotStatus from "./components/PolkadotStatus";
import WalletConnection from "./components/WalletConnection";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bifrost Halal Loan Platform
          </h1>
          <p className="text-lg text-gray-600">
            Sharia-compliant lending powered by Polkadot blockchain
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <PolkadotStatus />
          <WalletConnection />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h2 className="text-xl font-semibold mb-4">🔗 Quick Links</h2>
            <div className="space-y-3">
              <a
                href="https://polkadot.js.org/apps/?rpc=ws://localhost:9944"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              >
                <div className="font-medium text-blue-900">Polkadot.js Apps</div>
                <div className="text-sm text-blue-700">Connect to local network</div>
              </a>
              
              <a
                href="https://polkadot.js.org/apps/?rpc=ws://localhost:8845"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
              >
                <div className="font-medium text-green-900">Alternative RPC</div>
                <div className="text-sm text-green-700">Port 8845 connection</div>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-xl font-semibold mb-4">📋 Network Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Primary RPC:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">ws://localhost:9944</code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Alternative RPC:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">ws://localhost:8845</code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Mode:</span>
                <span className="text-green-600 font-semibold">Development</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Chain Type:</span>
                <span>Custom Parachain</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

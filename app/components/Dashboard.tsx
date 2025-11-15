'use client';

import { useState, useEffect } from 'react';
import { usePolkadot } from '../contexts/PolkadotContext';
import { formatBalance } from '../lib/polkadot';

// Helper function to format address for display
const formatAddress = (address: string): string => {
  if (!address || address === 'Unknown') return 'Unknown';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

type DashboardTab = 'admin' | 'liquidator' | 'borrower';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('borrower');
  const { status } = usePolkadot();

  const tabs = [
    { id: 'admin' as DashboardTab, label: 'Admin Dashboard', icon: '👑' },
    { id: 'liquidator' as DashboardTab, label: 'Liquidator Dashboard', icon: '⚡' },
    { id: 'borrower' as DashboardTab, label: 'Borrower Dashboard', icon: '💰' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md border">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-black hover:text-black hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.icon} {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {status !== 'connected' ? (
          <div className="text-center py-8">
            <p className="text-black">Please connect to Polkadot network to use the dashboard</p>
          </div>
        ) : (
          <>
            {activeTab === 'admin' && <AdminDashboard />}
            {activeTab === 'liquidator' && <LiquidatorDashboard />}
            {activeTab === 'borrower' && <BorrowerDashboard />}
          </>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { api, status } = usePolkadot();
  const [totalLoans, setTotalLoans] = useState(0);
  const [activeLoans, setActiveLoans] = useState(0);
  const [platformRewards, setPlatformRewards] = useState('0');
  const [recentLoans, setRecentLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    if (!api || status !== 'connected') return;

    setLoading(true);
    try {
      let allLoans: any[] = [];
      
      // Try to fetch all loans from the pallet
      if (api.query.halalLending?.loans) {
        try {
          const loansEntries = await api.query.halalLending.loans.entries();
          allLoans = loansEntries.map(([key, loan]: [any, any]) => {
            // Debug: log the entire loan object to see its structure
            console.log('Full loan object:', loan);
            console.log('Loan properties:', Object.keys(loan));
            
            // Try different ways to access the data
            const loanData = loan.toHuman ? loan.toHuman() : loan;
            const loanJson = loan.toJSON ? loan.toJSON() : loan;
            
            console.log('Loan toHuman():', loanData);
            console.log('Loan toJSON():', loanJson);
            
            return {
              id: key.args[0]?.toString() || '0',
              borrower: loanData.borrower || loanJson.borrower || loan.borrower?.toString() || loan.account?.toString() || 'Unknown',
              collateralAmount: loanData.collateralAmount || loanJson.collateralAmount || loan.collateralAmount?.toString() || '0',
              loanAmount: loanData.loanAmount || loanJson.loanAmount || loan.loanAmount?.toString() || '0',
              ltv: loanData.ltv || loanJson.ltv || loan.ltv?.toString() || 'N/A',
              status: loanData.status || loanJson.status || loan.status?.toString() || 'Active'
            };
          });
        } catch (err) {
          console.warn('Failed to fetch loans entries:', err);
          
          // Fallback: try to get loan count and iterate
          try {
            const loanCount = await api.query.halalLending?.nextLoanId?.() || 
                             await api.query.halalLending?.loanCount?.() || 0;
            
            const loanPromises = [];
            for (let i = 0; i < Math.min(Number(loanCount), 100); i++) {
              loanPromises.push(
                api.query.halalLending.loans(i).then((loan: any) => {
                  if (loan && loan.borrower) {
                    return {
                      id: i.toString(),
                      borrower: loan.borrower?.toString() || loan.account?.toString() || 'Unknown',
                      collateralAmount: loan.collateralAmount?.toString() || '0',
                      loanAmount: loan.loanAmount?.toString() || '0',
                      ltv: loan.ltv?.toString() || 'N/A',
                      status: loan.status?.toString() || 'Active'
                    };
                  }
                  return null;
                }).catch(() => null)
              );
            }
            
            const results = await Promise.all(loanPromises);
            allLoans = results.filter(loan => loan !== null);
          } catch (fallbackErr) {
            console.warn('Fallback method also failed:', fallbackErr);
          }
        }
      }

      // Calculate statistics
      const total = allLoans.length;
      const active = allLoans.filter(loan => loan.status === 'Active' || !loan.status).length;
      
      setTotalLoans(total);
      setActiveLoans(active);
      
      // Format recent loans for display (last 10)
      const recentLoansFormatted = allLoans
        .slice(-10)
        .reverse()
        .map(loan => {
          // Debug: Log raw values
          console.log('Raw loan data:', {
            id: loan.id,
            collateralAmount: loan.collateralAmount,
            loanAmount: loan.loanAmount,
            borrower: loan.borrower
          });
          
          // Import formatBalance for proper decimal conversion
          const collateralFormatted = formatBalance(loan.collateralAmount, 12);
          const loanFormatted = formatBalance(loan.loanAmount, 12);
          
          console.log('Formatted amounts:', {
            collateralFormatted,
            loanFormatted
          });
          
          // Parse amounts by dividing by 10^12
          const collateralParsed = (BigInt(loan.collateralAmount || '0') / BigInt(10**12)).toString();
          const loanParsed = (BigInt(loan.loanAmount || '0') / BigInt(10**12)).toString();
          
          return {
            id: loan.id,
            collateral: `${collateralParsed} vDOT (${loan.collateralAmount} raw)`,
            borrowed: `${loanParsed} DOT (${loan.loanAmount} raw)`,
            toRepay: `${loanParsed} DOT (${loan.loanAmount} raw)`,
            ltv: loan.ltv === 'N/A' ? 'N/A' : `${loan.ltv}%`,
            status: loan.status,
            borrower: formatAddress(loan.borrower || 'Unknown')
          };
        });
      
      setRecentLoans(recentLoansFormatted);
      
      // Try to get platform rewards (this depends on your pallet structure)
      try {
        if (api.query.halalLending?.platformRewards) {
          const rewards = await api.query.halalLending.platformRewards();
          setPlatformRewards(rewards.toString());
        } else if (api.query.halalLending?.totalRewards) {
          const rewards = await api.query.halalLending.totalRewards();
          setPlatformRewards(rewards.toString());
        }
      } catch (rewardsErr) {
        console.warn('Failed to fetch platform rewards:', rewardsErr);
      }
      
      console.log(`Admin Dashboard: Found ${total} total loans, ${active} active loans`);
      
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    if (api && status === 'connected') {
      fetchAdminData();
    }
  }, [api, status]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Admin Dashboard</h3>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-blue-50 p-4 rounded border">
          <h4 className="font-medium text-blue-900">Total Loans</h4>
          <p className="text-2xl font-bold text-blue-600">{loading ? '...' : totalLoans}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border">
          <h4 className="font-medium text-green-900">Active Loans</h4>
          <p className="text-2xl font-bold text-green-600">{loading ? '...' : activeLoans}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded border">
          <h4 className="font-medium text-yellow-900">Platform Rewards</h4>
          <p className="text-2xl font-bold text-yellow-600">{loading ? '...' : platformRewards} UNIT</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Recent Loans</h4>
        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Loan ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Borrower</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">LTV</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-black">
                    Loading loans...
                  </td>
                </tr>
              ) : recentLoans.length > 0 ? (
                recentLoans.map((loan, index) => (
                  <tr key={loan.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-black">{loan.id}</td>
                    <td className="px-4 py-2 text-black font-mono text-sm">{loan.borrower}</td>
                    <td className="px-4 py-2 text-black">{loan.borrowed}</td>
                    <td className="px-4 py-2 text-black">
                      <span className={`px-2 py-1 rounded text-xs ${
                        loan.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-black">{loan.ltv}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-black">
                    No loans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Claim Platform Rewards
        </button>
      </div>
    </div>
  );
}

function LiquidatorDashboard() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Liquidator Dashboard</h3>
      
      <div className="bg-red-50 p-4 rounded border">
        <h4 className="font-medium text-red-900">Loans Eligible for Liquidation</h4>
        <p className="text-2xl font-bold text-red-600">0</p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Liquidation Opportunities</h4>
        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Loan ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Borrower</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Debt</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Collateral</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">LTV</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black">
                  No liquidation opportunities
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface LoanData {
  id: string;
  collateral: string;
  borrowed: string;
  toRepay: string;
  ltv: string;
  status: string;
  borrower?: string; // Optional for admin dashboard
}

function BorrowerDashboard() {
  const { api, status } = usePolkadot();
  const [collateralAmount, setCollateralAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [selectedCollateral, setSelectedCollateral] = useState('vDOT');
  const [selectedLoanCurrency, setSelectedLoanCurrency] = useState('USDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [dotBalance, setDotBalance] = useState<string>('0.0000');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);

  const fetchUserBalance = async () => {
    if (!api || status !== 'connected') return;

    setBalanceLoading(true);
    try {
      // Get current user account
      const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp');
      
      // Enable web3 extension first
      await web3Enable('Bifrost Halal Loan');
      
      const accounts = await web3Accounts();
      if (accounts.length === 0) return;

      const userAccount = accounts[0].address;
      
      // Fetch DOT balance
      const accountInfo = await api.query.system.account(userAccount);
      
      // Handle Polkadot Codec object
      const accountData = accountInfo.toHuman ? accountInfo.toHuman() : accountInfo;
      const accountJson = accountInfo.toJSON ? accountInfo.toJSON() : accountInfo;
      
      console.log('Account info:', accountData);
      console.log('Account JSON:', accountJson);
      
      // Try different ways to access the balance
      let balance = '0';
      if (accountData && accountData.data && accountData.data.free) {
        balance = accountData.data.free.toString().replace(/,/g, ''); // Remove commas from human format
      } else if (accountJson && accountJson.data && accountJson.data.free) {
        balance = accountJson.data.free.toString();
      } else if (accountInfo.data && accountInfo.data.free) {
        balance = accountInfo.data.free.toString();
      }
      
      const formattedBalance = formatBalance(balance, 12);
      
      setDotBalance(formattedBalance);
      console.log(`User DOT balance: ${formattedBalance} DOT`);
      
    } catch (err) {
      console.error('Failed to fetch user balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchUserLoans = async () => {
    if (!api || status !== 'connected') return;

    setLoansLoading(true);
    try {
      // Get current user account
      const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp');
      
      // Enable web3 extension first
      await web3Enable('Bifrost Halal Loan');
      
      const accounts = await web3Accounts();
      if (accounts.length === 0) return;

      const userAccount = accounts[0].address;
      
      let userLoans: LoanData[] = [];

      console.log('=== BORROWER LOAN FETCHING DEBUG ===');
      console.log('User account:', userAccount);
      console.log('Available halalLending queries:', Object.keys(api.query.halalLending || {}));

      // Fetch ALL loans first, then filter by borrower address
      try {
        console.log('Fetching ALL loans from halalLending.loans.entries()...');
        const allLoansEntries = await api.query.halalLending.loans.entries();
        console.log('Total loans in system:', allLoansEntries.length);
        
        // Process each loan and extract data
        const allLoans = allLoansEntries.map(([key, loan]: [any, any]) => {
          console.log('Processing loan:', {
            key: key.args[0]?.toString(),
            loanObject: loan,
            loanHuman: loan.toHuman ? loan.toHuman() : 'No toHuman method',
            loanJSON: loan.toJSON ? loan.toJSON() : 'No toJSON method'
          });
          
          const loanData = loan.toHuman ? loan.toHuman() : loan;
          const loanJson = loan.toJSON ? loan.toJSON() : loan;
          
          return {
            id: key.args[0]?.toString() || '0',
            borrower: loanData.borrower || loanJson.borrower || loan.borrower?.toString() || loan.account?.toString() || 'Unknown',
            collateralAmount: loanData.collateralAmount || loanJson.collateralAmount || loan.collateralAmount?.toString() || '0',
            loanAmount: loanData.loanAmount || loanJson.loanAmount || loan.loanAmount?.toString() || '0',
            ltv: loanData.ltv || loanJson.ltv || loan.ltv?.toString() || 'N/A',
            status: loanData.status || loanJson.status || loan.status?.toString() || 'Active'
          };
        });
        
        console.log('All processed loans:', allLoans);
        
        // Filter by borrower address
        const filteredLoans = allLoans.filter(loan => {
          const matches = loan.borrower === userAccount;
          console.log('Loan filter check:', {
            loanId: loan.id,
            loanBorrower: loan.borrower,
            userAccount: userAccount,
            matches: matches
          });
          return matches;
        });
        
        // Format for display - show parsed values alongside raw amounts
        userLoans = filteredLoans.map(loan => {
          // Parse amounts by dividing by 10^12
          const collateralParsed = (BigInt(loan.collateralAmount || '0') / BigInt(10**12)).toString();
          const loanParsed = (BigInt(loan.loanAmount || '0') / BigInt(10**12)).toString();
          
          return {
            id: loan.id,
            collateral: `${collateralParsed} vDOT (${loan.collateralAmount} raw)`,
            borrowed: `${loanParsed} DOT (${loan.loanAmount} raw)`,
            toRepay: `${loanParsed} DOT (${loan.loanAmount} raw)`,
            ltv: loan.ltv !== 'N/A' ? `${loan.ltv}%` : 'N/A',
            status: loan.status || 'Active'
          };
        });
        
      } catch (err) {
        console.warn('Failed to fetch loans:', err);
      }

      if (userLoans.length === 0 && api.query.halalLending?.userLoans) {
        // Method 2: Try to get loans by user account
        try {
          const userLoanIds = await api.query.halalLending.userLoans(userAccount);
          if (userLoanIds && userLoanIds.length > 0) {
            const loanPromises = userLoanIds.map(async (loanId: any, index: number) => {
              const loan = await api.query.halalLending.loans(loanId);
              
              // Parse amounts by dividing by 10^12
              const collateralAmount = loan.collateralAmount?.toString() || '0';
              const loanAmount = loan.loanAmount?.toString() || '0';
              const collateralParsed = (BigInt(collateralAmount) / BigInt(10**12)).toString();
              const loanParsed = (BigInt(loanAmount) / BigInt(10**12)).toString();
              
              return {
                id: loanId.toString(),
                collateral: `${collateralParsed} vDOT (${collateralAmount} raw)`,
                borrowed: `${loanParsed} DOT (${loanAmount} raw)`,
                toRepay: `${loanParsed} DOT (${loanAmount} raw)`,
                ltv: loan.ltv ? `${loan.ltv.toString()}%` : 'N/A',
                status: loan.status?.toString() || 'Active'
              };
            });
            userLoans = await Promise.all(loanPromises);
          }
        } catch (err) {
          console.warn('Method 2 failed:', err);
        }
      }

      if (userLoans.length === 0) {
        // Method 3: Try to get loan count and iterate
        try {
          const loanCount = await api.query.halalLending?.nextLoanId?.() || 
                           await api.query.halalLending?.loanCount?.() || 0;
          
          const loanPromises = [];
          for (let i = 0; i < Math.min(Number(loanCount), 100); i++) { // Limit to 100 loans
            loanPromises.push(
              api.query.halalLending.loans(i).then((loan: any) => {
                if (loan && (loan.borrower?.toString() === userAccount || loan.account?.toString() === userAccount)) {
                  // Parse amounts by dividing by 10^12
                  const collateralAmount = loan.collateralAmount?.toString() || '0';
                  const loanAmount = loan.loanAmount?.toString() || '0';
                  const collateralParsed = (BigInt(collateralAmount) / BigInt(10**12)).toString();
                  const loanParsed = (BigInt(loanAmount) / BigInt(10**12)).toString();
                  
                  return {
                    id: i.toString(),
                    collateral: `${collateralParsed} vDOT (${collateralAmount} raw)`,
                    borrowed: `${loanParsed} DOT (${loanAmount} raw)`,
                    toRepay: `${loanParsed} DOT (${loanAmount} raw)`,
                    ltv: loan.ltv ? `${loan.ltv.toString()}%` : 'N/A',
                    status: loan.status?.toString() || 'Active'
                  };
                }
                return null;
              }).catch(() => null)
            );
          }
          
          const results = await Promise.all(loanPromises);
          userLoans = results.filter(loan => loan !== null) as LoanData[];
        } catch (err) {
          console.warn('Method 3 failed:', err);
        }
      }

      setLoans(userLoans);
      console.log(`=== FINAL RESULTS ===`);
      console.log(`Found ${userLoans.length} loans for user:`, userAccount);
      console.log('User loans:', userLoans);
      
    } catch (err) {
      console.error('Failed to fetch user loans:', err);
    } finally {
      setLoansLoading(false);
    }
  };

  const createLoan = async () => {
    if (!api || !collateralAmount || !loanAmount) {
      setError('Please fill in all fields and ensure API is connected');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Dynamic import to avoid SSR issues
      const { web3Enable, web3Accounts, web3FromAddress } = await import('@polkadot/extension-dapp');
      
      // Enable web3
      await web3Enable('Bifrost Halal Loan');
      
      // Get accounts
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet first.');
      }

      const account = accounts[0];
      const injector = await web3FromAddress(account.address);

      // Convert amounts to proper units
      const collateralDecimals = 12; // Assuming 12 decimals for vTokens
      const loanDecimals = 12; // Using 12 decimals for consistency
      
      const collateralInUnits = api.createType('Balance', parseFloat(collateralAmount) * Math.pow(10, collateralDecimals));
      const loanInUnits = api.createType('Balance', parseFloat(loanAmount) * Math.pow(10, loanDecimals));

      // IMPORTANT: Always use currency ID 0 (DOT) regardless of UI selection
      // This is hardcoded because the pallet runtime only supports DOT
      const currencyId = api.createType('u32', 0);

      // Create loan extrinsic based on pallet structure
      // Structure: collateral_vtoken (u32), collateral_amount (u128), loan_currency (u32), loan_amount (u128)
      let loanExtrinsic;
      
      if (api.tx.halalLending?.createLoan) {
        // Method 1: Direct createLoan call with proper argument order
        loanExtrinsic = api.tx.halalLending.createLoan(
          currencyId, // collateral_vtoken (u32) - Always 0 for DOT
          collateralInUnits, // collateral_amount (u128)
          currencyId, // loan_currency (u32) - Always 0 for DOT
          loanInUnits // loan_amount (u128)
        );
      } else if (api.tx.halalLending?.requestLoan) {
        // Method 2: Alternative method name with same structure
        loanExtrinsic = api.tx.halalLending.requestLoan(
          currencyId, // collateral_vtoken (u32) - Always 0 for DOT
          collateralInUnits, // collateral_amount (u128)
          currencyId, // loan_currency (u32) - Always 0 for DOT
          loanInUnits // loan_amount (u128)
        );
      } else {
        throw new Error('Halal lending pallet not available. Please check your chain configuration.');
      }

      // Sign and send transaction
      const hash = await loanExtrinsic.signAndSend(account.address, { 
        signer: injector.signer,
        nonce: -1
      });

      setSuccess(`Loan creation successful! Transaction hash: ${hash.toString()}`);
      
      // Reset form
      setCollateralAmount('');
      setLoanAmount('');
      
      // Refresh loans list
      setTimeout(() => {
        fetchUserLoans();
      }, 2000); // Wait 2 seconds for transaction to be processed
      
      console.log(`Loan created with currency ID: ${currencyId} (hardcoded to DOT)`);
      console.log(`UI shows: ${selectedLoanCurrency}, but pallet uses: DOT (ID: 0)`);
      
    } catch (err) {
      console.error('Loan creation failed:', err);
      setError(err instanceof Error ? err.message : 'Loan creation failed');
    } finally {
      setLoading(false);
    }
  };

  const repayLoan = async (loanId: string) => {
    if (!api) {
      setError('API not connected');
      return;
    }

    setRepayingLoanId(loanId);
    setError(null);
    setSuccess(null);

    try {
      // Get current user account
      const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp');
      await web3Enable('Bifrost Halal Loan');
      const accounts = await web3Accounts();
      
      if (accounts.length === 0) {
        setError('No wallet accounts found');
        return;
      }

      const { web3FromAddress } = await import('@polkadot/extension-dapp');
      const injector = await web3FromAddress(accounts[0].address);

      // Create repay loan extrinsic
      let repayExtrinsic;
      
      if (api.tx.halalLending?.repayLoan) {
        // Method 1: Direct repayLoan call
        repayExtrinsic = api.tx.halalLending.repayLoan(loanId);
      } else if (api.tx.halalLending?.repay) {
        // Method 2: Alternative repay method
        repayExtrinsic = api.tx.halalLending.repay(loanId);
      } else {
        setError('Repay loan function not found in pallet');
        return;
      }

      console.log('Repaying loan:', loanId);
      
      // Sign and send transaction
      const hash = await repayExtrinsic.signAndSend(accounts[0].address, { signer: injector.signer });
      
      setSuccess(`Loan repayment successful! Transaction hash: ${hash.toString()}`);
      
      // Refresh loans list and balance
      setTimeout(() => {
        fetchUserLoans();
        fetchUserBalance();
      }, 2000); // Wait 2 seconds for transaction to be processed
      
    } catch (err) {
      console.error('Loan repayment failed:', err);
      setError(err instanceof Error ? err.message : 'Loan repayment failed');
    } finally {
      setRepayingLoanId(null);
    }
  };

  // Fetch loans and balance when component mounts or API status changes
  useEffect(() => {
    if (api && status === 'connected') {
      fetchUserLoans();
      fetchUserBalance();
    }
  }, [api, status]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-black">Borrower Dashboard</h3>
        <div className="bg-blue-50 px-4 py-2 rounded border">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-black font-medium">Your DOT Balance</div>
              <div className="text-lg font-bold text-blue-600">
                {balanceLoading ? 'Loading...' : `${dotBalance} DOT`}
              </div>
            </div>
            <button
              onClick={fetchUserBalance}
              disabled={balanceLoading}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {balanceLoading ? '...' : '↻'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Create New Loan */}
      <div className="bg-gray-50 p-6 rounded border">
        <h4 className="font-medium mb-4">Create New Halal Loan</h4>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Collateral Type
            </label>
            <select
              value={selectedCollateral}
              onChange={(e) => setSelectedCollateral(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="vDOT">vDOT (Voucher DOT)</option>
              <option value="vKSM">vKSM (Voucher KSM)</option>
              <option value="vBNC">vBNC (Voucher BNC)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Loan Currency
            </label>
            <select
              value={selectedLoanCurrency}
              onChange={(e) => setSelectedLoanCurrency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="DOT">DOT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Collateral Amount
            </label>
            <input
              type="number"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              placeholder="Enter collateral amount"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Loan Amount
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="Enter loan amount"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            <strong>Halal Finance:</strong> You will repay exactly what you borrow - no interest, no fees. 
            Platform profits come from staking rewards on your collateral.
          </p>
        </div>

        <button 
          onClick={createLoan}
          disabled={loading || !collateralAmount || !loanAmount}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Loan...' : 'Create Loan'}
        </button>
      </div>

      {/* My Active Loans */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">My Active Loans</h4>
          <button
            onClick={fetchUserLoans}
            disabled={loansLoading}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loansLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Loan ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Collateral</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Borrowed</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">To Repay</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">LTV</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {loansLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black">
                    Loading loans...
                  </td>
                </tr>
              ) : loans.length > 0 ? (
                loans.map((loan, index) => (
                  <tr key={loan.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-black">{loan.id}</td>
                    <td className="px-4 py-2 text-black">{loan.collateral}</td>
                    <td className="px-4 py-2 text-black">{loan.borrowed}</td>
                    <td className="px-4 py-2 text-black">{loan.toRepay}</td>
                    <td className="px-4 py-2 text-black">{loan.ltv}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => repayLoan(loan.id)}
                        disabled={repayingLoanId === loan.id}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {repayingLoanId === loan.id ? 'Repaying...' : 'Repay'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black">
                    No active loans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

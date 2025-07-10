'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { base } from 'wagmi/chains'
import { Zap, Target, Clock } from 'lucide-react'
import AccountFunding from './AccountFunding'

// Juicebox v4 Base ETH Payment Terminal Contract Address
// This is the Juicebox ETH payment terminal on Base network
const JUICEBOX_ETH_TERMINAL = '0x82129d4109625F94582bDdF6101a8Cd1a27919f5' as `0x${string}`

// Marina Pickleball project ID on Base network
const PROJECT_ID = 107

// Minimal ABI for paying to a Juicebox project
const JUICEBOX_TERMINAL_ABI = [
  {
    name: 'pay',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_amount', type: 'uint256' },
      { name: '_token', type: 'address' },
      { name: '_beneficiary', type: 'address' },
      { name: '_minReturnedTokens', type: 'uint256' },
      { name: '_preferClaimedTokens', type: 'bool' },
      { name: '_memo', type: 'string' },
      { name: '_metadata', type: 'bytes' }
    ],
    outputs: [
      { name: 'beneficiaryTokenCount', type: 'uint256' }
    ],
  },
] as const

interface ContributionSectionProps {
  totalRaised: number
  fundingGoal: number
  progress: number
  loading: boolean
  error: string | null
}

export default function ContributionSection({
  totalRaised,
  fundingGoal,
  progress,
  loading,
  error
}: ContributionSectionProps) {
  const { authenticated, login } = usePrivy()
  const { address, isConnected } = useAccount()
  const [contributionAmount, setContributionAmount] = useState('0.01')
  const [isContributing, setIsContributing] = useState(false)
  const [showFunding, setShowFunding] = useState(false)

  const { 
    writeContract, 
    data: hash,
    isPending: isWritePending,
    error: writeError 
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({
    hash,
  })

  const handleContribute = async () => {
    if (!authenticated || !isConnected) {
      login()
      return
    }

    if (!address) {
      alert('Please connect your wallet first.')
      return
    }

    try {
      setIsContributing(true)
      
      const amountWei = parseEther(contributionAmount)
      
      // Call the Juicebox pay function to contribute to project #107
      await writeContract({
        address: JUICEBOX_ETH_TERMINAL,
        abi: JUICEBOX_TERMINAL_ABI,
        functionName: 'pay',
        args: [
          BigInt(PROJECT_ID), // _projectId: Marina Pickleball project #107
          amountWei, // _amount: contribution amount in wei
          '0x0000000000000000000000000000000000000000' as `0x${string}`, // _token: ETH (zero address)
          address, // _beneficiary: contributor's address
          BigInt(0), // _minReturnedTokens: minimum project tokens to receive (0 = any amount)
          false, // _preferClaimedTokens: prefer unclaimed/reserved tokens
          `Marina Pickleball Community Fund - ${contributionAmount} ETH for nets at Moscone Park`, // _memo
          '0x' as `0x${string}` // _metadata: empty metadata
        ],
        value: amountWei,
        account: address,
        chain: base,
      })
      
    } catch (error) {
      alert('Contribution failed. Please try again.')
    } finally {
      setIsContributing(false)
    }
  }

  const presetAmounts = ['0.01', '0.05', '0.1', '0.25']

  // Show funding component if user wants to fund their wallet
  if (showFunding) {
    return (
      <div className="card max-w-2xl mx-auto mb-8">
        <AccountFunding 
          onSuccess={() => {
            setShowFunding(false)
            // Refresh the page or balances if needed
          }}
          onCancel={() => setShowFunding(false)}
        />
      </div>
    )
  }

  return (
    <div className="card max-w-2xl mx-auto mb-8">
      <div className="text-center mb-6">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="h-3 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ) : error ? (
          <div className="text-orange-600">
            <p className="text-lg font-semibold">⚠️ Data Loading Issue</p>
            <p className="text-sm">Using fallback data - ${totalRaised} raised</p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              ${totalRaised.toLocaleString()}
              <span className="text-gray-500 text-lg font-normal"> / ${fundingGoal.toLocaleString()}</span>
            </h2>
            <div className="progress-bar mb-4">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-6">
              <span className="flex items-center">
                <Target className="w-4 h-4 mr-1" />
                {progress.toFixed(1)}% funded
              </span>
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                14 days left
              </span>
            </div>
          </>
        )}
      </div>

      {/* Contribution Form */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Make a Contribution</h3>
        
        {/* Project Information */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Contributing to:</strong> Marina Pickleball Fund (Project #{PROJECT_ID}) on Base Network
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Via Juicebox v4 - All contributions go directly to the project treasury
          </p>
        </div>
        
        {/* Preset amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setContributionAmount(amount)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                contributionAmount === amount
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              {amount} ETH
            </button>
          ))}
        </div>

        {/* Custom amount input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Amount (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.01"
          />
        </div>

        {/* Contribution button */}
        <button
          onClick={handleContribute}
          disabled={isContributing || isWritePending || isConfirming || !contributionAmount || parseFloat(contributionAmount) <= 0}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!authenticated || !isConnected ? (
            <>
              <Zap className="w-4 h-4" />
              Connect Wallet to Contribute
            </>
          ) : isContributing || isWritePending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Preparing Transaction...
            </>
          ) : isConfirming ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Confirming Transaction...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Contribute {contributionAmount} ETH
            </>
          )}
        </button>

        {/* Fund wallet link */}
        {authenticated && isConnected && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setShowFunding(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Need ETH for gas? Fund your wallet with cards or Apple Pay →
            </button>
          </div>
        )}

        {/* Transaction status */}
        {hash && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {isConfirming ? (
                'Transaction submitted! Waiting for confirmation...'
              ) : isConfirmed ? (
                '✅ Contribution successful! Thank you for supporting the Marina Pickleball Community!'
              ) : (
                'Transaction in progress...'
              )}
            </p>
            {hash && (
              <div className="mt-1">
                <p className="text-xs text-blue-600 font-mono break-all">
                  TX: {hash}
                </p>
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  View on BaseScan →
                </a>
              </div>
            )}
          </div>
        )}

        {writeError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Transaction failed: {writeError.message}
            </p>
            {/* Show funding option if transaction failed due to insufficient gas */}
            {writeError.message.toLowerCase().includes('insufficient') && (
              <div className="mt-2">
                <button
                  onClick={() => setShowFunding(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Fund your wallet to cover gas fees →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Information */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">What your contribution supports:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Professional-grade pickleball nets (2x)</li>
            <li>• Installation and setup at Moscone Park</li>
            <li>• Community court improvement project</li>
            <li>• 50% increase in game throughput</li>
          </ul>
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <strong>Note:</strong> Your contribution will appear on the Juicebox project page at{' '}
            <a 
              href="https://juicebox.money/v4/base:107" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline"
            >
              juicebox.money/v4/base:107
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

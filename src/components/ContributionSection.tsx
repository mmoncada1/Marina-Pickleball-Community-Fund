'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { Zap, Target, Clock } from 'lucide-react'

// Replace with your actual contract address and ABI
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`

// Minimal ABI for contributing to the contract
const CONTRACT_ABI = [
  {
    name: 'contribute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
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

    if (!CONTRACT_ADDRESS) {
      alert('Contract address not configured. Please check your environment variables.')
      return
    }

    try {
      setIsContributing(true)
      
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'contribute',
        value: parseEther(contributionAmount),
        account: address,
      })
      
    } catch (error) {
      console.error('Contribution failed:', error)
      alert('Contribution failed. Please try again.')
    } finally {
      setIsContributing(false)
    }
  }

  const presetAmounts = ['0.01', '0.05', '0.1', '0.25']

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
              <p className="text-xs text-blue-600 mt-1 font-mono break-all">
                TX: {hash}
              </p>
            )}
          </div>
        )}

        {writeError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Transaction failed: {writeError.message}
            </p>
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
        </div>
      </div>
    </div>
  )
}

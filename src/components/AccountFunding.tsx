'use client'

import { useState } from 'react'
import { usePrivy, useWallets, useFundWallet, FundWalletConfig } from '@privy-io/react-auth'
import { useAccount, useSwitchChain } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { Zap, Target, Users } from 'lucide-react'

interface AccountFundingProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AccountFunding({ onSuccess, onCancel }: AccountFundingProps) {
  const { authenticated, login, user } = usePrivy()
  const { wallets } = useWallets()
  const { address, chain } = useAccount()
  const { fundWallet } = useFundWallet()
  const { switchChain } = useSwitchChain()
  
  const [fundingAmount, setFundingAmount] = useState('0.01')
  const [isFunding, setIsFunding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const presetAmounts = ['0.01', '0.05', '0.1', '0.25', '0.5', '1.0']

  
  // Get the user's embedded wallet
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy')

  const handleCardFunding = async () => {
    if (!authenticated || !address || !embeddedWallet) {
      login()
      return
    }

    try {
      setIsFunding(true)
      setError(null)

      // Use Privy's fundWallet hook - it handles cross-chain funding internally
      // Funds will be delivered to Base even if funding process uses mainnet
      await fundWallet(address, {
        amount: fundingAmount,
        asset: 'native-currency',
        chain: base,
        card: {
          preferredProvider: 'coinbase',
        }
      })

      setSuccess(true)
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 2000)

    } catch (error) {
      // Handle user cancellation gracefully
      if (error instanceof Error && error.message.includes('User rejected')) {
        setError('Funding was cancelled')
      } else {
        setError(`Funding failed: ${error instanceof Error ? error.message : 'Please try again or contact support'}`)
      }
    } finally {
      setIsFunding(false)
    }
  }

  const handleCustomAmount = (amount: string) => {
    setFundingAmount(amount)
  }

  if (!authenticated) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Fund Your Wallet</h3>
          <p className="text-sm text-gray-600 mt-1">Add ETH to your wallet using cards or Apple Pay</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">Cards</p>
                <p className="text-xs text-blue-600">Visa, Mastercard</p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Mobile Pay</p>
                <p className="text-xs text-green-600">Apple Pay, Google Pay</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={login}
          className="w-full px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Connect Wallet to Continue
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-900">Funding Successful!</h3>
          <p className="text-sm text-gray-600 mt-1">Your wallet has been funded with {fundingAmount} ETH</p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Transaction Complete</p>
              <p className="text-xs text-green-600">ETH is now available in your wallet on Base</p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>You can now use your ETH for gas fees and transactions on Base network.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Fund Your Wallet</h3>
        <p className="text-sm text-gray-600 mt-1">Add ETH to your wallet using cards or mobile payments</p>
      </div>

      {/* Current Wallet Info */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Wallet Address</p>
            <p className="text-xs text-gray-500 font-mono break-all">{address}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Delivery Network</p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <p className="text-xs text-gray-500">Base</p>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex-1">
            💡 All purchased ETH will be delivered to your wallet on Base network
          </div>
          <a
            href={`https://basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
            title="View on BaseScan"
          >
            View on BaseScan →
          </a>
        </div>
      </div>

      {/* Funding Amount Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select ETH Amount
        </label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleCustomAmount(amount)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                fundingAmount === amount
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="font-medium">{amount} ETH</div>
              <div className="text-xs opacity-75">
                ≈ ${(parseFloat(amount) * 3400).toFixed(0)} USD
              </div>
            </button>
          ))}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Amount (ETH)
          </label>
          <input
            type="number"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            min="0.001"
            step="0.001"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.01"
          />
          <p className="text-xs text-gray-500 mt-1">
            Estimated cost: ${(parseFloat(fundingAmount) * 3400).toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Supported Payment Methods</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Credit/Debit Cards</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Apple Pay</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Google Pay</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Instant Transfer</span>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Secure payments powered by Privy • Funds delivered to Base • No gas fees required
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isFunding}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleCardFunding}
          disabled={isFunding || parseFloat(fundingAmount) <= 0}
          className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isFunding ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              Fund with Card/Apple Pay
            </>
          )}
        </button>
      </div>

      {/* Info Text */}
      <div className="text-center text-xs text-gray-500">
        <p>🎯 All ETH will be delivered to your Base wallet address regardless of funding source.</p>
        <p className="mt-1">No gas fees required for funding • Minimum: 0.001 ETH • Maximum: 10 ETH</p>
      </div>
    </div>
  )
} 
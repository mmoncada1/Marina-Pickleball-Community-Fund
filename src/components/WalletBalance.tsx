'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useTokenBalances } from '../hooks/useTokenBalances'
import CowswapIntegration from './CowswapIntegration'
import { Users, Target, Clock, Zap } from 'lucide-react'
import { formatUnits } from 'viem'

interface WalletBalanceProps {
  // No props needed since we handle Cowswap internally
}

export default function WalletBalance({}: WalletBalanceProps) {
  const { address, isConnected } = useAccount()
  const { balances, loading, error, refetch } = useTokenBalances()
  const [showSwap, setShowSwap] = useState(false)
  const [swapAmount, setSwapAmount] = useState('')
  const [showCowswap, setShowCowswap] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)

  const usdcBalance = balances.find(b => b.symbol === 'USDC')
  const ethBalance = balances.find(b => b.symbol === 'ETH')

  const hasUSDC = usdcBalance && parseFloat(usdcBalance.balance) > 0

  // Helper function to format address
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Helper function to copy address to clipboard
  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        setAddressCopied(true)
        setTimeout(() => setAddressCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  if (!isConnected || !address) {
    return null
  }

  // Show Cowswap integration if user has chosen an amount to swap
  if (showCowswap && swapAmount) {
    return (
      <div className="max-w-md mx-auto mb-6">
        <CowswapIntegration
          usdcAmount={swapAmount}
          onSuccess={() => {
            setShowCowswap(false)
            setShowSwap(false)
            setSwapAmount('')
            refetch() // Refresh balances after swap
          }}
          onCancel={() => {
            setShowCowswap(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="card max-w-md mx-auto mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Wallet Balance - Base Chain
        </h3>
        <button
          onClick={refetch}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh balances"
        >
          <Target className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Wallet Address Display */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-700 mb-1">Connected Wallet</p>
            <p className="text-sm font-mono text-blue-900">{formatAddress(address)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyAddress}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
              title={addressCopied ? "Copied!" : "Copy full address"}
            >
              📋
            </button>
            <a
              href={`https://basescan.org/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
              title="View on BaseScan"
            >
              🔗
            </a>
          </div>
        </div>
        {addressCopied && (
          <p className="text-xs text-green-600 mt-1">Address copied to clipboard!</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm">
          <p>Error loading balances</p>
          <button
            onClick={refetch}
            className="text-blue-600 hover:underline text-xs"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Funds on Base</h4>
            
            {/* ETH Balance */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-900">ETH</span>
                <span className="text-xs text-gray-500">(Base)</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900">
                  {parseFloat(ethBalance?.balance || '0').toFixed(4)} ETH
                </span>
                <div className="text-xs text-gray-500">
                  ≈ ${(parseFloat(ethBalance?.balance || '0') * 3400).toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* USDC Balance */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">USDC</span>
                <span className="text-xs text-gray-500">(Base)</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-gray-900">
                  ${parseFloat(usdcBalance?.balance || '0').toFixed(2)}
                </span>
                {hasUSDC && (
                  <div className="text-xs text-gray-500">
                    {parseFloat(usdcBalance?.balance || '0').toFixed(6)} USDC
                  </div>
                )}
              </div>
            </div>

            {/* Total Value */}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Portfolio Value</span>
                <span className="text-lg font-bold text-gray-900">
                  ${((parseFloat(ethBalance?.balance || '0') * 3400) + parseFloat(usdcBalance?.balance || '0')).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* USDC to ETH Swap Option */}
          {hasUSDC && !showSwap && (
            <div className="border-t pt-4">
              <button
                onClick={() => setShowSwap(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Zap className="w-4 h-4" />
                Convert USDC to ETH
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Swap your USDC for ETH to contribute to the campaign
              </p>
            </div>
          )}

          {/* Swap Interface */}
          {showSwap && hasUSDC && (
            <div className="border-t pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  USDC Amount to Convert
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={usdcBalance?.balance}
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() => setSwapAmount(usdcBalance?.balance || '0')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Available: ${parseFloat(usdcBalance?.balance || '0').toFixed(2)} USDC
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSwap(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCowswap(true)
                  }}
                  disabled={!swapAmount || parseFloat(swapAmount) <= 0 || parseFloat(swapAmount) > parseFloat(usdcBalance?.balance || '0')}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Convert to ETH
                </button>
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>CoW Swap Integration:</strong> This will open CoW Protocol's swap interface 
                  in a new window, where you can convert your USDC to ETH with MEV protection 
                  and optimal pricing. After the swap, you can contribute the ETH to the campaign.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

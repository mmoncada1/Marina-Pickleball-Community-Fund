'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useTokenBalances } from '../hooks/useTokenBalances'
import { Users, Target } from 'lucide-react'

interface WalletBalanceProps {
  // No props needed
}

export default function WalletBalance({}: WalletBalanceProps) {
  const { address, isConnected } = useAccount()
  const { balances, loading, error, refetch } = useTokenBalances()
  const [addressCopied, setAddressCopied] = useState(false)

  const ethBalance = balances.find(b => b.symbol === 'ETH')
  const picklesBalance = balances.find(b => b.symbol === 'PKLS')

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
        // Debug log removed
      }
    }
  }

  if (!isConnected || !address) {
    return null
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
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Available Funds on Base</h4>
          
          {/* ETH Balance */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">Ξ ETH</span>
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



          {/* PICKLES Balance */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">🥒 PKLS</span>
              <span className="text-xs text-gray-500">(Base)</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-gray-900">
                {parseFloat(picklesBalance?.balance || '0').toFixed(4)} PKLS
              </span>
              <div className="text-xs text-gray-500">
                {picklesBalance?.address && (
                  <a
                    href={`https://basescan.org/token/${picklesBalance.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    View Token →
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Portfolio Value</span>
              <span className="text-lg font-bold text-gray-900">
                ${(parseFloat(ethBalance?.balance || '0') * 3400).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

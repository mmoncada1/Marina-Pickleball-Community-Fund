'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useAccount, useDisconnect } from 'wagmi'
import { Zap, Target, Users, Trophy, Clock } from 'lucide-react'
import { useState } from 'react'

export default function WalletButton() {
  const { login, logout, ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleDisconnect = () => {
    disconnect()
    logout()
  }

  if (!ready) {
    return (
      <div className="px-4 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-20"></div>
      </div>
    )
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <Users className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            {user?.email?.address || formatAddress(address)}
          </span>
          {address && (
            <>
              <button
                onClick={copyAddress}
                className="ml-1 p-1 hover:bg-green-100 rounded transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Trophy className="w-3 h-3 text-green-600" />
                ) : (
                  <Target className="w-3 h-3 text-green-600" />
                )}
              </button>
              <a
                href={`https://basescan.org/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 p-1 hover:bg-green-100 rounded transition-colors"
                title="View on BaseScan"
              >
                <span className="text-xs">🔗</span>
              </a>
            </>
          )}
        </div>
        <button
          onClick={handleDisconnect}
          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
    >
      <Zap className="w-4 h-4" />
      Connect Wallet
    </button>
  )
}

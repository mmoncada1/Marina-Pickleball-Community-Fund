'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { Zap, Target, Clock, Trophy } from 'lucide-react'

interface USDCOnrampProps {
  onBack: () => void
}

export default function USDCOnramp({ onBack }: USDCOnrampProps) {
  const { authenticated, login } = usePrivy()
  const { address, isConnected } = useAccount()
  
  const [usdAmount, setUsdAmount] = useState('25')

  const presetAmounts = ['10', '25', '50', '100']

  const generateZKP2PURL = () => {
    if (!address) return ''
    
    const baseUrl = 'https://zkp2p.xyz/swap'
    const params = new URLSearchParams({
      referrer: 'Marina+Pickleball+Community+Fund',
      referrerLogo: 'https://your-logo-url.com/logo.png', // Replace with your actual logo
      callbackUrl: window.location.origin,
      amountUsdc: (parseFloat(usdAmount) * 1000000).toString(), // Convert to USDC decimals (6)
      recipientAddress: address,
      paymentPlatform: 'Venmo' // Default to Venmo but users can change
    })
    
    return `${baseUrl}?${params.toString()}`
  }

  const handleOnramp = () => {
    if (!authenticated || !isConnected || !address) {
      login()
      return
    }

    const zkp2pUrl = generateZKP2PURL()
    window.open(zkp2pUrl, '_blank')
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Get USDC with Venmo</h3>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          ← Back to ETH
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Pay with Venmo, Cash App, or other payment methods and receive USDC directly in your wallet. 
          You'll be redirected to ZKP2P to complete the onramp process.
        </p>
      </div>

      {/* Preset amounts */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Amount (USD)
        </label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setUsdAmount(amount)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                usdAmount === amount
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Amount (USD)
        </label>
        <input
          type="number"
          step="1"
          min="1"
          value={usdAmount}
          onChange={(e) => setUsdAmount(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="25"
        />
        <p className="text-xs text-gray-500 mt-1">
          You'll receive exactly {usdAmount} USDC in your wallet
        </p>
      </div>

      {/* Onramp button */}
      <button
        onClick={handleOnramp}
        disabled={!usdAmount || parseFloat(usdAmount) < 1}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        {!authenticated || !isConnected ? (
          <>
            <Zap className="w-4 h-4" />
            Connect Wallet to Continue
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Get ${usdAmount} USDC
          </>
        )}
      </button>

      {/* Process overview */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-3">What happens next:</h4>
        <ol className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start">
            <span className="font-medium mr-2">1.</span>
            <span>You'll be redirected to ZKP2P in a new tab</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium mr-2">2.</span>
            <span>Choose your payment method (Venmo, Cash App, etc.)</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium mr-2">3.</span>
            <span>Complete payment following their instructions</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium mr-2">4.</span>
            <span>Receive exactly ${usdAmount} USDC in your wallet</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium mr-2">5.</span>
            <span>Return here to contribute to the campaign</span>
          </li>
        </ol>
      </div>

      {/* Supported platforms */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Supported Payment Methods:</h4>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <span className="px-2 py-1 bg-white rounded border">Venmo</span>
          <span className="px-2 py-1 bg-white rounded border">Cash App</span>
          <span className="px-2 py-1 bg-white rounded border">Revolut</span>
          <span className="px-2 py-1 bg-white rounded border">Wise</span>
          <span className="px-2 py-1 bg-white rounded border">Bank Transfer</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Powered by ZKP2P - Fast, secure, and gasless onramping
        </p>
      </div>
    </div>
  )
}

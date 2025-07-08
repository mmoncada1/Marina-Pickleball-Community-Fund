'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'

interface CowswapIntegrationProps {
  usdcAmount: string
  onSuccess?: () => void
  onCancel?: () => void
}

// Cowswap Widget Integration
export default function CowswapIntegration({ 
  usdcAmount, 
  onSuccess, 
  onCancel 
}: CowswapIntegrationProps) {
  const { address } = useAccount()
  const [isLoading, setIsLoading] = useState(false)

  const openCowswapWidget = () => {
    if (!address) return

    setIsLoading(true)

    // CoW Swap widget URL with Base chain parameters
    const cowswapURL = new URL('https://swap.cow.fi/')
    
    // Add parameters for the swap
    cowswapURL.searchParams.set('chain', 'base') // Base chain
    cowswapURL.searchParams.set('sellToken', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') // USDC on Base
    cowswapURL.searchParams.set('buyToken', '0x0000000000000000000000000000000000000000') // ETH (native)
    cowswapURL.searchParams.set('sellAmount', (parseFloat(usdcAmount) * 1000000).toString()) // USDC amount in wei (6 decimals)
    cowswapURL.searchParams.set('recipient', address) // User's address
    
    // Open in new window
    const newWindow = window.open(
      cowswapURL.toString(),
      'cowswap',
      'width=600,height=800,scrollbars=yes,resizable=yes'
    )

    // Check if window was closed (user completed or cancelled)
    const checkClosed = setInterval(() => {
      if (newWindow?.closed) {
        clearInterval(checkClosed)
        setIsLoading(false)
        // You could add logic here to check if the swap was successful
        // For now, we'll just call onSuccess
        if (onSuccess) {
          onSuccess()
        }
      }
    }, 1000)
  }

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-blue-900 mb-2">
          Convert USDC to ETH via CoW Swap
        </h4>
        <p className="text-sm text-blue-700 mb-3">
          You're about to convert ${usdcAmount} USDC to ETH using CoW Protocol's 
          decentralized exchange. This ensures the best price with MEV protection.
        </p>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Selling:</span>
            <span className="font-medium">${usdcAmount} USDC</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Buying:</span>
            <span className="font-medium">ETH (amount depends on market price)</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">Base</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={openCowswapWidget}
          disabled={isLoading || !address}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Opening CoW Swap...
            </>
          ) : (
            'Open CoW Swap'
          )}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-100 rounded text-xs text-blue-800">
        <strong>How it works:</strong>
        <ol className="mt-1 list-decimal list-inside space-y-1">
          <li>CoW Swap will open in a new window</li>
          <li>Review and confirm the swap details</li>
          <li>Approve USDC spending (if first time)</li>
          <li>Execute the swap to receive ETH</li>
          <li>Return here to contribute your ETH</li>
        </ol>
      </div>
    </div>
  )
}

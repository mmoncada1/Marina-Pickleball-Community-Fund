'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { formatUnits, createPublicClient, http } from 'viem'
import { base } from 'wagmi/chains'

// USDC contract address on Base (6 decimals)
// Official USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Create a dedicated Base client for USDC queries
const baseClient = createPublicClient({
  chain: base,
  transport: http()
})

interface TokenBalance {
  symbol: string
  balance: string
  decimals: number
  address?: string
  usdValue?: number
}

export function useTokenBalances() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = async () => {
    if (!address || !publicClient || !isConnected) {
      setBalances([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('Fetching balances for address:', address)
      console.log('Current chain ID:', chainId)
      console.log('Base chain ID:', base.id)

      // Fetch ETH balance from current chain
      const ethBalance = await publicClient.getBalance({ address })
      console.log('ETH balance (raw):', ethBalance.toString())
      
      // Fetch USDC balance from Base (always use Base client for USDC)
      let usdcBalance = BigInt(0)
      
      try {
        console.log('Fetching USDC balance from Base using dedicated client...')
        const usdcResult = await baseClient.readContract({
          address: USDC_ADDRESS as `0x${string}`,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ] as const,
          functionName: 'balanceOf',
          args: [address],
        })
        usdcBalance = usdcResult as bigint
        console.log('USDC balance (raw):', usdcBalance.toString())
      } catch (usdcError) {
        console.error('Failed to fetch USDC balance from Base:', usdcError)
      }

      // Format balances
      const ethFormatted = formatUnits(ethBalance, 18)
      const usdcFormatted = formatUnits(usdcBalance, 6)
      
      console.log('ETH formatted:', ethFormatted)
      console.log('USDC formatted:', usdcFormatted)

      const newBalances: TokenBalance[] = [
        {
          symbol: 'ETH',
          balance: ethFormatted,
          decimals: 18,
        },
        {
          symbol: 'USDC',
          balance: usdcFormatted,
          decimals: 6,
          address: USDC_ADDRESS,
        },
      ]

      setBalances(newBalances)
      console.log('Updated balances:', newBalances)
    } catch (err) {
      console.error('Error fetching balances:', err)
      setError('Failed to fetch balances')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [address, isConnected, publicClient, chainId])

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances,
  }
}

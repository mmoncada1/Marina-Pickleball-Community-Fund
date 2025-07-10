'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { formatUnits, createPublicClient, http, formatEther } from 'viem'
import { base } from 'wagmi/chains'

// USDC contract address on Base (6 decimals)
// Official USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// PICKLES token contract address on Base (18 decimals)
const PICKLES_ADDRESS = '0x20b8c2e1c80f62de98b74b42cefeef2368ea9fe4'

// Create a dedicated Base client for token queries
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

  const fetchBalances = useCallback(async () => {
    if (!address || !publicClient || !isConnected) {
      setBalances([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch ETH balance from current chain
      const ethBalance = await publicClient.getBalance({ address })
      
      // Fetch USDC balance from Base (always use Base client for USDC)
      let usdcBalance = BigInt(0)
      
      try {
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
      } catch (usdcError) {
        console.error('Failed to fetch USDC balance from Base:', usdcError)
      }

      // Fetch PICKLES balance from Base
      let picklesBalance = BigInt(0)
      
      try {
        const picklesResult = await baseClient.readContract({
          address: PICKLES_ADDRESS as `0x${string}`,
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
        picklesBalance = picklesResult as bigint
      } catch (picklesError) {
        console.error('Failed to fetch PICKLES balance from Base:', picklesError)
      }

      // Format balances
      const ethFormatted = formatUnits(ethBalance, 18)
      const usdcFormatted = formatUnits(usdcBalance, 6)
      const picklesFormatted = formatUnits(picklesBalance, 18)
      
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
        {
          symbol: 'PKLS',
          balance: picklesFormatted,
          decimals: 18,
          address: PICKLES_ADDRESS,
        },
      ]

      setBalances(newBalances)
      return newBalances;
    } catch (err) {
      console.error('Error fetching balances:', err)
      setError('Failed to fetch balances')
      const errorBalances: TokenBalance[] = [
        {
          symbol: 'ETH',
          balance: "0.0000",
          decimals: 18,
        },
        {
          symbol: 'USDC',
          balance: "0.00",
          decimals: 6,
          address: USDC_ADDRESS,
        },
        {
          symbol: 'PKLS',
          balance: "0.0000",
          decimals: 18,
          address: PICKLES_ADDRESS,
        },
      ]
      setBalances(errorBalances);
      return errorBalances;
    } finally {
      setLoading(false)
    }
  }, [address, isConnected, publicClient, chainId])

  useEffect(() => {
    fetchBalances()
  }, [address, isConnected, publicClient, chainId, fetchBalances])

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances,
  }
}

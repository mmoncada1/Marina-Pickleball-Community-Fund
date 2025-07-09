import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// Create Base client for transaction verification
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
})

export interface TransactionStatus {
  exists: boolean
  confirmed: boolean
  blockNumber?: bigint
  status?: 'success' | 'reverted'
  gasUsed?: bigint
  effectiveGasPrice?: bigint
}

/**
 * Check if a transaction hash exists and get its status
 */
export async function checkTransactionStatus(txHash: string): Promise<TransactionStatus> {
  try {
    // Skip check for simulation hashes
    if (txHash.startsWith('0xSIMULATED') || txHash.startsWith('0xFAILED')) {
      return {
        exists: false,
        confirmed: false
      }
    }

    // Get transaction receipt
    const receipt = await baseClient.getTransactionReceipt({
      hash: txHash as `0x${string}`
    })

    if (receipt) {
      return {
        exists: true,
        confirmed: true,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 'success' ? 'success' : 'reverted',
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice
      }
    }

    // Try to get transaction (exists but not confirmed)
    const tx = await baseClient.getTransaction({
      hash: txHash as `0x${string}`
    })

    if (tx) {
      return {
        exists: true,
        confirmed: false
      }
    }

    return {
      exists: false,
      confirmed: false
    }

  } catch (error) {
    console.error('Error checking transaction status:', error)
    return {
      exists: false,
      confirmed: false
    }
  }
}

/**
 * Generate BaseScan URL for transaction
 */
export function getBaseScanUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`
}

/**
 * Validate if hash looks like a real transaction hash
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash) && 
         !txHash.startsWith('0xSIMULATED') && 
         !txHash.startsWith('0xFAILED')
}

/**
 * Get transaction type description
 */
export function getTransactionType(txHash: string): 'real' | 'simulated' | 'failed' | 'invalid' {
  if (txHash.startsWith('0xSIMULATED')) return 'simulated'
  if (txHash.startsWith('0xFAILED')) return 'failed'
  if (isValidTxHash(txHash)) return 'real'
  return 'invalid'
}

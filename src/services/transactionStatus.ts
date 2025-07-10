import { createPublicClient, http, Address } from 'viem'
import { base } from 'viem/chains'

const baseClient = createPublicClient({
  chain: base,
  transport: http()
})

export interface TransactionStatus {
  exists: boolean
  confirmed: boolean
  status: 'success' | 'reverted' | 'pending'
  blockNumber?: number
  gasUsed?: bigint
  effectiveGasPrice?: bigint
  error?: string
}

export interface OrderStatus {
  orderUid: string
  status: 'pending' | 'executed' | 'failed' | 'cancelled'
  executed: boolean
  txHash?: string
  error?: string
}

/**
 * Check transaction status on Base network
 */
export async function checkTransactionStatus(txHash: string): Promise<TransactionStatus> {
  try {
    // Get transaction receipt
    const receipt = await baseClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
    
    if (receipt) {
      return {
        exists: true,
        confirmed: true, // Assume confirmed if receipt exists
        status: receipt.status === 'success' ? 'success' : 'reverted',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice
      }
    } else {
      return {
        exists: false,
        confirmed: false,
        status: 'pending'
      }
    }
  } catch (error) {
    console.error('❌ Error checking transaction status:', error)
    
    // If transaction doesn't exist yet, return pending status
    if (error instanceof Error && error.message.includes('not found')) {
      return {
        exists: false,
        confirmed: false,
        status: 'pending'
      }
    }
    
    return {
      exists: false,
      confirmed: false,
      status: 'pending',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check CoW Protocol order status
 */
export async function checkOrderStatus(orderUid: string): Promise<OrderStatus> {
  try {
    // Call the CoW Protocol API to get real order status
    const response = await fetch(`/api/cow-order-status?orderUid=${orderUid}`)
    
    if (!response.ok) {
      throw new Error(`Failed to check order status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      return {
        orderUid,
        status: data.isExecuted ? 'executed' : data.isFailed ? 'failed' : 'pending',
        executed: data.isExecuted,
        txHash: data.transactionHash,
        error: data.isFailed ? 'Order failed to execute' : undefined
      }
    } else {
      throw new Error(data.error || 'Failed to get order status')
    }
  } catch (error) {
    console.error('❌ Error checking order status:', error)
    return {
      orderUid,
      status: 'pending',
      executed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get BaseScan URL for transaction
 */
export function getBaseScanUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`
}

/**
 * Get transaction type based on hash pattern
 */
export function getTransactionType(txHash: string): 'real' | 'invalid' {
  // All transactions should be real - no mock transactions allowed
  if (txHash && txHash.startsWith('0x') && txHash.length === 66) {
    return 'real'
  } else {
    return 'invalid'
  }
}

/**
 * Monitor transaction with real-time updates
 */
export class TransactionMonitor {
  private intervalId?: NodeJS.Timeout
  
  constructor(
    private txHash: string,
    private onUpdate: (status: TransactionStatus) => void,
    private onComplete: (status: TransactionStatus) => void,
    private maxAttempts: number = 30 // 5 minutes at 10-second intervals
  ) {}
  
  start(): void {
    let attempts = 0
    
    this.intervalId = setInterval(async () => {
      attempts++
      
      try {
        const status = await checkTransactionStatus(this.txHash)
        
        // Call update callback
        this.onUpdate(status)
        
        // Check if transaction is confirmed or we've reached max attempts
        if (status.confirmed || attempts >= this.maxAttempts) {
          this.stop()
          this.onComplete(status)
        }
        
      } catch (error) {
        console.error('Error in transaction monitor:', error)
        
        if (attempts >= this.maxAttempts) {
          this.stop()
          this.onComplete({
            exists: false,
            confirmed: false,
            status: 'pending',
            error: 'Monitoring timed out'
          })
        }
      }
    }, 10000) // Check every 10 seconds
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
      console.log('⏹️ Stopped transaction monitor for:', this.txHash)
    }
  }
}

/**
 * Monitor CoW Protocol order with real-time updates
 */
export class OrderMonitor {
  private intervalId?: NodeJS.Timeout
  
  constructor(
    private orderUid: string,
    private onUpdate: (status: OrderStatus) => void,
    private onComplete: (status: OrderStatus) => void,
    private maxAttempts: number = 30 // 5 minutes at 10-second intervals
  ) {}
  
  start(): void {
    let attempts = 0
    
    this.intervalId = setInterval(async () => {
      attempts++
      
      try {
        const status = await checkOrderStatus(this.orderUid)
        
        // Call update callback
        this.onUpdate(status)
        
        // Check if order is executed/failed or we've reached max attempts
        if (status.executed || status.status === 'failed' || attempts >= this.maxAttempts) {
          this.stop()
          this.onComplete(status)
        }
        
      } catch (error) {
        console.error('Error in order monitor:', error)
        
        if (attempts >= this.maxAttempts) {
          this.stop()
          this.onComplete({
            orderUid: this.orderUid,
            status: 'pending',
            executed: false,
            error: 'Monitoring timed out'
          })
        }
      }
    }, 10000) // Check every 10 seconds
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
      console.log('⏹️ Stopped order monitor for:', this.orderUid)
    }
  }
} 
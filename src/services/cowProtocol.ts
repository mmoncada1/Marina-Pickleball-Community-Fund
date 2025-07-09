import { Address, Hex, createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { base } from 'viem/chains'

// CoW Protocol API configuration
const COW_API_BASE_URL = process.env.COW_API_BASE_URL || 'https://api.cow.fi/base/api/v1'

// CoW Protocol contracts on Base
export const COW_SETTLEMENT_CONTRACT = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' as Address
export const COW_VAULT_RELAYER = '0xC92E8bdf79f0507f65a392b0ab4667716BFE0110' as Address

// USDC contract on Base
export const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address

// WETH contract on Base
export const WETH_CONTRACT = '0x4200000000000000000000000000000000000006' as Address

interface OrderQuoteRequest {
  sellToken: Address
  buyToken: Address
  sellAmount: string
  kind: 'sell' | 'buy'
  receiver?: Address
  validTo?: number
  appData?: string
  partiallyFillable?: boolean
  signingScheme?: string
}

interface OrderQuoteResponse {
  quote: {
    sellToken: Address
    buyToken: Address
    sellAmount: string
    buyAmount: string
    validTo: number
    appData: Hex
    feeAmount: string
    kind: string
    partiallyFillable: boolean
    sellTokenBalance: string
    buyTokenBalance: string
  }
  from: Address
  expiration: string
  id: string
}

interface OrderSubmission {
  sellToken: Address
  buyToken: Address
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: Hex
  feeAmount: string
  kind: string
  partiallyFillable: boolean
  receiver?: Address
  sellTokenBalance: string
  buyTokenBalance: string
  signature: Hex
  signingScheme: string
  from: Address
}

interface OrderResponse {
  orderUid: Hex
}

export class CowProtocolService {
  private baseClient = createPublicClient({
    chain: base,
    transport: http()
  })

  /**
   * Get a quote for a USDC to ETH swap
   */
  async getQuote(
    usdcAmount: bigint,
    userAddress: Address,
    validityDuration: number = 3600 // 1 hour
  ): Promise<OrderQuoteResponse> {
    const validTo = Math.floor(Date.now() / 1000) + validityDuration

    const quoteRequest: OrderQuoteRequest = {
      sellToken: USDC_CONTRACT,
      buyToken: WETH_CONTRACT,
      sellAmount: usdcAmount.toString(),
      kind: 'sell',
      receiver: userAddress,
      validTo,
      partiallyFillable: false,
      signingScheme: 'eip712'
    }

    console.log('Requesting CoW Protocol quote:', quoteRequest)

    const response = await fetch(`${COW_API_BASE_URL}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(quoteRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('CoW Protocol quote error:', response.status, errorText)
      throw new Error(`Failed to get quote from CoW Protocol: ${response.status} ${errorText}`)
    }

    const quote = await response.json()
    console.log('CoW Protocol quote received:', quote)
    return quote
  }

  /**
   * Submit an order to CoW Protocol
   */
  async submitOrder(
    quote: OrderQuoteResponse,
    signature: Hex,
    userAddress: Address
  ): Promise<OrderResponse> {
    const orderSubmission: OrderSubmission = {
      sellToken: quote.quote.sellToken,
      buyToken: quote.quote.buyToken,
      sellAmount: quote.quote.sellAmount,
      buyAmount: quote.quote.buyAmount,
      validTo: quote.quote.validTo,
      appData: quote.quote.appData,
      feeAmount: quote.quote.feeAmount,
      kind: quote.quote.kind,
      partiallyFillable: quote.quote.partiallyFillable,
      receiver: userAddress,
      sellTokenBalance: quote.quote.sellTokenBalance,
      buyTokenBalance: quote.quote.buyTokenBalance,
      signature,
      signingScheme: 'eip712',
      from: userAddress
    }

    console.log('Submitting order to CoW Protocol:', orderSubmission)

    const response = await fetch(`${COW_API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderSubmission)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('CoW Protocol order submission error:', response.status, errorText)
      throw new Error(`Failed to submit order to CoW Protocol: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('CoW Protocol order submitted:', result)
    return result
  }

  /**
   * Get order status from CoW Protocol
   */
  async getOrderStatus(orderUid: Hex): Promise<{
    status: 'presignaturePending' | 'open' | 'fulfilled' | 'cancelled' | 'expired'
    creationDate: string
    executedSellAmount?: string
    executedBuyAmount?: string
    executedFeeAmount?: string
    txHash?: Hex
  }> {
    const response = await fetch(`${COW_API_BASE_URL}/orders/${orderUid}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('CoW Protocol order status error:', response.status, errorText)
      throw new Error(`Failed to get order status: ${response.status} ${errorText}`)
    }

    return await response.json()
  }

  /**
   * Create EIP-712 typed data for order signing
   */
  createOrderTypedData(quote: OrderQuoteResponse) {
    const domain = {
      name: 'Gnosis Protocol',
      version: 'v2',
      chainId: base.id,
      verifyingContract: COW_SETTLEMENT_CONTRACT
    }

    const types = {
      Order: [
        { name: 'sellToken', type: 'address' },
        { name: 'buyToken', type: 'address' },
        { name: 'receiver', type: 'address' },
        { name: 'sellAmount', type: 'uint256' },
        { name: 'buyAmount', type: 'uint256' },
        { name: 'validTo', type: 'uint32' },
        { name: 'appData', type: 'bytes32' },
        { name: 'feeAmount', type: 'uint256' },
        { name: 'kind', type: 'string' },
        { name: 'partiallyFillable', type: 'bool' },
        { name: 'sellTokenBalance', type: 'string' },
        { name: 'buyTokenBalance', type: 'string' }
      ]
    }

    const message = {
      sellToken: quote.quote.sellToken,
      buyToken: quote.quote.buyToken,
      receiver: quote.from,
      sellAmount: quote.quote.sellAmount,
      buyAmount: quote.quote.buyAmount,
      validTo: quote.quote.validTo,
      appData: quote.quote.appData,
      feeAmount: quote.quote.feeAmount,
      kind: quote.quote.kind,
      partiallyFillable: quote.quote.partiallyFillable,
      sellTokenBalance: quote.quote.sellTokenBalance,
      buyTokenBalance: quote.quote.buyTokenBalance
    }

    return { domain, types, message }
  }

  /**
   * Calculate minimum ETH amount with slippage
   */
  calculateMinimumAmount(amount: bigint, slippagePercent: number = 5): bigint {
    const slippageBasisPoints = BigInt(slippagePercent * 100) // 5% = 500 basis points
    return amount * (10000n - slippageBasisPoints) / 10000n
  }

  /**
   * Format amounts for display
   */
  formatSwapAmounts(quote: OrderQuoteResponse) {
    const sellAmountUSDC = formatUnits(BigInt(quote.quote.sellAmount), 6)
    const buyAmountETH = formatUnits(BigInt(quote.quote.buyAmount), 18)
    const feeAmountUSDC = formatUnits(BigInt(quote.quote.feeAmount), 6)
    
    return {
      sellAmount: `${sellAmountUSDC} USDC`,
      buyAmount: `${buyAmountETH} ETH`,
      feeAmount: `${feeAmountUSDC} USDC`,
      price: `${(parseFloat(sellAmountUSDC) / parseFloat(buyAmountETH)).toFixed(2)} USDC/ETH`
    }
  }

  /**
   * Monitor an order until it's executed and return the transaction hash
   */
   async monitorOrderExecution(
    orderUid: Hex,
    maxWaitTime: number = 300000, // 5 minutes
    pollInterval: number = 10000 // 10 seconds
  ): Promise<{
    executed: boolean
    txHash?: Hex
    status: string
    executedSellAmount?: string
    executedBuyAmount?: string
  }> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const orderStatus = await this.getOrderStatus(orderUid)
        
        console.log(`Order ${orderUid} status:`, orderStatus.status)
        
        if (orderStatus.status === 'fulfilled' && orderStatus.txHash) {
          console.log(`✅ Order executed! Transaction hash: ${orderStatus.txHash}`)
          return {
            executed: true,
            txHash: orderStatus.txHash,
            status: orderStatus.status,
            executedSellAmount: orderStatus.executedSellAmount,
            executedBuyAmount: orderStatus.executedBuyAmount
          }
        }
        
        if (orderStatus.status === 'cancelled' || orderStatus.status === 'expired') {
          console.log(`❌ Order ${orderStatus.status}`)
          return {
            executed: false,
            status: orderStatus.status
          }
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        
      } catch (error) {
        console.error(`Error monitoring order ${orderUid}:`, error)
        // Continue polling despite errors
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }
    }
    
    console.log(`⏰ Order monitoring timed out after ${maxWaitTime}ms`)
    return {
      executed: false,
      status: 'timeout'
    }
  }
}

export const cowProtocolService = new CowProtocolService()

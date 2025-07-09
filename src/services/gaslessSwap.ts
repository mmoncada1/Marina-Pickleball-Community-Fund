import { Address, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// Helper function to safely serialize objects with BigInt values
function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}

export interface GaslessSwapParams {
  userAddress: Address
  usdcAmount: bigint
  minEthAmount: bigint
  deadline: bigint
  permitSignature?: {
    v: number
    r: string
    s: string
    deadline: bigint
    nonce: bigint
  }
}

export interface RelayerResponse {
  success: boolean
  transactionHash?: string
  orderUid?: string
  error?: string
  estimatedGas?: string
  relayerFee?: string
  isRealTransaction?: boolean
  basescanUrl?: string
  explorerMessage?: string
}

// Mock relayer service - in production this would be a real backend service
export class GaslessSwapRelayer {
  private baseClient = createPublicClient({
    chain: base,
    transport: http()
  })

  private relayerWallet: Address = '0x0000000000000000000000000000000000000001' // Mock relayer address

  /**
   * Submit a gasless swap transaction to the relayer
   */
  async submitGaslessSwap(params: GaslessSwapParams): Promise<RelayerResponse> {
    try {
      console.log('Submitting gasless swap to relayer:', params)

      // Call our backend relayer service
      const requestBody = {
        userAddress: params.userAddress,
        usdcAmount: params.usdcAmount.toString(),
        minEthAmount: params.minEthAmount.toString(),
        deadline: params.deadline.toString(),
        permitSignature: params.permitSignature ? {
          v: params.permitSignature.v,
          r: params.permitSignature.r,
          s: params.permitSignature.s,
          deadline: params.permitSignature.deadline.toString(),
          nonce: params.permitSignature.nonce.toString()
        } : undefined
      }

      console.log('Sending request body:', requestBody)

      const response = await fetch('/api/gasless-swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Relayer API error:', response.status, errorText)
        throw new Error(`Relayer API error (${response.status}): ${errorText || response.statusText}`)
      }

      const result = await response.json()
      console.log('Relayer response:', result)
      return result

    } catch (error) {
      console.error('Relayer submission failed:', error)
      console.error('Failed params:', params)
      return {
        success: false,
        error: `Relayer error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Simulate relayer transaction for demo purposes
   */
  private async simulateRelayerTransaction(params: GaslessSwapParams): Promise<RelayerResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulate successful transaction
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`
    
    return {
      success: true,
      transactionHash: mockTxHash,
      estimatedGas: '150000',
      relayerFee: '0.001' // ETH
    }
  }

  /**
   * Get relayer fee estimate
   */
  async getRelayerFeeEstimate(usdcAmount: bigint): Promise<{
    gasEstimate: bigint
    relayerFeeETH: bigint
    relayerFeeUSDC: bigint
    netETHReceived: bigint
  }> {
    try {
      // Mock fee calculation
      // In production, this would query current gas prices and calculate actual fees
      
      const gasEstimate = 200000n // Gas units
      const gasPriceWei = 1000000000n // 1 gwei
      const gasFeeTotalWei = gasEstimate * gasPriceWei
      
      // Relayer markup (10% of gas cost)
      const relayerMarkup = gasFeeTotalWei / 10n
      const totalRelayerFeeETH = gasFeeTotalWei + relayerMarkup

      // Convert USDC to ETH (mock rate: 1 USDC = 1/3400 ETH)
      const ethPrice = 3400n
      const usdcAmountFormatted = usdcAmount / 1000000n // USDC has 6 decimals
      const totalETHWei = (usdcAmountFormatted * 1000000000000000000n) / ethPrice

      // Calculate relayer fee in USDC
      const relayerFeeUSDC = (totalRelayerFeeETH * ethPrice) / 1000000000000000000n * 1000000n

      // Net ETH user will receive
      const netETHReceived = totalETHWei - totalRelayerFeeETH

      return {
        gasEstimate,
        relayerFeeETH: totalRelayerFeeETH,
        relayerFeeUSDC,
        netETHReceived: netETHReceived > 0n ? netETHReceived : 0n
      }
    } catch (error) {
      console.error('Error calculating relayer fees:', error)
      return {
        gasEstimate: 0n,
        relayerFeeETH: 0n,
        relayerFeeUSDC: 0n,
        netETHReceived: 0n
      }
    }
  }

  /**
   * Check relayer status and available balance
   */
  async getRelayerStatus(): Promise<{
    isOnline: boolean
    availableBalance: string
    supportedTokens: string[]
    minimumSwapAmount: string
  }> {
    return {
      isOnline: true,
      availableBalance: '10.5', // ETH
      supportedTokens: ['USDC', 'USDT', 'DAI'],
      minimumSwapAmount: '1' // USDC
    }
  }
}

// Singleton instance
export const gaslessSwapRelayer = new GaslessSwapRelayer()

/**
 * Account Abstraction Integration
 * This would integrate with Privy's smart wallet features
 */
export class AccountAbstractionSwap {
  
  /**
   * Check if user's wallet supports gasless transactions
   */
  async checkGaslessSupport(walletAddress: Address): Promise<{
    supportsGasless: boolean
    walletType: 'EOA' | 'SmartWallet'
    paymaster?: Address
  }> {
    try {
      // Check if the address is a smart contract
      const code = await this.baseClient.getBytecode({ address: walletAddress })
      const isSmartWallet = code && code !== '0x'

      return {
        supportsGasless: !!isSmartWallet,
        walletType: isSmartWallet ? 'SmartWallet' : 'EOA',
        paymaster: isSmartWallet ? '0x1234567890123456789012345678901234567890' as Address : undefined
      }
    } catch (error) {
      console.error('Error checking gasless support:', error)
      return {
        supportsGasless: false,
        walletType: 'EOA'
      }
    }
  }

  private baseClient = createPublicClient({
    chain: base,
    transport: http()
  })

  /**
   * Execute gasless swap using account abstraction
   */
  async executeGaslessSwap(params: GaslessSwapParams): Promise<RelayerResponse> {
    try {
      // This would integrate with Privy's account abstraction features
      // For now, we'll simulate the process
      
      console.log('Executing gasless swap via Account Abstraction:', params)
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      return {
        success: true,
        transactionHash: `0xaa${Math.random().toString(16).substr(2, 62)}`,
        estimatedGas: '120000'
      }
    } catch (error) {
      return {
        success: false,
        error: `Account Abstraction error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const accountAbstractionSwap = new AccountAbstractionSwap()

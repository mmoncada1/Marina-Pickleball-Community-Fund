'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSignTypedData } from 'wagmi'
import { parseUnits, formatUnits, Address } from 'viem'
import { base } from 'wagmi/chains'
import { USDC_CONTRACT, USDC_PERMIT_ABI, checkUSDCPermitSupport, generatePermitSignature, getUserNonce } from '../utils/usdcPermit'
import { gaslessSwapRelayer, accountAbstractionSwap, GaslessSwapParams, RelayerResponse } from '../services/gaslessSwap'
import { checkTransactionStatus, getBaseScanUrl, getTransactionType } from '../utils/transactionStatus'
import { Clock, Zap } from 'lucide-react'

interface GaslessCowswapProps {
  usdcAmount: string
  onSuccess?: () => void
  onCancel?: () => void
}

type SwapMethod = 'traditional' | 'gasless-relayer' | 'account-abstraction'
type SwapStep = 'method-selection' | 'fee-estimation' | 'permit-signing' | 'swap-execution' | 'completed' | 'failed'

// CoW Protocol contracts on Base
const COW_SETTLEMENT_CONTRACT = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' as Address

export default function GaslessCowswap({ 
  usdcAmount, 
  onSuccess, 
  onCancel 
}: GaslessCowswapProps) {
  const { address } = useAccount()
  const [swapMethod, setSwapMethod] = useState<SwapMethod>('gasless-relayer')
  const [step, setStep] = useState<SwapStep>('method-selection')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedEth, setEstimatedEth] = useState<string>('0')
  const [permitSupport, setPermitSupport] = useState<{
    supportsEIP2612: boolean
    supportsUSDCv2: boolean
    domainSeparator?: string
  } | null>(null)
  const [gaslessSupport, setGaslessSupport] = useState<{
    supportsGasless: boolean
    walletType: 'EOA' | 'SmartWallet'
    paymaster?: Address
  } | null>(null)
  const [feeEstimate, setFeeEstimate] = useState<{
    gasEstimate: bigint
    relayerFeeETH: bigint
    relayerFeeUSDC: bigint
    netETHReceived: bigint
  } | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [orderUid, setOrderUid] = useState<string | null>(null)
  const [isRealTransaction, setIsRealTransaction] = useState<boolean>(false)
  const [basescanUrl, setBasescanUrl] = useState<string | null>(null)
  const [explorerMessage, setExplorerMessage] = useState<string>('')
  const [orderStatus, setOrderStatus] = useState<{
    checking: boolean
    status?: string
    executed: boolean
    txHash?: string
  }>({ checking: false, executed: false })
  const [transactionStatus, setTransactionStatus] = useState<{
    checking: boolean
    exists: boolean
    confirmed: boolean
    status?: 'success' | 'reverted'
  }>({ checking: false, exists: false, confirmed: false })

  const usdcAmountWei = parseUnits(usdcAmount, 6) // USDC has 6 decimals

  // Check current USDC allowance for traditional swaps
  const { data: allowance } = useReadContract({
    address: USDC_CONTRACT,
    abi: USDC_PERMIT_ABI,
    functionName: 'allowance',
    args: address ? [address, COW_SETTLEMENT_CONTRACT] : undefined,
    query: { enabled: !!address }
  })

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT,
    abi: USDC_PERMIT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // Traditional approval transaction
  const { 
    writeContract: approveUsdc,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError
  } = useWriteContract()

  // Wait for approval transaction
  const { 
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed 
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Sign typed data for permits
  const { signTypedDataAsync } = useSignTypedData()

  // Initialize - check permit and gasless support
  useEffect(() => {
    const initializeSwapOptions = async () => {
      if (!address) return

      try {
        // Check USDC permit support
        const permitInfo = await checkUSDCPermitSupport()
        setPermitSupport(permitInfo)

        // Check gasless support
        const gaslessInfo = await accountAbstractionSwap.checkGaslessSupport(address)
        setGaslessSupport(gaslessInfo)

        // Default to gasless if supported, otherwise traditional
        if (gaslessInfo.supportsGasless) {
          setSwapMethod('account-abstraction')
        } else if (permitInfo.supportsEIP2612 || permitInfo.supportsUSDCv2) {
          setSwapMethod('gasless-relayer')
        } else {
          setSwapMethod('traditional')
        }
      } catch (error) {
        console.error('Error initializing swap options:', error)
      }
    }

    initializeSwapOptions()
  }, [address])

  // Calculate estimated ETH output and fees
  useEffect(() => {
    const calculateEstimates = async () => {
      if (!usdcAmount || parseFloat(usdcAmount) <= 0) return

      try {
        // Simple ETH estimation
        const ethPrice = 3400 // USD per ETH
        const usdcValue = parseFloat(usdcAmount)
        const ethAmount = usdcValue / ethPrice
        setEstimatedEth(ethAmount.toFixed(6))

        // Get relayer fee estimate if using gasless
        if (swapMethod === 'gasless-relayer') {
          const fees = await gaslessSwapRelayer.getRelayerFeeEstimate(usdcAmountWei)
          setFeeEstimate(fees)
        }
      } catch (error) {
        console.error('Error calculating estimates:', error)
      }
    }

    calculateEstimates()
  }, [usdcAmount, swapMethod, usdcAmountWei])

  // Check if user has sufficient balance and what's needed
  const hasInsufficientBalance = usdcBalance !== undefined && usdcBalance < usdcAmountWei
  const needsApproval = allowance !== undefined && allowance < usdcAmountWei && swapMethod === 'traditional'

  // Handle traditional approval
  const handleTraditionalApprove = async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setError(null)
      
      await approveUsdc({
        address: USDC_CONTRACT,
        abi: USDC_PERMIT_ABI,
        functionName: 'approve',
        args: [COW_SETTLEMENT_CONTRACT, usdcAmountWei],
        chain: base,
        account: address,
      })
    } catch (error) {
      console.error('Approval failed:', error)
      setError('Failed to approve USDC spending')
      setIsLoading(false)
    }
  }

  // Handle gasless swap with permit
  const handleGaslessSwap = async () => {
    if (!address || !permitSupport) return

    try {
      setIsLoading(true)
      setError(null)
      setStep('fee-estimation')

      // Get fee estimate
      const fees = await gaslessSwapRelayer.getRelayerFeeEstimate(usdcAmountWei)
      setFeeEstimate(fees)

      setStep('permit-signing')

      // Get user's current nonce
      const nonce = await getUserNonce(address)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now

      // Generate permit signature
      let permitSignature: any = null

      if (permitSupport.supportsEIP2612) {
        // Sign permit for EIP-2612
        const domain = {
          name: 'USD Coin',
          version: '2',
          chainId: base.id,
          verifyingContract: USDC_CONTRACT
        }

        const types = {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ]
        }

        const message = {
          owner: address,
          spender: COW_SETTLEMENT_CONTRACT,
          value: usdcAmountWei.toString(),
          nonce: nonce.toString(),
          deadline: deadline.toString()
        }

        const signature = await signTypedDataAsync({
          account: address,
          domain,
          types,
          primaryType: 'Permit',
          message
        })

        // Split signature
        const r = signature.slice(0, 66)
        const s = '0x' + signature.slice(66, 130)
        const v = parseInt(signature.slice(130, 132), 16)

        permitSignature = { v, r, s, deadline, nonce }
      }

      setStep('swap-execution')

      // Submit to gasless relayer
      const swapParams: GaslessSwapParams = {
        userAddress: address,
        usdcAmount: usdcAmountWei,
        minEthAmount: parseUnits(estimatedEth, 18) * 95n / 100n, // 5% slippage
        deadline,
        permitSignature
      }

      console.log('Submitting swap with params:', {
        ...swapParams,
        usdcAmount: swapParams.usdcAmount.toString(),
        minEthAmount: swapParams.minEthAmount.toString(),
        deadline: swapParams.deadline.toString()
      })

      const result = await gaslessSwapRelayer.submitGaslessSwap(swapParams)

      if (result.success) {
        setTransactionHash(result.transactionHash || null)
        setOrderUid(result.orderUid || null)
        setIsRealTransaction(result.isRealTransaction || false)
        setBasescanUrl(result.basescanUrl || null)
        setExplorerMessage(result.explorerMessage || '')
        setStep('completed')
        
        // Log transaction details for debugging
        console.log('Transaction completed:', {
          hash: result.transactionHash,
          orderUid: result.orderUid,
          isReal: result.isRealTransaction,
          basescanUrl: result.basescanUrl
        })
        
        // If we have a CoW Protocol order UID, start monitoring for execution
        if (result.orderUid && result.transactionHash?.startsWith('0xCOW')) {
          console.log('🔍 Starting CoW Protocol order monitoring:', result.orderUid)
          monitorCowOrder(result.orderUid)
        }
        
        // Verify transaction status if it's a real transaction
        if (result.isRealTransaction && result.transactionHash && !result.transactionHash.startsWith('0xCOW')) {
          setTransactionStatus({ checking: true, exists: false, confirmed: false })
          
          // Check transaction status after a short delay
          setTimeout(async () => {
            try {
              const status = await checkTransactionStatus(result.transactionHash!)
              setTransactionStatus({
                checking: false,
                exists: status.exists,
                confirmed: status.confirmed,
                status: status.status
              })
              
              console.log('Transaction verification:', status)
            } catch (error) {
              console.error('Failed to verify transaction:', error)
              setTransactionStatus({ checking: false, exists: false, confirmed: false })
            }
          }, 5000) // Wait 5 seconds for transaction to propagate
        }
        
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 5000) // Give more time to verify transaction
      } else {
        throw new Error(result.error || 'Gasless swap failed')
      }

    } catch (error) {
      console.error('Gasless swap failed:', error)
      
      let errorMessage = 'Gasless swap failed'
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled by user'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient balance for swap or relayer has insufficient funds'
        } else if (error.message.includes('Relayer')) {
          errorMessage = 'Relayer service temporarily unavailable'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network connection error - please check your connection'
        } else if (error.message.includes('gas')) {
          errorMessage = 'Gas estimation failed - please try again'
        } else {
          errorMessage = `Swap failed: ${error.message}`
        }
      }
      
      setError(errorMessage)
      setStep('failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle account abstraction swap
  const handleAccountAbstractionSwap = async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setError(null)
      setStep('swap-execution')

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
      
      const swapParams: GaslessSwapParams = {
        userAddress: address,
        usdcAmount: usdcAmountWei,
        minEthAmount: parseUnits(estimatedEth, 18) * 95n / 100n, // 5% slippage
        deadline
      }

      const result = await accountAbstractionSwap.executeGaslessSwap(swapParams)

      if (result.success) {
        setTransactionHash(result.transactionHash || null)
        setStep('completed')
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 2000)
      } else {
        throw new Error(result.error || 'Account abstraction swap failed')
      }

    } catch (error) {
      console.error('Account abstraction swap failed:', error)
      setError(`Account abstraction swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setStep('failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Monitor CoW Protocol order for execution
  const monitorCowOrder = async (orderUid: string) => {
    setOrderStatus({ checking: true, executed: false })
    
    const maxChecks = 30 // Check for 5 minutes
    let checks = 0
    
    const checkOrder = async () => {
      try {
        const response = await fetch(`/api/cow-order-status?orderUid=${orderUid}`)
        const data = await response.json()
        
        console.log('CoW order status:', data)
        
        if (data.success) {
          setOrderStatus({
            checking: !data.isExecuted && !data.isFailed,
            status: data.status,
            executed: data.isExecuted,
            txHash: data.transactionHash
          })
          
          if (data.isExecuted && data.transactionHash) {
            console.log('✅ CoW order executed! Real transaction hash:', data.transactionHash)
            setTransactionHash(data.transactionHash)
            setBasescanUrl(data.basescanUrl)
            setExplorerMessage('CoW Protocol swap executed')
            setIsRealTransaction(true)
            return true // Stop monitoring
          }
          
          if (data.isFailed) {
            console.log('❌ CoW order failed:', data.status)
            setExplorerMessage(`Order ${data.status}`)
            return true // Stop monitoring
          }
        }
        
        checks++
        if (checks < maxChecks) {
          setTimeout(checkOrder, 10000) // Check every 10 seconds
        } else {
          console.log('⏰ CoW order monitoring timed out')
          setOrderStatus(prev => ({ ...prev, checking: false }))
          setExplorerMessage('Order monitoring timed out')
        }
        
      } catch (error) {
        console.error('Error checking CoW order status:', error)
        checks++
        if (checks < maxChecks) {
          setTimeout(checkOrder, 10000)
        } else {
          setOrderStatus(prev => ({ ...prev, checking: false }))
        }
      }
    }
    
    // Start monitoring after a short delay
    setTimeout(checkOrder, 5000)
  }

  // Render method selection UI
  if (step === 'method-selection') {
    return (
      <div className="card max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Choose Swap Method</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Traditional Method */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              swapMethod === 'traditional' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSwapMethod('traditional')}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⛽</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Traditional Swap</h4>
                <p className="text-sm text-gray-600">Requires ETH for gas fees (you pay gas)</p>
              </div>
              <div className="text-sm text-orange-600 font-medium">
                Needs ETH
              </div>
            </div>
          </div>

          {/* Gasless Relayer Method */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              swapMethod === 'gasless-relayer' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSwapMethod('gasless-relayer')}
          >
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-green-500" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Gasless Swap (Relayer)</h4>
                <p className="text-sm text-gray-600">
                  {permitSupport?.supportsEIP2612 || permitSupport?.supportsUSDCv2
                    ? 'No ETH needed - fees deducted from swap'
                    : 'Permit signing not supported on this USDC contract'
                  }
                </p>
              </div>
              <div className="text-sm text-green-600 font-medium">
                Recommended
              </div>
            </div>
          </div>

          {/* Account Abstraction Method */}
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              swapMethod === 'account-abstraction' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSwapMethod('account-abstraction')}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Smart Wallet</h4>
                <p className="text-sm text-gray-600">
                  {gaslessSupport?.supportsGasless
                    ? 'Pay gas with USDC via smart wallet'
                    : 'Your wallet doesn\'t support this method'
                  }
                </p>
              </div>
              <div className="text-sm text-purple-600 font-medium">
                {gaslessSupport?.supportsGasless ? 'Available' : 'Unavailable'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <h5 className="font-medium text-gray-900 mb-1">About Swap Methods</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Traditional:</strong> Fastest, but requires ETH for gas</li>
                <li>• <strong>Gasless Relayer:</strong> Small fee deducted from your swap amount</li>
                <li>• <strong>Smart Wallet:</strong> Uses your smart wallet's paymaster</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (swapMethod === 'traditional') {
                setStep('swap-execution')
              } else if (swapMethod === 'gasless-relayer') {
                handleGaslessSwap()
              } else if (swapMethod === 'account-abstraction') {
                handleAccountAbstractionSwap()
              }
            }}
            disabled={
              (swapMethod === 'gasless-relayer' && !permitSupport?.supportsEIP2612 && !permitSupport?.supportsUSDCv2) ||
              (swapMethod === 'account-abstraction' && !gaslessSupport?.supportsGasless) ||
              hasInsufficientBalance
            }
            className="flex-1 btn-primary"
          >
            Continue with {
              swapMethod === 'traditional' ? 'Traditional' :
              swapMethod === 'gasless-relayer' ? 'Gasless' : 'Smart Wallet'
            }
          </button>
        </div>
      </div>
    )
  }

  // Show progress for gasless swaps
  if (['fee-estimation', 'permit-signing', 'swap-execution'].includes(step)) {
    return (
      <div className="card max-w-md mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {step === 'fee-estimation' && 'Calculating Fees...'}
            {step === 'permit-signing' && 'Sign Permission'}
            {step === 'swap-execution' && 'Executing Swap...'}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {step === 'fee-estimation' && 'Getting the best rates and fee estimates'}
            {step === 'permit-signing' && 'Please sign the permit to allow gasless trading'}
            {step === 'swap-execution' && 'Your swap is being processed...'}
          </p>

          {feeEstimate && step !== 'swap-execution' && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-gray-900 mb-2">Fee Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>USDC to swap:</span>
                  <span>{usdcAmount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated ETH:</span>
                  <span>{estimatedEth} ETH</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Relayer fee:</span>
                  <span>{formatUnits(feeEstimate.relayerFeeUSDC, 6)} USDC</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Net ETH received:</span>
                  <span>{formatUnits(feeEstimate.netETHReceived, 18)} ETH</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <button
            onClick={onCancel}
            className="btn-secondary w-full"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Show completion
  if (step === 'completed') {
    return (
      <div className="card max-w-md mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">✅</span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isRealTransaction && orderStatus.executed 
              ? 'Swap Executed Successfully!' 
              : isRealTransaction 
                ? 'Order Submitted to CoW Protocol' 
                : 'Swap Simulation Completed'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isRealTransaction && orderStatus.executed
              ? 'Your USDC has been swapped for ETH on Base network'
              : isRealTransaction && orderUid
                ? 'Your order is being processed by CoW Protocol solvers'
                : isRealTransaction 
                  ? 'Your transaction has been submitted to Base network'
                  : 'This was a simulated transaction (relayer needs funding for real transactions)'
            }
          </p>

          {transactionHash && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              {/* CoW Protocol Order UID */}
              {orderUid && (
                <>
                  <p className="text-xs text-gray-500 mb-1">CoW Protocol Order:</p>
                  <p className="text-xs font-mono text-gray-700 break-all mb-2">{orderUid}</p>
                </>
              )}
              
              {/* Transaction Hash */}
              <p className="text-xs text-gray-500 mb-1">
                {orderStatus.executed ? 'Execution Transaction:' : 'Transaction Hash:'}
              </p>
              <p className="text-xs font-mono text-gray-700 break-all mb-2">
                {orderStatus.executed && orderStatus.txHash ? orderStatus.txHash : transactionHash}
              </p>
              
              {/* Transaction Status Indicator */}
              <div className="flex items-center gap-2 mb-2">
                {isRealTransaction && orderStatus.executed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Swap Executed
                  </span>
                ) : isRealTransaction && orderUid ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    CoW Order Pending
                  </span>
                ) : isRealTransaction ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Real Transaction
                  </span>
                ) : transactionHash?.startsWith('0xSIMULATED') ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Simulated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Failed
                  </span>
                )}
                <span className="text-xs text-gray-600">{explorerMessage}</span>
              </div>

              {/* CoW Protocol Order Status */}
              {orderUid && (
                <div className="mb-2">
                  {orderStatus.checking ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>Monitoring CoW Protocol order execution...</span>
                    </div>
                  ) : orderStatus.executed ? (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <span>✅ Order executed by CoW Protocol solver</span>
                    </div>
                  ) : orderStatus.status ? (
                    <div className="text-xs text-yellow-600">
                      ⏳ Order status: {orderStatus.status}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Transaction Verification Status */}
              {isRealTransaction && !orderUid && (
                <div className="mb-2">
                  {transactionStatus.checking ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>Verifying transaction on Base network...</span>
                    </div>
                  ) : transactionStatus.exists ? (
                    <div className="flex items-center gap-2 text-xs">
                      {transactionStatus.confirmed ? (
                        transactionStatus.status === 'success' ? (
                          <>
                            <span className="text-green-600">✅ Transaction confirmed on Base</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-600">❌ Transaction reverted</span>
                          </>
                        )
                      ) : (
                        <span className="text-yellow-600">⏳ Transaction pending confirmation</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-red-600">
                      ⚠️ Transaction not found on Base network
                    </div>
                  )}
                </div>
              )}

              {/* BaseScan Link */}
              {isRealTransaction && (
                <a 
                  href={orderStatus.executed && orderStatus.txHash 
                    ? `https://basescan.org/tx/${orderStatus.txHash}`
                    : basescanUrl || `https://basescan.org/tx/${transactionHash}`
                  }
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  <span>View on BaseScan</span>
                  <span>↗</span>
                </a>
              )}
              
              {/* Funding Instructions */}
              {!isRealTransaction && transactionHash?.startsWith('0xSIMULATED') && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-700">
                    💡 <strong>To enable real transactions:</strong> Fund the relayer wallet with ETH on Base network
                  </p>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={onSuccess}
            className="btn-primary w-full"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // Show failure
  if (step === 'failed') {
    return (
      <div className="card max-w-md mx-auto">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Swap Failed</h3>
          <p className="text-gray-600 mb-4">
            There was an issue processing your swap
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setStep('method-selection')
                setError(null)
              }}
              className="flex-1 btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Traditional swap flow (keeping existing logic for fallback)
  return (
    <div className="card max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Traditional Swap</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-amber-700 text-sm">
              This method requires ETH for gas fees
            </p>
          </div>
        </div>

        {hasInsufficientBalance && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">Insufficient USDC balance</p>
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleTraditionalApprove}
            disabled={isLoading || isApprovePending || isApproveConfirming || hasInsufficientBalance}
            className="btn-primary w-full"
          >
            {isApprovePending || isApproveConfirming 
              ? 'Approving...' 
              : `Approve ${usdcAmount} USDC`
            }
          </button>
        ) : (
          <div className="text-center py-4">
            <p className="text-green-600">✓ USDC approved for trading</p>
          </div>
        )}

        <button
          onClick={onCancel}
          className="btn-secondary w-full"
        >
          Back to Methods
        </button>
      </div>
    </div>
  )
}

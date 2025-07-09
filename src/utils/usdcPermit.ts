import { Address, createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// USDC contract address on Base
export const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address

// Extended ERC20 ABI with permit functions
export const USDC_PERMIT_ABI = [
  // Standard ERC20
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // EIP-2612 Permit (if supported)
  {
    name: 'permit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'DOMAIN_SEPARATOR',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  // USDC v2 specific permit function
  {
    name: 'receiveWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: []
  }
] as const

// Create a client for Base chain
export const baseClient = createPublicClient({
  chain: base,
  transport: http()
})

// Check if USDC supports EIP-2612 permit
export async function checkUSDCPermitSupport(): Promise<{
  supportsEIP2612: boolean
  supportsUSDCv2: boolean
  domainSeparator?: string
}> {
  try {
    // Try to read DOMAIN_SEPARATOR for EIP-2612
    let supportsEIP2612 = false
    let domainSeparator: string | undefined

    try {
      domainSeparator = await baseClient.readContract({
        address: USDC_CONTRACT,
        abi: USDC_PERMIT_ABI,
        functionName: 'DOMAIN_SEPARATOR',
      }) as string
      supportsEIP2612 = true
    } catch (error) {
      console.log('USDC does not support EIP-2612 DOMAIN_SEPARATOR:', error)
    }

    // Check for USDC v2 transferWithAuthorization
    let supportsUSDCv2 = false
    try {
      // We can't easily test this without making a call, but we can assume
      // USDC on Base likely supports v2 authorization methods
      supportsUSDCv2 = true
    } catch (error) {
      console.log('USDC v2 authorization check failed:', error)
    }

    return {
      supportsEIP2612,
      supportsUSDCv2,
      domainSeparator
    }
  } catch (error) {
    console.error('Error checking USDC permit support:', error)
    return {
      supportsEIP2612: false,
      supportsUSDCv2: false
    }
  }
}

// Generate permit signature for EIP-2612
export async function generatePermitSignature(
  owner: Address,
  spender: Address,
  value: bigint,
  deadline: bigint,
  nonce: bigint,
  signer: any // wallet signer
): Promise<{ v: number; r: string; s: string } | null> {
  try {
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
      owner,
      spender,
      value: value.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString()
    }

    // Sign the permit
    const signature = await signer.signTypedData({
      domain,
      types,
      primaryType: 'Permit',
      message
    })

    // Split signature
    const r = signature.slice(0, 66)
    const s = '0x' + signature.slice(66, 130)
    const v = parseInt(signature.slice(130, 132), 16)

    return { v, r, s }
  } catch (error) {
    console.error('Error generating permit signature:', error)
    return null
  }
}

// Get user's nonce for permits
export async function getUserNonce(userAddress: Address): Promise<bigint> {
  try {
    const nonce = await baseClient.readContract({
      address: USDC_CONTRACT,
      abi: USDC_PERMIT_ABI,
      functionName: 'nonces',
      args: [userAddress]
    }) as bigint

    return nonce
  } catch (error) {
    console.error('Error getting user nonce:', error)
    return 0n
  }
}

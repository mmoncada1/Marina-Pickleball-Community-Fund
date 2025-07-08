'use client'

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, arbitrum, arbitrumSepolia } from 'wagmi/chains'
import { ReactNode } from 'react'

// Configure wagmi
const config = createConfig({
  chains: [mainnet, sepolia, arbitrum, arbitrumSepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
})

// Create a client
const queryClient = new QueryClient()

interface PrivyProviderProps {
  children: ReactNode
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <BasePrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        // Display email and wallet as login methods
        loginMethods: ['email', 'wallet', 'sms'],
        // Customize Privy's appearance in your app
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: 'https://your-logo-url',
        },
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        // Configure external wallets
        externalWallets: {
          coinbaseWallet: {
            // Coinbase Wallet is enabled by default
            connectionOptions: 'smartWalletOnly',
          },
          metamask: {
            // MetaMask is enabled by default
          },
          walletConnect: {
            // WalletConnect is enabled by default
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </BasePrivyProvider>
  )
}

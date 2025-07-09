import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { wagmiConfig } from '../../lib/wagmi.config'
import { base, mainnet, optimism, arbitrum } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  
  if (!privyAppId) {
    console.error('NEXT_PUBLIC_PRIVY_APP_ID is not defined in environment variables');
    return <div>Configuration Error: Missing Privy App ID</div>;
  }

  return (
    <BasePrivyProvider
      appId={privyAppId}
      config={{
        // Basic embedded wallet setup
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        // For Coinbase Smart Wallet
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'smartWalletOnly',
          },
        },
        // Configure supported chains for JuicePay (all major chains)
        supportedChains: [base, mainnet, optimism, arbitrum],
        // Configure default chain for all operations (Base)
        defaultChain: base,
        // Enable funding methods specifically for Base
        fundingMethodConfig: {
          moonpay: {
            useSandbox: false, // Set to true for testing
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <Component {...pageProps} />
          </ThemeProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </BasePrivyProvider>
  )
}

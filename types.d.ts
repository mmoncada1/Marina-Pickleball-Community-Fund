declare module 'next/head' {
  import { ComponentType } from 'react'
  const Head: ComponentType<any>
  export default Head
}

// Allow all lucide-react icons - removed restrictive declaration

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_CONTRACT_ADDRESS?: string
    NEXT_PUBLIC_CHAIN_ID?: string
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string
  }
}

// Privy window object
declare global {
  interface Window {
    privy?: {
      funding: {
        showFundingModal: () => void;
      };
    };
  }
}

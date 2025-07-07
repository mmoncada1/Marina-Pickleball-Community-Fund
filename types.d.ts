declare module 'next/head' {
  import { ComponentType } from 'react'
  const Head: ComponentType<any>
  export default Head
}

declare module 'lucide-react' {
  import { ComponentType } from 'react'
  export const Target: ComponentType<any>
  export const Users: ComponentType<any>
  export const Clock: ComponentType<any>
  export const Trophy: ComponentType<any>
  export const Zap: ComponentType<any>
  export const ChevronRight: ComponentType<any>
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_CONTRACT_ADDRESS?: string
    NEXT_PUBLIC_CHAIN_ID?: string
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string
  }
}

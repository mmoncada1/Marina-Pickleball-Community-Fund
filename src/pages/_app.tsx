import type { AppProps } from 'next/app'
import '../styles/globals.css'
import PrivyProvider from '../providers/PrivyProvider'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PrivyProvider>
      <Component {...pageProps} />
    </PrivyProvider>
  )
}

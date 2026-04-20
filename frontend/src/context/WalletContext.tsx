import { createContext, useContext, ReactNode } from 'react'
import { useWalletConnection } from '../hooks/useWalletConnection'
import type { Role as RoleType } from '../types'

type WalletContextValue = {
  account: string
  role: RoleType
  isConnected: boolean
  isLoading: boolean
  errorMessage: string
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const value = useWalletConnection()
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

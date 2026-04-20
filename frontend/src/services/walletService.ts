// Wallet-related utilities and role definitions

import { connectWallet, getChainId } from '../lib/ethers'
import { getNetworkDisplayName } from '../config/networks'
import { Role as RoleConst, type Role as RoleType } from '../types'

export const Role = RoleConst
export type { RoleType }

// Minimal MetaMask/ethers-compatible provider shape
export type EthereumProvider = {
  request: (args: { method: string; params?: any[] }) => Promise<unknown>
}

const getEthereumProvider = (): EthereumProvider | undefined => {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum
}

export const ensureEthereum = (): EthereumProvider => {
  const provider = getEthereumProvider()
  if (!provider) {
    throw new Error('Please install MetaMask')
  }
  return provider
}

export const getExistingAccounts = async (): Promise<string[]> => {
  const ethereum = ensureEthereum()
  const accounts = await ethereum.request({ method: 'eth_accounts' })
  return (accounts as string[]) || []
}

export const requestAccounts = async (): Promise<string[]> => {
  const ethereum = ensureEthereum()
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
  return (accounts as string[]) || []
}

/**
 * Connect wallet and return address (delegates to ethers wrapper)
 */
export const connectWalletAddress = async (): Promise<string> => {
  return connectWallet()
}

/**
 * Simple local role detection: first wallet becomes Admin, others default to Student.
 * This remains as a fallback; on-chain role lookup is handled in graduateIdService.
 */
export const detectRoleForAddress = async (walletAddress: string): Promise<RoleType> => {
  const adminKey = 'grid_admin_wallet'
  const storedAdmin = localStorage.getItem(adminKey)

  if (!storedAdmin) {
    localStorage.setItem(adminKey, walletAddress)
    return Role.Admin
  }

  if (storedAdmin.toLowerCase() === walletAddress.toLowerCase()) {
    return Role.Admin
  }

  return Role.Student
}

/**
 * Describe current connected network in a friendly way
 */
export const getCurrentNetworkName = async (): Promise<string> => {
  const chainId = await getChainId()
  return getNetworkDisplayName(chainId)
}

/**
 * Blockchain network configuration
 * Defines all supported networks and their connection details
 * Used to connect to different blockchain networks (localhost, Sepolia, Mainnet, etc.)
 */

import type { NetworkConfig } from '../types'

/**
 * Network configurations for all supported networks
 * Each network includes: chainId, name, RPC URL, and block explorer
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  /**
   * Localhost (Hardhat local development network)
   * Used for testing during development
   * Run with: npx hardhat node
   */
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: '' // No explorer for local network
  },

  /**
   * Ethereum Sepolia Testnet
   * Public test network, faucet for free test ETH available
   * Used for testing before mainnet deployment
   */
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY',
    explorer: 'https://sepolia.etherscan.io'
  },

  /**
   * Ethereum Mainnet
   * Production network, real ETH used
   * Only deploy to mainnet after thorough testing
   */
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: import.meta.env.VITE_MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY',
    explorer: 'https://etherscan.io'
  }
}

/**
 * Default network for the application
 * Used when user hasn't selected a network yet
 * Can be overridden by environment variable VITE_NETWORK
 */
export const DEFAULT_NETWORK: string = 
  typeof import.meta !== 'undefined' && import.meta.env.VITE_NETWORK
    ? import.meta.env.VITE_NETWORK
    : 'localhost'

/**
 * Get network configuration by chain ID
 * Useful for identifying which network the user is connected to
 * 
 * @param chainId - Ethereum chain ID to look up
 * @returns NetworkConfig if found, undefined otherwise
 * 
 * @example
 * const network = getNetworkById(31337)
 * console.log(network?.name) // 'Localhost'
 * 
 * @example
 * const network = getNetworkById(999) // Unknown network
 * // Returns: undefined
 */
export function getNetworkById(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find(network => network.chainId === chainId)
}

/**
 * Get network configuration by name
 * 
 * @param name - Network name (key in NETWORKS object)
 * @returns NetworkConfig if found, undefined otherwise
 * 
 * @example
 * const network = getNetworkByName('sepolia')
 * console.log(network?.chainId) // 11155111
 */
export function getNetworkByName(name: string): NetworkConfig | undefined {
  return NETWORKS[name.toLowerCase()]
}

/**
 * Check if a chain ID is supported by the application
 * 
 * @param chainId - Chain ID to check
 * @returns true if chainId is in supported networks, false otherwise
 * 
 * @example
 * isNetworkSupported(31337)
 * // Returns: true
 * 
 * @example
 * isNetworkSupported(999)
 * // Returns: false
 */
export function isNetworkSupported(chainId: number): boolean {
  return Object.values(NETWORKS).some(network => network.chainId === chainId)
}

/**
 * Get all supported network names
 * 
 * @returns Array of network names (lowercase keys)
 * 
 * @example
 * getSupportedNetworks()
 * // Returns: ['localhost', 'sepolia', 'mainnet']
 */
export function getSupportedNetworks(): string[] {
  return Object.keys(NETWORKS)
}

/**
 * Get all supported chain IDs
 * 
 * @returns Array of supported chain IDs
 * 
 * @example
 * getSupportedChainIds()
 * // Returns: [31337, 11155111, 1]
 */
export function getSupportedChainIds(): number[] {
  return Object.values(NETWORKS).map(network => network.chainId)
}

/**
 * Get the block explorer URL for a transaction hash
 * Useful for creating links to view transactions
 * 
 * @param chainId - Chain ID to get explorer for
 * @param txHash - Transaction hash to create link for
 * @returns Full explorer URL or empty string if no explorer available
 * 
 * @example
 * getExplorerUrl(11155111, '0x123...')
 * // Returns: 'https://sepolia.etherscan.io/tx/0x123...'
 * 
 * @example
 * getExplorerUrl(31337, '0x123...')
 * // Returns: '' (no explorer for localhost)
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const network = getNetworkById(chainId)
  if (!network || !network.explorer) {
    return ''
  }
  return `${network.explorer}/tx/${txHash}`
}

/**
 * Get the block explorer URL for an address
 * 
 * @param chainId - Chain ID to get explorer for
 * @param address - Ethereum address
 * @returns Full explorer URL or empty string if no explorer available
 * 
 * @example
 * getExplorerAddressUrl(11155111, '0x...')
 * // Returns: 'https://sepolia.etherscan.io/address/0x...'
 */
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const network = getNetworkById(chainId)
  if (!network || !network.explorer) {
    return ''
  }
  return `${network.explorer}/address/${address}`
}

/**
 * Get the block explorer URL for a contract
 * Same as address URL but semantically for contracts
 * 
 * @param chainId - Chain ID to get explorer for
 * @param contractAddress - Contract address
 * @returns Full explorer URL or empty string if no explorer available
 */
export function getExplorerContractUrl(chainId: number, contractAddress: string): string {
  return getExplorerAddressUrl(chainId, contractAddress)
}

/**
 * Format network name for display
 * 
 * @param chainId - Chain ID
 * @returns Human-readable network name
 * 
 * @example
 * getNetworkDisplayName(11155111)
 * // Returns: 'Sepolia Testnet'
 */
export function getNetworkDisplayName(chainId: number): string {
  const network = getNetworkById(chainId)
  return network?.name || 'Unknown Network'
}

/**
 * Check if a network is a testnet
 * 
 * @param chainId - Chain ID to check
 * @returns true if network is a testnet, false if mainnet
 * 
 * @example
 * isTestnet(11155111)
 * // Returns: true (Sepolia is testnet)
 * 
 * @example
 * isTestnet(1)
 * // Returns: false (Mainnet is production)
 */
export function isTestnet(chainId: number): boolean {
  // Mainnet chain ID is 1, everything else is testnet
  return chainId !== 1
}

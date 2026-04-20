/**
 * Ethers.js wrapper utilities for blockchain interactions
 * Provides simplified functions for connecting to Ethereum networks,
 * creating contract instances, and handling transactions
 */

import { ethers, BrowserProvider, Contract, type Signer, type Provider, type TransactionReceipt } from 'ethers'
import { getNetworkById } from '../config/networks'

/**
 * Get the browser provider from MetaMask
 * Requires MetaMask or compatible wallet extension to be installed
 * 
 * @returns BrowserProvider instance connected to user's wallet
 * @throws Error if window.ethereum is not available
 * 
 * @example
 * const provider = getProvider()
 * const network = await provider.getNetwork()
 */
export function getProvider(): BrowserProvider {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed. Please install MetaMask to use this application.')
  }
  
  return new ethers.BrowserProvider(window.ethereum)
}

/**
 * Get the signer from the current provider
 * Signer is needed to send transactions that modify blockchain state
 * 
 * @returns Promise resolving to Signer instance
 * @throws Error if MetaMask not installed or user not connected
 * 
 * @example
 * const signer = await getSigner()
 * const address = await signer.getAddress()
 */
export async function getSigner(): Promise<Signer> {
  const provider = getProvider()
  const signer = await provider.getSigner()
  return signer
}

/**
 * Create a contract instance
 * Used to call functions on deployed smart contracts
 * 
 * @param address - Contract address on blockchain
 * @param abi - Contract ABI (Application Binary Interface)
 * @param signerOrProvider - Optional signer or provider. If not provided, uses getSigner()
 * @returns Contract instance ready to call functions
 * 
 * @example
 * import GraduateIDABI from '../abi/GraduateID.json'
 * const contract = await getContract('0x...', GraduateIDABI)
 * const graduate = await contract.getGraduate(address)
 */
export async function getContract(
  address: string,
  abi: any,
  signerOrProvider?: Signer | Provider
): Promise<Contract> {
  const signerOrProviderToUse = signerOrProvider || await getSigner()
  return new ethers.Contract(address, abi, signerOrProviderToUse)
}

/**
 * Get the current connected network's chain ID
 * 
 * @returns Promise resolving to chain ID (31337 for localhost, 11155111 for Sepolia, etc.)
 * 
 * @example
 * const chainId = await getChainId()
 * console.log(`Connected to chain: ${chainId}`)
 */
export async function getChainId(): Promise<number> {
  const provider = getProvider()
  const network = await provider.getNetwork()
  return Number(network.chainId)
}

/**
 * Request MetaMask to switch to a different network
 * If network doesn't exist in MetaMask, attempts to add it
 * 
 * @param chainId - Target chain ID to switch to
 * @throws Error if user rejects the switch or network can't be added
 * 
 * @example
 * await switchNetwork(31337) // Switch to localhost
 * await switchNetwork(11155111) // Switch to Sepolia
 */
export async function switchNetwork(chainId: number): Promise<void> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const chainIdHex = `0x${chainId.toString(16)}`

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    })
  } catch (error: any) {
    // Error code 4902 means the network hasn't been added to MetaMask
    if (error.code === 4902) {
      const network = getNetworkById(chainId)
      
      if (!network) {
        throw new Error(`Network with chain ID ${chainId} not configured`)
      }

      // Add the network to MetaMask
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.explorer ? [network.explorer] : []
            }
          ]
        })
      } catch (addError) {
        throw new Error('Failed to add network to MetaMask')
      }
    } else {
      throw error
    }
  }
}

/**
 * Wait for a transaction to be mined and get the receipt
 * Polls the network until transaction is confirmed
 * 
 * @param txHash - Transaction hash to wait for
 * @returns Promise resolving to transaction receipt with block number, gas used, etc.
 * 
 * @example
 * const tx = await contract.registerID(...)
 * const receipt = await waitForTransaction(tx.hash)
 * console.log(`Confirmed in block ${receipt.blockNumber}`)
 */
export async function waitForTransaction(txHash: string): Promise<TransactionReceipt> {
  const provider = getProvider()
  const receipt = await provider.waitForTransaction(txHash)
  
  if (!receipt) {
    throw new Error('Transaction receipt not found')
  }
  
  return receipt
}

/**
 * Parse contract errors and return user-friendly error messages
 * Extracts revert reasons from failed transactions
 * 
 * @param error - Error object from contract call
 * @returns User-friendly error message
 * 
 * @example
 * try {
 *   await contract.registerID(...)
 * } catch (error) {
 *   const message = handleContractError(error)
 *   alert(message) // Shows: "Only admin can register users"
 * }
 */
export function handleContractError(error: any): string {
  // User rejected transaction
  if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
    return 'Transaction rejected by user'
  }

  // Insufficient funds
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds to complete transaction'
  }

  // Contract revert with reason
  if (error.reason) {
    return error.reason
  }

  // Try to extract revert reason from error message
  if (error.message) {
    // Look for "execution reverted: " pattern
    const revertMatch = error.message.match(/execution reverted: (.+)/)
    if (revertMatch) {
      return revertMatch[1]
    }

    // Look for custom error messages
    const errorMatch = error.message.match(/Error: (.+)/)
    if (errorMatch) {
      return errorMatch[1]
    }

    return error.message
  }

  return 'Transaction failed. Please try again.'
}

/**
 * Check if user is connected to the correct network
 * 
 * @param expectedChainId - Chain ID that the app expects
 * @returns Promise resolving to true if on correct network, false otherwise
 * 
 * @example
 * const isCorrect = await isCorrectNetwork(31337)
 * if (!isCorrect) {
 *   await switchNetwork(31337)
 * }
 */
export async function isCorrectNetwork(expectedChainId: number): Promise<boolean> {
  const currentChainId = await getChainId()
  return currentChainId === expectedChainId
}

/**
 * Get the current connected wallet address
 * 
 * @returns Promise resolving to wallet address string
 * 
 * @example
 * const address = await getWalletAddress()
 * console.log(`Connected: ${address}`)
 */
export async function getWalletAddress(): Promise<string> {
  const signer = await getSigner()
  return await signer.getAddress()
}

/**
 * Request user to connect their wallet
 * Triggers MetaMask connection popup
 * 
 * @returns Promise resolving to connected wallet address
 * 
 * @example
 * const address = await connectWallet()
 * console.log(`Connected to: ${address}`)
 */
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  }) as string[]

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found')
  }

  return accounts[0]
}

/**
 * Get account balance in ETH
 * 
 * @param address - Wallet address to check balance for
 * @returns Promise resolving to balance as string in ETH
 * 
 * @example
 * const balance = await getBalance('0x...')
 * console.log(`Balance: ${balance} ETH`)
 */
export async function getBalance(address: string): Promise<string> {
  const provider = getProvider()
  const balanceWei = await provider.getBalance(address)
  return ethers.formatEther(balanceWei)
}

/**
 * Format Wei to Ether for display
 * 
 * @param wei - Amount in Wei (smallest unit)
 * @returns Amount in Ether as string
 * 
 * @example
 * const eth = formatEther(1000000000000000000n) // "1.0"
 */
export function formatEther(wei: bigint | string): string {
  return ethers.formatEther(wei)
}

/**
 * Parse Ether to Wei for contract calls
 * 
 * @param ether - Amount in Ether as string
 * @returns Amount in Wei as bigint
 * 
 * @example
 * const wei = parseEther("1.5") // 1500000000000000000n
 */
export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether)
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

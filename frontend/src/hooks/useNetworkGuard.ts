/**
 * useNetworkGuard Hook
 * React hook for monitoring and enforcing correct blockchain network
 * Provides automatic network switching via MetaMask
 */

import { useEffect, useState } from 'react'
import { getChainId, switchNetwork } from '../lib/ethers'
import { getNetworkById } from '../config/networks'

/**
 * useNetworkGuard Hook
 * 
 * Monitors the current blockchain network and can enforce a target network.
 * Automatically listens for network changes and updates state.
 * 
 * @param targetChainId - Target chain ID (default: 31337 for localhost development)
 * @returns Object containing current network info, check/switch capabilities
 * 
 * @example
 * const { currentChainId, isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)
 * 
 * if (!isCorrectNetwork) {
 *   return <button onClick={switchToCorrectNetwork}>Switch Network</button>
 * }
 */
export function useNetworkGuard(targetChainId: number = 31337) {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check initial network on mount
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const chainId = await getChainId()
        setCurrentChainId(chainId)
      } catch (err: any) {
        setError(err?.message || 'Failed to get network')
        setCurrentChainId(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeNetwork()
  }, [])

  // Listen for network changes
  useEffect(() => {
    if (!window.ethereum) {
      return
    }

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16)
      setCurrentChainId(newChainId)
      setError(null)
    }

    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const isCorrectNetwork = currentChainId === targetChainId

  const switchToCorrectNetwork = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await switchNetwork(targetChainId)
      const chainId = await getChainId()
      setCurrentChainId(chainId)
    } catch (err: any) {
      setError(err?.message || 'Failed to switch network')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const targetNetworkConfig = getNetworkById(targetChainId)
  const currentNetworkConfig = currentChainId ? getNetworkById(currentChainId) : null

  return {
    currentChainId,
    isCorrectNetwork,
    targetChainId,
    targetNetworkName: targetNetworkConfig?.name || 'Unknown',
    currentNetworkName: currentNetworkConfig?.name || 'Unknown',
    switchToCorrectNetwork,
    isLoading,
    error
  }
}

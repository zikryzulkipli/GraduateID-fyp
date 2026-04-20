import { useEffect, useState } from 'react'
import { getExistingAccounts, requestAccounts } from '../services/walletService'
import { useGraduateRole } from './useGraduateRole'

export const useWalletConnection = () => {
  const [account, setAccount] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Fetch role from blockchain for current account
  const { role, isLoading: isRoleLoading, error: roleError } = useGraduateRole(account || null)

  useEffect(() => {
    checkIfWalletIsConnected()
  }, [])

  const checkIfWalletIsConnected = async () => {
    try {
      const accounts = await getExistingAccounts()
      if (accounts.length > 0) {
        const selected = accounts[0]
        setAccount(selected)
        setIsConnected(true)
        // Role will be fetched by useGraduateRole hook automatically
      }
    } catch (error) {
      console.error(error)
    }
  }

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const accounts = await requestAccounts()
      if (!accounts.length) {
        throw new Error('No accounts returned from wallet')
      }

      const selected = accounts[0]
      setAccount(selected)
      setIsConnected(true)
      // Role will be fetched by useGraduateRole hook automatically
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || 'Failed to connect wallet')
      setIsConnected(false)
      setAccount('')
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setAccount('')
    setIsConnected(false)
    setErrorMessage('')
  }

  // Combine loading states
  const combinedIsLoading = isLoading || isRoleLoading

  return {
    account,
    role,
    isConnected,
    isLoading: combinedIsLoading,
    errorMessage: errorMessage || roleError || '',
    connectWallet,
    disconnectWallet,
  }
}

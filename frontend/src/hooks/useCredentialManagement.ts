import { useState, useEffect } from 'react'
import { useContract } from './useContract'

interface CredentialMetadata {
  credentialName: string
  ipfsHash: string
  dateIssued: number
  expiryDate: number
  issuer: string
  isValid: boolean
  studentWallet: string
}

/**
 * Hook to verify credentials with rich metadata
 */
export const useCredentialVerification = (ipfsHash: string) => {
  const [metadata, setMetadata] = useState<CredentialMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { contract: hashChecker } = useContract('HashChecker', 'read')

  useEffect(() => {
    if (!ipfsHash || !hashChecker) return

    const fetchMetadata = async () => {
      try {
        setIsLoading(true)
        setError('')

        // Call: verifyHashWithMetadata(hash)
        const [exists, name, dateIssued, issuer, isValid, student] = 
          await hashChecker.verifyHashWithMetadata(ipfsHash)

        if (exists) {
          setMetadata({
            credentialName: name,
            ipfsHash,
            dateIssued: Number(dateIssued),
            expiryDate: 0, // Not directly returned; would need frontend logic
            issuer,
            isValid,
            studentWallet: student,
          })
        } else {
          setMetadata(null)
        }
      } catch (err: any) {
        console.error('Failed to fetch credential metadata:', err)
        setError(err?.message || 'Verification failed')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetadata()
  }, [ipfsHash, hashChecker])

  return { metadata, isLoading, error }
}

/**
 * Hook to list valid and non-expired credentials for a student
 */
export const useValidCredentials = (studentWallet: string | null) => {
  const [credentials, setCredentials] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { contract: issueCredential } = useContract('IssueCredential', 'read')

  useEffect(() => {
    if (!studentWallet || !issueCredential) {
      setCredentials([])
      return
    }

    const fetchCredentials = async () => {
      try {
        setIsLoading(true)
        setError('')

        // Call: getValidCredentials(wallet) - filters expired automatically
        const creds = await issueCredential.getValidCredentials(studentWallet)
        setCredentials(creds || [])
      } catch (err: any) {
        console.error('Failed to fetch valid credentials:', err)
        setError(err?.message || 'Failed to load credentials')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCredentials()
  }, [studentWallet, issueCredential])

  return { credentials, isLoading, error }
}

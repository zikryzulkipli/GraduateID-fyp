import { useEffect, useState } from 'react'
import { useContract } from './useContract'

interface IDAssignment {
  uniqueID: string
  idType: number // 0: Student, 1: Staff, 2: Examiner
  issuedAt: number
  isActive: boolean
  metadata: string // Name or other info
}

/**
 * Hook to fetch server-assigned unique ID from IDRegistry contract
 * Replaces client-side localStorage ID generation
 */
export const useIDRegistry = (account: string | null) => {
  const [uniqueID, setUniqueID] = useState<string>('')
  const [idData, setIdData] = useState<IDAssignment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { contract: idRegistry, isLoading: contractLoading } = useContract('IDRegistry', 'read')

  useEffect(() => {
    if (!account || !idRegistry) {
      setUniqueID('')
      setIdData(null)
      return
    }

    const fetchID = async () => {
      try {
        setIsLoading(true)
        setError('')

        // Call: getID(wallet) returns [uniqueID, idType, issuedAt, isActive, metadata]
        const [id, type, issuedAt, isActive, metadata] = await idRegistry.getID(account)

        if (isActive && id) {
          setUniqueID(id)
          setIdData({
            uniqueID: id,
            idType: type,
            issuedAt: Number(issuedAt),
            isActive,
            metadata,
          })
        } else {
          setUniqueID('')
          setIdData(null)
        }
      } catch (err: any) {
        console.warn('ID not found or error fetching from IDRegistry:', err.message)
        setUniqueID('')
        setIdData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchID()
  }, [account, idRegistry])

  return {
    uniqueID,
    idData,
    isLoading: isLoading || contractLoading,
    error,
  }
}

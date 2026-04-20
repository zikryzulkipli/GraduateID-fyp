/**
 * useGraduateRole Hook
 * React hook for fetching and tracking a user's on-chain role
 * Automatically refetches when wallet account changes
 */

import { useEffect, useState } from 'react'
import type { Role as RoleType } from '../types'
import { Role } from '../types'
import { getRoleForAddress, registerStudent } from '../services/graduateIdService'
import { detectRoleForAddress } from '../services/walletService'

/**
 * useGraduateRole Hook
 * 
 * Fetches the on-chain role for a given wallet address.
 * Automatically refetches when the account parameter changes.
 * 
 * @param walletAddress - Ethereum wallet address to fetch role for
 * @returns Object containing the user's role, loading state, and error info
 * 
 * @example
 * const { role, isLoading, error } = useGraduateRole(account)
 * 
 * if (isLoading) return <p>Loading role...</p>
 * if (error) return <p>Error: {error}</p>
 * return <p>Your role: {role}</p>
 */
export function useGraduateRole(walletAddress: string | null) {
  const [role, setRole] = useState<RoleType>(Role.None)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    if (!walletAddress) {
      setRole(Role.None)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Try to get role from blockchain first
      const blockchainRole = await getRoleForAddress(walletAddress)
      console.log(`🔍 Blockchain role for ${walletAddress}:`, blockchainRole)
      
      // If not registered on blockchain (Role.None), use local storage fallback
      if (blockchainRole === Role.None) {
        console.log('⚠️ Role is None, checking localStorage fallback')
        const localRole = await detectRoleForAddress(walletAddress)
        
        // Auto-register students on blockchain
        if (localRole === Role.Student) {
          try {
            console.log(`📝 Auto-registering student ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`)
            
            // Generate student ID from wallet address
            const uniqueID = generateStudentID(walletAddress)
            const studentName = `Student ${walletAddress.slice(0, 6)}`
            
            await registerStudent({
              walletAddress,
              studentId: uniqueID,
              studentName
            })
            
            console.log(`✅ Student registered successfully with ID: ${uniqueID}`)
            setRole(Role.Student)
          } catch (regError: any) {
            console.error('Auto-registration failed:', regError)
            // Still set as student even if registration fails
            setRole(Role.Student)
          }
        } else {
          setRole(localRole)
          console.log(`📝 Using local role for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}: Admin`)
        }
      } else {
        setRole(blockchainRole)
        console.log(`⛓️  Using blockchain role for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}:`, blockchainRole, getRoleName(blockchainRole))
      }
    } catch (err: any) {
      console.error('useGraduateRole error:', err)
      // On error, fall back to local storage detection
      const localRole = await detectRoleForAddress(walletAddress)
      setRole(localRole)
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch role when account changes
  useEffect(() => {
    refetch()
  }, [walletAddress])

  return { role, isLoading, error, refetch }
}

function getRoleName(role: RoleType): string {
  const names = ['None', 'Student', 'Examiner', 'Admin', 'Staff']
  return names[role] || 'Unknown'
}

// Helper function to generate student ID from wallet address
function generateStudentID(walletAddress: string): string {
  const hash = walletAddress.toLowerCase()
  const prefix = hash.slice(2, 5).toUpperCase()
  const middle = parseInt(hash.slice(5, 11), 16) % 1000000
  return `AD${prefix}${middle.toString().padStart(6, '0')}`
}

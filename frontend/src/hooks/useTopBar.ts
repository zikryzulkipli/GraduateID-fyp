import { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { getGraduateByAddress } from '../services/graduateIdService'
import { useIDRegistry } from './useIDRegistry'

export interface TopBarData {
  address: string
  staffID: string
  profileImage: string
}

export const useTopBar = (): TopBarData => {
  const { account } = useWallet()
  const { uniqueID: registryID, isLoading: registryLoading } = useIDRegistry(account)
  const [staffID, setStaffID] = useState<string>('')
  const [profileImage, setProfileImage] = useState<string>('')

  const generateStudentID = (walletAddress: string): string => {
    const hash = walletAddress.toLowerCase()
    const prefix = hash.slice(2, 5).toUpperCase()
    const middle = parseInt(hash.slice(5, 11), 16) % 1000000
    return `AD${prefix}${middle.toString().padStart(6, '0')}`
  }

  const generateAvatar = (walletAddress: string): string => {
    const seed = walletAddress.toLowerCase()
    const primary = `#${seed.slice(2, 8)}`
    const secondary = `#${seed.slice(8, 14)}`
    const initials = seed.slice(2, 4).toUpperCase()
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${primary}" />
            <stop offset="100%" stop-color="${secondary}" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="60" fill="url(#grad)" />
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="40" fill="#ffffff" font-weight="700">${initials}</text>
      </svg>
    `
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }

  useEffect(() => {
    const fetchGraduateData = async () => {
      if (account) {
        try {
          // Prefer on-chain GraduateID
          const graduate = await getGraduateByAddress(account)
          if (graduate && graduate.ID) {
            setStaffID(graduate.ID)
            return
          }

          // Next, try IDRegistry assignment
          if (registryID) {
            setStaffID(registryID)
            return
          }

          // Deterministic fallback so the UI never shows "Pending"
          setStaffID(generateStudentID(account))
        } catch (error) {
          console.error('Error fetching graduate data:', error)
          if (registryID) {
            setStaffID(registryID)
          } else if (account) {
            setStaffID(generateStudentID(account))
          } else {
            setStaffID('')
          }
        }

        // Deterministic local avatar (no external fetch)
        setProfileImage(generateAvatar(account))
      } else {
        setStaffID('')
        setProfileImage('')
      }
    }

    fetchGraduateData()
  }, [account, registryID, registryLoading])

  return {
    address: account || '',
    staffID,
    profileImage,
  }
}

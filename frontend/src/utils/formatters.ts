/**
 * Utility functions for formatting data for display
 * These functions convert raw blockchain/contract data into human-readable format
 */

import { Role } from '../types'
import { ADDRESS_DISPLAY_PREFIX, ADDRESS_DISPLAY_SUFFIX, HASH_DISPLAY_PREFIX, HASH_DISPLAY_SUFFIX } from './constants'

/**
 * Truncate Ethereum address for display
 * Converts "0x1234567890abcdef1234567890abcdef12345678" to "0x1234...5678"
 * 
 * @param address - Full Ethereum address (42 characters)
 * @param prefixLen - Number of characters to show from start (default: 6)
 * @param suffixLen - Number of characters to show from end (default: 4)
 * @returns Truncated address string
 * 
 * @example
 * formatAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // Returns: '0x1234...5678'
 */
export function formatAddress(
  address: string,
  prefixLen: number = ADDRESS_DISPLAY_PREFIX,
  suffixLen: number = ADDRESS_DISPLAY_SUFFIX
): string {
  if (!address || address.length < prefixLen + suffixLen) {
    return address
  }
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
}

/**
 * Truncate IPFS hash for display
 * Converts "QmXyZ123456789abcdefghijklmnopqrstuvwxyz" to "QmXyZ12345...xyz"
 * 
 * @param hash - IPFS hash (CID)
 * @param prefixLen - Number of characters to show from start (default: 10)
 * @param suffixLen - Number of characters to show from end (default: 8)
 * @returns Truncated hash string
 * 
 * @example
 * formatHash('QmXyZ123456789abcdefghijklmnopqrstuvwxyz')
 * // Returns: 'QmXyZ12345...qrstuvwxyz'
 */
export function formatHash(
  hash: string,
  prefixLen: number = HASH_DISPLAY_PREFIX,
  suffixLen: number = HASH_DISPLAY_SUFFIX
): string {
  if (!hash || hash.length < prefixLen + suffixLen) {
    return hash
  }
  return `${hash.slice(0, prefixLen)}...${hash.slice(-suffixLen)}`
}

/**
 * Format Unix timestamp as human-readable date
 * Converts Unix timestamp (seconds since 1970-01-01) to readable date string
 * 
 * @param timestamp - Unix timestamp in seconds or Date object
 * @returns Formatted date string (e.g., "Jan 15, 2025, 3:30 PM")
 * 
 * @example
 * formatDate(1705340400)
 * // Returns: 'Jan 15, 2025, 3:30 PM'
 * 
 * @example
 * formatDate(new Date())
 * // Returns: 'Dec 21, 2025, 10:45 AM'
 */
export function formatDate(timestamp: number | Date): string {
  try {
    // Handle both Unix timestamps (seconds) and Date objects
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000)  // Convert seconds to milliseconds
      : timestamp

    // Format using Intl.DateTimeFormat for locale-aware formatting
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  } catch (error) {
    return 'Invalid Date'
  }
}

/**
 * Format file size in bytes to human-readable format
 * Converts bytes to KB, MB, GB, etc.
 * 
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 KB", "2.3 MB")
 * 
 * @example
 * formatFileSize(1536)
 * // Returns: '1.5 KB'
 * 
 * @example
 * formatFileSize(2621440)
 * // Returns: '2.5 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Convert Role enum number to human-readable string
 * Maps numeric role values to display names
 * 
 * @param role - Role enum value (0-4)
 * @returns Display name (e.g., "Student", "Admin")
 * 
 * @example
 * formatRole(Role.Student)
 * // Returns: 'Student'
 * 
 * @example
 * formatRole(1)
 * // Returns: 'Student'
 */
export function formatRole(role: Role | number): string {
  switch (role) {
    case Role.None:
      return 'None'
    case Role.Student:
      return 'Student'
    case Role.Examiner:
      return 'Examiner'
    case Role.Admin:
      return 'Admin'
    case Role.Staff:
      return 'Staff'
    default:
      return 'Unknown'
  }
}

/**
 * Format Unix timestamp as relative time or absolute date
 * Shows "2 hours ago" for recent times, or absolute date for older times
 * 
 * @param timestamp - Unix timestamp in seconds
 * @returns Relative time string (e.g., "2 hours ago", "Jan 15, 2025")
 * 
 * @example
 * formatTimestamp(Date.now() / 1000 - 7200)
 * // Returns: '2 hours ago'
 * 
 * @example
 * formatTimestamp(1704067200) // Date in past month
 * // Returns: 'Dec 31, 2024'
 */
export function formatTimestamp(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000) // Current Unix timestamp in seconds
  const diff = now - timestamp

  // If within last hour, show minutes
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60)
    return minutes === 0 ? 'just now' : `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  // If within last 24 hours, show hours
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  // If within last 7 days, show days
  if (diff < 604800) {
    const days = Math.floor(diff / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // Otherwise show absolute date
  return formatDate(timestamp)
}

/**
 * Format transaction hash for display
 * Converts long hash to shortened version
 * 
 * @param hash - Transaction hash (66 characters: 0x + 64 hex)
 * @returns Truncated hash (e.g., "0x1234...5678")
 * 
 * @example
 * formatTxHash('0x1234567890abcdef...5678')
 * // Returns: '0x1234...5678'
 */
export function formatTxHash(hash: string): string {
  return formatAddress(hash, 6, 4)
}

/**
 * Format percentage value
 * Rounds to specified decimal places
 * 
 * @param value - Number between 0 and 1 (or 0-100 if isHundred is true)
 * @param decimals - Number of decimal places to show (default: 2)
 * @param isHundred - If true, treats value as 0-100 instead of 0-1
 * @returns Formatted percentage string (e.g., "95.50%")
 * 
 * @example
 * formatPercentage(0.955)
 * // Returns: '95.50%'
 * 
 * @example
 * formatPercentage(95.5, 1, true)
 * // Returns: '95.5%'
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  isHundred: boolean = false
): string {
  const percentage = isHundred ? value : value * 100
  return percentage.toFixed(decimals) + '%'
}

/**
 * Capitalize first letter of a string
 * 
 * @param str - Input string
 * @returns String with first letter capitalized
 * 
 * @example
 * capitalize('hello world')
 * // Returns: 'Hello world'
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

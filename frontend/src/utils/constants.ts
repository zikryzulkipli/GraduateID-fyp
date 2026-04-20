/**
 * Application-wide constants
 * These values are used consistently across the app and can be configured here
 * Environment variables can override these values
 */

/**
 * OTP validity duration in seconds
 * After this time, the OTP expires and student cannot use it
 * Default: 5 minutes (300 seconds)
 */
export const OTP_VALID_DURATION: number = 300

/**
 * Maximum number of failed OTP verification attempts
 * After this many failed attempts, the user is locked out temporarily
 */
export const MAX_FAILED_ATTEMPTS: number = 3

/**
 * Cooldown duration after max failed attempts in seconds
 * User must wait this long before attempting OTP verification again
 * Default: 5 minutes (300 seconds)
 */
export const OTP_FAIL_COOLDOWN: number = 300

/**
 * Supported MIME types for credential document uploads
 * Used to validate files before uploading to IPFS
 */
export const SUPPORTED_FILE_TYPES: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
]

/**
 * Maximum file size in bytes for credential uploads
 * Default: 10 MB
 * Prevents uploading extremely large files to IPFS
 */
export const MAX_FILE_SIZE: number = 10 * 1024 * 1024 // 10MB

/**
 * IPFS gateway URL used to access files
 * This can be changed to different gateways (e.g., dweb.link, cloudflare)
 * Can be overridden by environment variable VITE_IPFS_GATEWAY
 */
export const IPFS_GATEWAY_URL: string = 
  typeof import.meta !== 'undefined' && import.meta.env.VITE_IPFS_GATEWAY
    ? import.meta.env.VITE_IPFS_GATEWAY
    : 'https://ipfs.io/ipfs/'

/**
 * Default blockchain network for development
 * Can be overridden by environment variable VITE_NETWORK
 */
export const DEFAULT_NETWORK: string = 
  typeof import.meta !== 'undefined' && import.meta.env.VITE_NETWORK
    ? import.meta.env.VITE_NETWORK
    : 'localhost'

/**
 * Polling interval for checking transaction status in milliseconds
 * How often the app checks if a pending transaction has been mined
 */
export const TRANSACTION_POLL_INTERVAL: number = 1000 // 1 second

/**
 * Maximum number of times to poll for transaction confirmation
 * After this many attempts, give up checking
 * With 1s interval: 120 attempts = 2 minutes max wait
 */
export const TRANSACTION_POLL_MAX_ATTEMPTS: number = 120

/**
 * Polling interval for checking OTP status in milliseconds
 * How often to poll if examiner has approved the OTP request
 */
export const OTP_STATUS_POLL_INTERVAL: number = 2000 // 2 seconds

/**
 * Number of characters to display when showing truncated addresses/hashes
 * Used by formatAddress() and formatHash() functions
 */
export const ADDRESS_DISPLAY_PREFIX: number = 6
export const ADDRESS_DISPLAY_SUFFIX: number = 4
export const HASH_DISPLAY_PREFIX: number = 10
export const HASH_DISPLAY_SUFFIX: number = 8

/**
 * Regular expressions for input validation
 */
export const REGEX_PATTERNS = {
  // Standard Ethereum address: 0x followed by 40 hex characters
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  
  // 6-digit OTP
  OTP: /^\d{6}$/,
  
  // IPFS CIDv0: Qm followed by 44 base58 characters
  IPFS_HASH_V0: /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
  
  // IPFS CIDv1: bafy or bafz prefix
  IPFS_HASH_V1: /^baf[yz][1-9A-HJ-NP-Za-km-z]+$/
}

/**
 * Error parsing utilities for blockchain transactions
 * Converts raw contract errors into user-friendly messages
 */

/**
 * Common error messages from smart contracts
 */
const ERROR_MESSAGES: Record<string, string> = {
  // GraduateID contract errors
  'Already registered': 'This wallet address is already registered in the system',
  'Not registered': 'This wallet address is not registered. Please register first',
  'Invalid role': 'Invalid role specified. Must be Admin, Student, or Examiner',
  'Only admin': 'Only administrators can perform this action',
  
  // IssueCredential contract errors
  'Not admin or examiner': 'Only admins or examiners can issue credentials',
  'Student not registered': 'The student wallet address is not registered in the system',
  'Credential already issued': 'A credential has already been issued for this student',
  
  // OnlineExam contract errors
  'Not examiner': 'Only examiners can perform this action',
  'Not student': 'Only students can perform this action',
  'Request not found': 'Exam request not found. Please submit a request first',
  'Already approved': 'This exam request has already been approved',
  'Cooldown active': 'You must wait before making another exam request. Please try again later',
  'Invalid OTP': 'The OTP entered is incorrect. Please check and try again',
  'Request expired': 'This exam request has expired. Please submit a new request',
  
  // HashChecker contract errors
  'Hash already exists': 'This hash is already stored on the blockchain',
  'Hash not found': 'This hash does not exist on the blockchain',
  
  // MetaMask / User errors
  'user rejected transaction': 'You cancelled the transaction in MetaMask',
  'insufficient funds': 'Insufficient funds to complete this transaction. Please add more ETH to your wallet',
  'nonce too low': 'Transaction nonce error. Please reset your MetaMask account or try again',
  'network changed': 'Network was changed during transaction. Please try again',
  'already processing': 'A transaction is already being processed. Please wait for it to complete',
  
  // Network errors
  'network error': 'Network connection error. Please check your internet connection',
  'timeout': 'Transaction timed out. Please try again',
  'could not detect network': 'Could not connect to blockchain network. Please ensure you are connected to the correct network',
}

/**
 * Extract error message from contract error
 * Attempts to parse the revert reason from various error formats
 * 
 * @param error - Error object from ethers.js or catch block
 * @returns User-friendly error message
 * 
 * @example
 * try {
 *   await contract.registerStudent(...)
 * } catch (error) {
 *   const message = parseContractError(error)
 *   // Returns: "This wallet address is already registered in the system"
 * }
 */
export function parseContractError(error: any): string {
  // Handle null/undefined
  if (!error) {
    return 'An unknown error occurred. Please try again'
  }

  // Extract error message from various error object structures
  let errorMessage = ''
  
  // Try to get message from error object
  if (error.message) {
    errorMessage = error.message
  } else if (error.reason) {
    errorMessage = error.reason
  } else if (typeof error === 'string') {
    errorMessage = error
  } else {
    errorMessage = error.toString()
  }

  // Convert to lowercase for case-insensitive matching
  const lowerError = errorMessage.toLowerCase()

  // Check for known error patterns
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (lowerError.includes(key.toLowerCase())) {
      return value
    }
  }

  // Extract revert reason if present
  // Pattern: execution reverted: "reason"
  const revertMatch = errorMessage.match(/execution reverted:?\s*"?([^"]+)"?/i)
  if (revertMatch && revertMatch[1]) {
    const revertReason = revertMatch[1].trim()
    
    // Check if revert reason matches known errors
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (revertReason.toLowerCase().includes(key.toLowerCase())) {
        return value
      }
    }
    
    // Return the revert reason as-is if not in known errors
    return revertReason
  }

  // Check for specific error codes
  if (error.code) {
    switch (error.code) {
      case 4001:
        return ERROR_MESSAGES['user rejected transaction']
      case -32603:
        return 'Internal JSON-RPC error. Please check your network connection'
      case -32002:
        return 'MetaMask is already processing a request. Please check MetaMask'
      default:
        break
    }
  }

  // Fallback: return cleaned error message
  return cleanErrorMessage(errorMessage)
}

/**
 * Clean up error message by removing technical details
 * Removes transaction hashes, addresses, and stack traces
 * 
 * @param message - Raw error message
 * @returns Cleaned error message
 */
function cleanErrorMessage(message: string): string {
  // Remove transaction hashes (0x followed by 64 hex chars)
  let cleaned = message.replace(/0x[a-fA-F0-9]{64}/g, '')
  
  // Remove addresses (0x followed by 40 hex chars)
  cleaned = cleaned.replace(/0x[a-fA-F0-9]{40}/g, 'wallet address')
  
  // Remove "Error: " prefix
  cleaned = cleaned.replace(/^Error:\s*/i, '')
  
  // Remove stack traces (everything after "at " or "Stack:")
  cleaned = cleaned.split(/\s+at\s+/)[0]
  cleaned = cleaned.split(/Stack:/)[0]
  
  // Trim and capitalize first letter
  cleaned = cleaned.trim()
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  
  // If message is too long or still looks technical, use generic message
  if (cleaned.length > 200 || cleaned.includes('Error:') || cleaned.includes('VM Exception')) {
    return 'Transaction failed. Please check your inputs and try again'
  }
  
  return cleaned || 'An error occurred. Please try again'
}

/**
 * Check if error is due to user rejection in MetaMask
 * 
 * @param error - Error object
 * @returns true if user rejected the transaction
 */
export function isUserRejection(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  const reason = error.reason?.toLowerCase() || ''
  const code = error.code
  
  return (
    code === 4001 ||
    message.includes('user rejected') ||
    message.includes('user denied') ||
    reason.includes('user rejected') ||
    reason.includes('user denied')
  )
}

/**
 * Check if error is due to insufficient gas
 * 
 * @param error - Error object
 * @returns true if error is gas-related
 */
export function isInsufficientGas(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  const reason = error.reason?.toLowerCase() || ''
  
  return (
    message.includes('insufficient funds') ||
    message.includes('gas required exceeds') ||
    reason.includes('insufficient funds') ||
    reason.includes('gas required exceeds')
  )
}

/**
 * Check if error is network-related
 * 
 * @param error - Error object
 * @returns true if error is network-related
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  const reason = error.reason?.toLowerCase() || ''
  
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    reason.includes('network') ||
    reason.includes('timeout') ||
    reason.includes('connection')
  )
}

/**
 * Extract cooldown remaining time from error message
 * Looks for patterns like "cooldown: 123 seconds remaining"
 * 
 * @param error - Error object
 * @returns Remaining seconds, or 0 if not found
 */
export function extractCooldownTime(error: any): number {
  if (!error) return 0
  
  const message = error.message || error.reason || ''
  
  // Look for patterns like "300 seconds", "5 minutes", etc.
  const secondsMatch = message.match(/(\d+)\s*seconds?/i)
  if (secondsMatch) {
    return parseInt(secondsMatch[1], 10)
  }
  
  const minutesMatch = message.match(/(\d+)\s*minutes?/i)
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10) * 60
  }
  
  return 0
}

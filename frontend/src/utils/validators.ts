/**
 * Input validation helper functions
 * These functions validate user input and data from external sources
 * Used to prevent invalid data from being sent to contracts
 */

import { ethers } from 'ethers'
import { REGEX_PATTERNS, MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from './constants'

/**
 * Check if a string is a valid Ethereum address
 * Validates the format (0x + 40 hex characters) and checksum
 * 
 * @param address - String to validate
 * @returns true if valid Ethereum address, false otherwise
 * 
 * @example
 * isValidAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // Returns: true
 * 
 * @example
 * isValidAddress('0xINVALID')
 * // Returns: false
 */
export function isValidAddress(address: string): boolean {
  try {
    // Use ethers.js built-in validation
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

/**
 * Check if a string matches the expected Student/Staff ID format
 * Currently checks for basic format (alphanumeric, 5-20 characters)
 * Can be customized based on your institution's ID format
 * 
 * @param id - String to validate
 * @returns true if valid ID format, false otherwise
 * 
 * @example
 * isValidStudentId('STU2025001')
 * // Returns: true
 * 
 * @example
 * isValidStudentId('ab')
 * // Returns: false
 */
export function isValidStudentId(id: string): boolean {
  // Alphanumeric, 5-20 characters
  // Customize this regex based on your ID format requirements
  const studentIdRegex = /^[A-Z0-9]{5,20}$/i
  return studentIdRegex.test(id)
}

/**
 * Check if a string is a valid OTP
 * Validates that it's exactly 6 digits
 * 
 * @param otp - String to validate
 * @returns true if valid 6-digit OTP, false otherwise
 * 
 * @example
 * isValidOTP('123456')
 * // Returns: true
 * 
 * @example
 * isValidOTP('12345')
 * // Returns: false
 */
export function isValidOTP(otp: string): boolean {
  return REGEX_PATTERNS.OTP.test(otp)
}

/**
 * Check if a File object meets size and type requirements
 * Validates file size and MIME type
 * 
 * @param file - File object to validate
 * @returns true if file is valid, false otherwise
 * 
 * @example
 * // Given a PDF file of 2MB
 * isValidFile(file)
 * // Returns: true
 * 
 * @example
 * // Given an image file (not in SUPPORTED_FILE_TYPES)
 * isValidFile(file)
 * // Returns: false
 */
export function isValidFile(file: File): boolean {
  // Check file type
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return false
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return false
  }

  return true
}

/**
 * Get error message for invalid file
 * Explains why a file failed validation
 * 
 * @param file - File object that failed validation
 * @returns Error message string
 * 
 * @example
 * getFileErrorMessage(file)
 * // Returns: 'File type not supported. Please upload PDF or Word documents.'
 */
export function getFileErrorMessage(file: File): string {
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return 'File type not supported. Please upload PDF or Word documents.'
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File is too large. Maximum size is 10 MB.`
  }

  return 'Invalid file'
}

/**
 * Check if a string matches IPFS hash format (both v0 and v1)
 * Validates IPFS CID (Content Identifier) format
 * 
 * @param hash - String to validate
 * @returns true if valid IPFS hash, false otherwise
 * 
 * @example
 * isValidIpfsHash('QmXyZ123456789...')
 * // Returns: true
 * 
 * @example
 * isValidIpfsHash('bafy...')
 * // Returns: true
 * 
 * @example
 * isValidIpfsHash('invalid')
 * // Returns: false
 */
export function isValidIpfsHash(hash: string): boolean {
  // Check CIDv0 (Qm...) or CIDv1 (bafyz..., bafz...)
  return (
    REGEX_PATTERNS.IPFS_HASH_V0.test(hash) ||
    REGEX_PATTERNS.IPFS_HASH_V1.test(hash)
  )
}

/**
 * Check if a string is a valid email address
 * Basic email validation (not RFC-5322 compliant but good for UX)
 * 
 * @param email - String to validate
 * @returns true if email format looks valid, false otherwise
 * 
 * @example
 * isValidEmail('user@example.com')
 * // Returns: true
 * 
 * @example
 * isValidEmail('invalid-email')
 * // Returns: false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if a string is a valid URL
 * 
 * @param url - String to validate
 * @returns true if valid URL, false otherwise
 * 
 * @example
 * isValidUrl('https://example.com')
 * // Returns: true
 * 
 * @example
 * isValidUrl('not-a-url')
 * // Returns: false
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a string is a valid name (person's name)
 * Allows letters, spaces, hyphens, and apostrophes
 * 
 * @param name - String to validate
 * @returns true if valid name format, false otherwise
 * 
 * @example
 * isValidName('John Doe')
 * // Returns: true
 * 
 * @example
 * isValidName('Mary-Jane O\'Connor')
 * // Returns: true
 * 
 * @example
 * isValidName('123')
 * // Returns: false
 */
export function isValidName(name: string): boolean {
  // Allow letters, spaces, hyphens, apostrophes; 2-100 characters
  const nameRegex = /^[a-zA-Z\s\-']{2,100}$/
  return nameRegex.test(name.trim())
}

/**
 * Validate an entire credential object before submission
 * Checks all required fields
 * 
 * @param studentId - Student ID
 * @param credentialName - Name of the credential
 * @param issuerAddress - Issuer's wallet address
 * @param ipfsHash - IPFS hash of the document
 * @returns Object with isValid boolean and error message if invalid
 * 
 * @example
 * validateCredential('STU2025001', 'Bachelor Degree', '0x...', 'QmXyz...')
 * // Returns: { isValid: true }
 * 
 * @example
 * validateCredential('invalid', 'Bachelor Degree', '0x...', 'QmXyz...')
 * // Returns: { isValid: false, error: 'Invalid student ID' }
 */
export function validateCredential(
  studentId: string,
  credentialName: string,
  issuerAddress: string,
  ipfsHash: string
): { isValid: boolean; error?: string } {
  if (!isValidStudentId(studentId)) {
    return { isValid: false, error: 'Invalid student ID format' }
  }

  if (!credentialName || credentialName.trim().length === 0) {
    return { isValid: false, error: 'Credential name is required' }
  }

  if (!isValidAddress(issuerAddress)) {
    return { isValid: false, error: 'Invalid issuer address' }
  }

  if (!isValidIpfsHash(ipfsHash)) {
    return { isValid: false, error: 'Invalid IPFS hash' }
  }

  return { isValid: true }
}

/**
 * Validate exam request input
 * 
 * @param studentId - Student ID
 * @param examId - Exam ID
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateExamRequest(
  studentId: string,
  examId: string
): { isValid: boolean; error?: string } {
  if (!isValidStudentId(studentId)) {
    return { isValid: false, error: 'Invalid student ID format' }
  }

  if (!examId || examId.trim().length === 0) {
    return { isValid: false, error: 'Exam ID is required' }
  }

  return { isValid: true }
}

/**
 * Validate registration form input
 * 
 * @param walletAddress - Wallet address to register
 * @param studentId - Student/Staff/Examiner ID
 * @param name - Full name
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateRegistration(
  walletAddress: string,
  studentId: string,
  name: string
): { isValid: boolean; error?: string } {
  if (!isValidAddress(walletAddress)) {
    return { isValid: false, error: 'Invalid wallet address' }
  }

  if (!isValidStudentId(studentId)) {
    return { isValid: false, error: 'Invalid ID format' }
  }

  if (!isValidName(name)) {
    return { isValid: false, error: 'Invalid name format' }
  }

  return { isValid: true }
}

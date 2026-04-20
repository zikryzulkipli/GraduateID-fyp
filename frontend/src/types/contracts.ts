/**
 * TypeScript type definitions for blockchain data structures
 * Used throughout the application for type safety and IDE autocomplete
 */

/**
 * Role constants (enum-free for erasableSyntaxOnly compatibility)
 * Maps to uint8 values in the smart contract
 */
export const Role = {
  None: 0,
  Student: 1,
  Examiner: 2,
  Admin: 3,
  Staff: 4
} as const

/**
 * Role type (numeric union derived from Role constants)
 */
export type Role = (typeof Role)[keyof typeof Role]

/**
 * Interface representing a graduate/user registered in the system
 * Maps to the Graduate struct in GraduateID.sol contract
 */
export interface Graduate {
  ID: string          // Student/Staff/Examiner ID
  name: string        // User's full name
  role: Role          // User's role in the system
  wallet: string      // Ethereum wallet address
  isVerified: boolean // Whether the graduate is verified by admin
}

/**
 * Interface representing an issued credential/certificate
 * Maps to the Credential struct in IssueCredential.sol contract
 */
export interface Credential {
  credentialName: string  // Name of the credential (e.g., "Bachelor's Degree")
  ipfsHash: string        // IPFS hash pointing to the credential document
  dateIssued: number      // Unix timestamp when credential was issued
  issuer: string          // Wallet address of the issuer
  isValid: boolean        // Whether the credential is still valid (not revoked)
}

/**
 * Request status constants (enum-free for erasableSyntaxOnly compatibility)
 * Maps to uint8 values in the OnlineExam.sol contract
 */
export const RequestStatus = {
  Pending: 0,   // Request submitted, awaiting examiner approval
  Approved: 1,  // Examiner approved and generated OTP
  Rejected: 2   // Examiner rejected the request
} as const

/**
 * RequestStatus type (numeric union derived from RequestStatus constants)
 */
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus]

/**
 * Interface representing an exam request with OTP verification
 * Maps to the ExamRequest struct in OnlineExam.sol contract
 */
export interface ExamRequest {
  studentID: string       // Student ID requesting exam access
  studentAddress: string  // Wallet address of the student
  examID: string          // Exam identifier
  examStatus: RequestStatus // Current status of the request
  reqTime: number         // Unix timestamp when request was created
  otpExpiry: number       // Unix timestamp when OTP expires
  otpHash: string         // Keccak256 hash of the OTP (security: plaintext not stored)
  otpUsed: boolean        // Whether OTP has been used for verification
}

/**
 * Interface representing network configuration
 * Defines how to connect to a blockchain network
 */
export interface NetworkConfig {
  chainId: number   // Ethereum chain ID (e.g., 31337 for localhost, 11155111 for Sepolia)
  name: string      // Human-readable network name (e.g., "Localhost")
  rpcUrl: string    // RPC endpoint URL for connecting to the network
  explorer: string  // Block explorer URL (e.g., Etherscan)
}

/**
 * Interface representing contract addresses for a specific network
 * Used to instantiate contract instances with the correct addresses
 */
export interface ContractAddresses {
  GraduateID: string          // Address of the GraduateID contract
  IssueCredential: string     // Address of the IssueCredential contract
  OnlineExam: string          // Address of the OnlineExam contract
  HashChecker: string         // Address of the HashChecker contract
  MultiSigManager?: string    // Address of the MultiSigManager contract (optional for backward compatibility)
  IDRegistry?: string         // Address of the IDRegistry contract (optional for backward compatibility)
}

/**
 * Type alias for Role (for flexibility in some contexts)
 */
export type RoleType = Role

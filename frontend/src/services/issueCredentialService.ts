import type { Contract } from 'ethers'
import { ethers } from 'ethers'
import IssueCredentialABI from '../abi/IssueCredential.json'
import GraduateIDABI from '../abi/GraduateID.json'
import { uploadWithMetadata, getIPFSUrl } from '../lib/ipfs'
import { getContractAddress } from '../config/contracts'
import { NETWORKS } from '../config/networks'
import { getContract, getProvider, getSigner, getChainId, waitForTransaction, handleContractError } from '../lib/ethers'
import { getExplorerTxUrl } from '../config/networks'
import { isValidFile, isValidStudentId } from '../utils/validators'
import type { Credential } from '../types'

type ContractMode = 'read' | 'write'

const resolveNetworkName = async (): Promise<string> => {
  const chainId = await getChainId()
  const entry = Object.entries(NETWORKS).find(([, cfg]) => cfg.chainId === chainId)
  if (!entry) {
    throw new Error(`Unsupported network with chainId ${chainId}. Please switch network.`)
  }
  return entry[0]
}

const getIssueCredentialContract = async (mode: ContractMode = 'write'): Promise<Contract> => {
  const network = await resolveNetworkName()
  const address = getContractAddress(network, 'IssueCredential')
  const signerOrProvider = mode === 'write' ? await getSigner() : getProvider()
  return getContract(address, IssueCredentialABI, signerOrProvider)
}

const mapCredential = (cred: any): Credential => ({
  credentialName: cred.credentialName,
  ipfsHash: cred.ipfsHash,
  dateIssued: Number(cred.dateIssued),
  issuer: cred.issuer,
  isValid: Boolean(cred.isValid)
})

/**
 * Issue a credential to a student (admin/issuer only)
 * Direct issuance - credential is immediately stored on-chain
 */
export const issueCredentialToStudent = async ({
  walletAddress,
  credentialName,
  file
}: {
  walletAddress: string
  credentialName: string
  file: File
}) => {
  if (!walletAddress) throw new Error('Student wallet address is required')
  if (!ethers.isAddress(walletAddress)) throw new Error('Invalid wallet address format')
  if (!credentialName) throw new Error('Credential name is required')
  if (!file) throw new Error('Credential file is required')
  if (!isValidFile(file)) throw new Error('Unsupported file type or size exceeds limit')

  try {
    const signer = await getSigner()
    const issuerAddress = await signer.getAddress()
    const contract = await getIssueCredentialContract('write')
    const studentWalletAddress = ethers.getAddress(walletAddress)

    console.log('📍 Contract Addresses Being Used:')
    console.log('   IssueCredential:', await contract.getAddress())
    
    // Check if current user is admin before proceeding
    const network = await resolveNetworkName()
    const graduateIdAddress = getContractAddress(network, 'GraduateID')
    console.log('   GraduateID:     ', graduateIdAddress)
    console.log('   Network:        ', network)
    
    const graduateIdContract = await getContract(graduateIdAddress, GraduateIDABI, await getSigner())
    
    const isAdmin = await graduateIdContract.isUserAdmin(issuerAddress)
    console.log('🔍 Admin check for issuer:', issuerAddress, '→', isAdmin)
    
    if (!isAdmin) {
      throw new Error(`Not authorized: ${issuerAddress} is not an admin. Only admins can issue credentials.`)
    }

    // Upload file + metadata to IPFS
    const { fileCID, metadataCID } = await uploadWithMetadata(file, {
      studentId: studentWalletAddress,
      credentialName,
      issuerAddress,
      timestamp: new Date().toISOString()
    })

    // Calculate expiry date (0 = no expiry)
    const expiryDate = 0

    // Direct issuance - call contract immediately
    const tx = await contract.issueCredential(
      studentWalletAddress,     // _studentWallet
      studentWalletAddress,     // _studentID
      credentialName,           // _credentialName
      issuerAddress,            // _issuer
      fileCID,                  // _ipfsHash
      expiryDate               // _expiryDate
    )

    const receipt = await waitForTransaction(tx.hash)
    const chainId = await getChainId()

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      studentWallet: studentWalletAddress,
      ipfsHash: fileCID,
      metadataCID,
      ipfsUrl: getIPFSUrl(fileCID),
      explorerUrl: getExplorerTxUrl(chainId, tx.hash)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Link the caller's wallet to a student ID (student flow)
 */
export const linkStudentID = async (studentId: string) => {
  if (!isValidStudentId(studentId)) throw new Error('Invalid student ID format')

  try {
    const contract = await getIssueCredentialContract('write')
    const tx = await contract.linkStudentID(studentId)
    const receipt = await waitForTransaction(tx.hash)
    const chainId = await getChainId()

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: getExplorerTxUrl(chainId, tx.hash)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Get all credentials for a student by student ID
 */
export const getCredentialsByStudentId = async (studentId: string): Promise<Credential[]> => {
  if (!isValidStudentId(studentId)) throw new Error('Invalid student ID format')

  const contract = await getIssueCredentialContract('read')
  const credentials = await contract.getCredentialsByID(studentId)
  return credentials.map(mapCredential)
}

/**
 * Get all credentials for a wallet address
 */
export const getCredentialsByWallet = async (walletAddress: string): Promise<Credential[]> => {
  if (!walletAddress) throw new Error('Wallet address required')

  const contract = await getIssueCredentialContract('read')
  const credentials = await contract.getAllCredentials(ethers.getAddress(walletAddress))
  return credentials.map(mapCredential)
}

/**
 * Revoke a credential by index (admin-only)
 */
export const revokeCredential = async (studentWallet: string, credentialIndex: number) => {
  if (!studentWallet || !ethers.isAddress(studentWallet)) {
    throw new Error('Invalid student wallet address')
  }
  if (credentialIndex < 0) throw new Error('Invalid credential index')

  try {
    const contract = await getIssueCredentialContract('write')
    const tx = await contract.revokeCredential(studentWallet, credentialIndex)
    const receipt = await waitForTransaction(tx.hash)
    const chainId = await getChainId()

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: getExplorerTxUrl(chainId, tx.hash)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Revoke a credential with a reason (admin-only)
 */
export const revokeCredentialWithReason = async (
  studentWallet: string,
  credentialIndex: number,
  reason: string
) => {
  if (!studentWallet || !ethers.isAddress(studentWallet)) {
    throw new Error('Invalid student wallet address')
  }
  if (credentialIndex < 0) throw new Error('Invalid credential index')
  if (!reason) throw new Error('Reason is required')

  try {
    const contract = await getIssueCredentialContract('write')
    const tx = await contract.revokeCredentialWithReason(studentWallet, credentialIndex, reason)
    const receipt = await waitForTransaction(tx.hash)
    const chainId = await getChainId()

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: getExplorerTxUrl(chainId, tx.hash)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Update credential IPFS hash (admin-only)
 */
export const updateCredentialIpfsHash = async (
  studentWallet: string,
  credentialIndex: number,
  newIpfsHash: string
) => {
  if (!studentWallet || !ethers.isAddress(studentWallet)) {
    throw new Error('Invalid student wallet address')
  }
  if (credentialIndex < 0) throw new Error('Invalid credential index')
  if (!newIpfsHash) throw new Error('New IPFS hash is required')

  try {
    const contract = await getIssueCredentialContract('write')
    const tx = await contract.updateCredentialIpfsHash(studentWallet, credentialIndex, newIpfsHash)
    const receipt = await waitForTransaction(tx.hash)
    const chainId = await getChainId()

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: getExplorerTxUrl(chainId, tx.hash)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Get valid (non-expired, non-revoked) credentials for a wallet
 */
export const getValidCredentials = async (walletAddress: string): Promise<Credential[]> => {
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }

  try {
    const contract = await getIssueCredentialContract('read')
    const credentials = await contract.getValidCredentials(ethers.getAddress(walletAddress))
    return credentials.map(mapCredential)
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Get credentials by name for a specific student
 */
export const getCredentialsByName = async (
  walletAddress: string,
  credentialName: string
): Promise<Credential[]> => {
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }
  if (!credentialName) throw new Error('Credential name is required')

  try {
    const contract = await getIssueCredentialContract('read')
    const credentials = await contract.getCredentialsByName(
      ethers.getAddress(walletAddress),
      credentialName
    )
    return credentials.map(mapCredential)
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}


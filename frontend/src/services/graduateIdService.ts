import type { Contract } from 'ethers'
import { ethers } from 'ethers'
import GraduateIDABI from '../abi/GraduateID.json'
import { getContract, getProvider, getSigner, getChainId, waitForTransaction, handleContractError } from '../lib/ethers'
import { getContractAddress } from '../config/contracts'
import { NETWORKS } from '../config/networks'
import type { Graduate, Role as RoleType } from '../types'
import { Role } from '../types'
import { isValidAddress, isValidName, isValidStudentId } from '../utils/validators'
import { getExplorerAddressUrl, getExplorerTxUrl } from '../config/networks'

type ContractMode = 'read' | 'write'

const resolveNetworkName = async (): Promise<string> => {
  const chainId = await getChainId()
  const entry = Object.entries(NETWORKS).find(([, cfg]) => cfg.chainId === chainId)
  if (!entry) {
    throw new Error(`Unsupported network with chainId ${chainId}. Please switch network.`)
  }
  return entry[0]
}

const getGraduateIdContract = async (mode: ContractMode = 'read'): Promise<Contract> => {
  const network = await resolveNetworkName()
  const address = getContractAddress(network, 'GraduateID')
  const signerOrProvider = mode === 'write' ? await getSigner() : getProvider()
  return getContract(address, GraduateIDABI, signerOrProvider)
}

const normalizeGraduate = (data: any[]): Graduate => {
  return {
    ID: data[0],
    name: data[1],
    role: Number(data[2]) as RoleType,
    wallet: ethers.getAddress(data[3]),
    isVerified: Boolean(data[4])
  }
}

/**
 * Register a student on-chain (self-registration)
 * Students can register themselves with their wallet
 */
export const registerStudent = async ({
  walletAddress,
  studentId,
  studentName
}: {
  walletAddress: string
  studentId: string
  studentName: string
}) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  if (!studentId) throw new Error('Student ID is required')
  if (!studentName) throw new Error('Student name is required')
  if (!isValidAddress(walletAddress)) throw new Error('Invalid wallet address format')
  if (!isValidStudentId(studentId)) throw new Error('Invalid student ID format')
  if (!isValidName(studentName)) throw new Error('Invalid student name format')

  try {
    const contract = await getGraduateIdContract('write')
    const targetAddress = ethers.getAddress(walletAddress)
    const tx = await contract.registerID(targetAddress, studentId, studentName, Role.Student)
    const receipt = await waitForTransaction(tx.hash)

    const chainId = await getChainId()
    const explorerUrl = getExplorerTxUrl(chainId, tx.hash)

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Register an examiner/staff on-chain (admin-only)
 * Keeps legacy signature used by RegisterID component
 */
export const registerExaminer = async ({
  walletAddress,
  examinerId,
  courseCode
}: {
  walletAddress: string
  examinerId: string
  courseCode?: string
}) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  if (!examinerId) throw new Error('Examiner/Staff ID is required')
  if (!isValidAddress(walletAddress)) throw new Error('Invalid wallet address format')
  if (!isValidStudentId(examinerId)) throw new Error('Invalid examiner/staff ID format')

  try {
    const contract = await getGraduateIdContract('write')
    const targetAddress = ethers.getAddress(walletAddress)
    const course = courseCode && courseCode.trim().length > 0 ? courseCode : examinerId
    const tx = await contract.registerExaminer(targetAddress, examinerId, course)
    const receipt = await waitForTransaction(tx.hash)

    const chainId = await getChainId()
    const explorerUrl = getExplorerTxUrl(chainId, tx.hash)

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Register a user with any role (admin-only)
 * Generic registration function that accepts role parameter
 */
export const registerWithRole = async ({
  walletAddress,
  userId,
  userName,
  role
}: {
  walletAddress: string
  userId: string
  userName: string
  role: RoleType
}) => {
  if (!walletAddress) throw new Error('Wallet address is required')
  if (!userId) throw new Error('User ID is required')
  if (!userName) throw new Error('User name is required')
  if (!isValidAddress(walletAddress)) throw new Error('Invalid wallet address format')
  if (!isValidStudentId(userId)) throw new Error('Invalid user ID format')
  // For examiner course code/names we allow alphanumeric + spaces, so only require non-empty
  if (role !== Role.Examiner && !isValidName(userName)) throw new Error('Invalid user name format')

  try {
    const contract = await getGraduateIdContract('write')
    const targetAddress = ethers.getAddress(walletAddress)
    const tx = await contract.registerID(targetAddress, userId, userName, role)
    const receipt = await waitForTransaction(tx.hash)

    const chainId = await getChainId()
    const explorerUrl = getExplorerTxUrl(chainId, tx.hash)

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Fetch graduate profile by wallet address
 */
export const getGraduateByAddress = async (walletAddress: string): Promise<Graduate> => {
  if (!isValidAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }

  const contract = await getGraduateIdContract('read')
  const data = await contract.getGraduate(ethers.getAddress(walletAddress))
  return normalizeGraduate(data)
}

/**
 * Fetch examiner course (if any)
 */
export const getExaminerCourse = async (walletAddress: string): Promise<string> => {
  if (!isValidAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }

  const contract = await getGraduateIdContract('read')
  return contract.getExaminerCourse(ethers.getAddress(walletAddress))
}

/**
 * Verify a graduate (admin-only)
 */
export const verifyGraduate = async (walletAddress: string) => {
  if (!isValidAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }

  try {
    const contract = await getGraduateIdContract('write')
    const tx = await contract.verifyGraduate(ethers.getAddress(walletAddress))
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
 * Resolve on-chain role for an address
 */
export const getRoleForAddress = async (walletAddress: string): Promise<RoleType> => {
  if (!walletAddress) {
    return Role.None
  }
  
  if (!isValidAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }

  try {
    const contract = await getGraduateIdContract('read')
    const roleValue = await contract.getUserRole(ethers.getAddress(walletAddress))
    return Number(roleValue) as RoleType
  } catch (error: any) {
    console.error('Error fetching role:', error)
    // Return Student as default when role cannot be fetched
    return Role.Student
  }
}

/**
 * Quick helper to build explorer link for an address on current network
 */
export const getGraduateExplorerUrl = async (walletAddress: string): Promise<string> => {
  const chainId = await getChainId()
  return getExplorerAddressUrl(chainId, walletAddress)
}

/**
 * Add a new admin (owner-only)
 */
export const addAdmin = async (adminAddress: string) => {
  if (!isValidAddress(adminAddress)) {
    throw new Error('Invalid admin address')
  }

  try {
    const contract = await getGraduateIdContract('write')
    const tx = await contract.addAdmin(ethers.getAddress(adminAddress))
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
 * Remove an admin (owner-only)
 */
export const removeAdmin = async (adminAddress: string) => {
  if (!isValidAddress(adminAddress)) {
    throw new Error('Invalid admin address')
  }

  try {
    const contract = await getGraduateIdContract('write')
    const tx = await contract.removeAdmin(ethers.getAddress(adminAddress))
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
 * Check if an address is admin
 */
export const isUserAdmin = async (walletAddress: string): Promise<boolean> => {
  if (!isValidAddress(walletAddress)) {
    throw new Error('Invalid wallet address')
  }

  try {
    const contract = await getGraduateIdContract('read')
    return await contract.isUserAdmin(ethers.getAddress(walletAddress))
  } catch (error: any) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get admin status for multiple addresses
 */
export const getAdmins = async (addresses: string[]): Promise<boolean[]> => {
  if (!addresses.length) {
    throw new Error('No addresses provided')
  }

  for (const addr of addresses) {
    if (!isValidAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`)
    }
  }

  try {
    const contract = await getGraduateIdContract('read')
    const checksummed = addresses.map(a => ethers.getAddress(a))
    return await contract.getAdmins(checksummed)
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Get the contract owner address
 */
export const getOwner = async (): Promise<string> => {
  try {
    const contract = await getGraduateIdContract('read')
    return await contract.owner()
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Transfer contract ownership to a new address (current owner only)
 */
export const transferOwnership = async (newOwner: string) => {
  if (!isValidAddress(newOwner)) {
    throw new Error('Invalid new owner address')
  }

  try {
    const contract = await getGraduateIdContract('write')
    const tx = await contract.transferOwnership(ethers.getAddress(newOwner))
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

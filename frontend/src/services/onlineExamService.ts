/**
 * OnlineExam service layer
 * Handles exam requests, approvals, and OTP verification flows
 */

import { ethers } from 'ethers'
import type { Contract } from 'ethers'
import OnlineExamABI from '../abi/OnlineExam.json'
import { getContractAddress } from '../config/contracts'
import { NETWORKS } from '../config/networks'
import { getContract, getProvider, getSigner, getChainId, waitForTransaction, handleContractError } from '../lib/ethers'
import { isValidAddress, isValidStudentId } from '../utils/validators'
import { getExplorerTxUrl } from '../config/networks'

export type OtpStatus = {
  isValid: boolean
  isUsed: boolean
  isExpired: boolean
}

export type ExamRequest = {
  studentId: string
  studentAddress: string
  examId: string
  examStatus: number
  requestTime: number
  otpExpiry: number
  otpUsed: boolean
}

export const ExamRequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2
} as const

export type ExamRequestStatus = (typeof ExamRequestStatus)[keyof typeof ExamRequestStatus]

type ContractMode = 'read' | 'write'

const resolveNetworkName = async (): Promise<string> => {
  const chainId = await getChainId()
  const entry = Object.entries(NETWORKS).find(([, cfg]) => cfg.chainId === chainId)
  if (!entry) {
    throw new Error(`Unsupported network with chainId ${chainId}. Please switch network.`)
  }
  return entry[0]
}

const getOnlineExamContract = async (mode: ContractMode = 'write'): Promise<Contract> => {
  const network = await resolveNetworkName()
  const address = getContractAddress(network, 'OnlineExam')
  const signerOrProvider = mode === 'write' ? await getSigner() : getProvider()
  return getContract(address, OnlineExamABI, signerOrProvider)
}

const normalizeExamRequest = (raw: any): ExamRequest => {
  return {
    studentId: raw.studentID ?? raw[0] ?? '',
    studentAddress: raw.studentAddress ?? raw[1] ?? ethers.ZeroAddress,
    examId: raw.examID ?? raw[2] ?? '',
    examStatus: Number(raw.examStatus ?? raw[3] ?? 0),
    requestTime: Number(raw.reqTime ?? raw[4] ?? 0),
    otpExpiry: Number(raw.otpExpiry ?? raw[5] ?? 0),
    otpUsed: Boolean(raw.otpUsed ?? raw[7] ?? false)
  }
}

/**
 * Examiner: create an exam request on behalf of student
 */
export const createExamRequestForStudent = async ({
  studentAddress,
  studentId,
  examId
}: {
  studentAddress: string
  studentId: string
  examId: string
}) => {
  if (!isValidAddress(studentAddress)) throw new Error('Invalid student wallet address')
  if (!isValidStudentId(studentId)) throw new Error('Invalid student ID')
  if (!examId) throw new Error('Exam ID is required')

  try {
    const contract = await getOnlineExamContract('write')
    const tx = await contract.createExamRequestForStudent(
      ethers.getAddress(studentAddress),
      studentId,
      examId
    )
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
 * Student: request an online exam
 */
export const requestExam = async ({
  studentId,
  examId
}: {
  studentId: string
  examId: string
}) => {
  if (!isValidStudentId(studentId)) throw new Error('Invalid student ID')
  if (!examId) throw new Error('Exam ID is required')

  try {
    const contract = await getOnlineExamContract('write')
    const tx = await contract.requestExam(studentId, examId)
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
 * Examiner: approve a student's request by assigning OTP hash
 */
export const approveExamRequest = async ({
  studentAddress,
  examId,
  otp
}: {
  studentAddress: string
  examId: string
  otp: string
}) => {
  if (!isValidAddress(studentAddress)) throw new Error('Invalid student wallet address')
  if (!otp) throw new Error('OTP is required')
  if (!examId) throw new Error('Exam ID is required')

  try {
    const contract = await getOnlineExamContract('write')
    const otpHash = ethers.keccak256(ethers.toUtf8Bytes(otp))
    const tx = await contract.approveRequest(ethers.getAddress(studentAddress), examId, otpHash)
    const receipt = await waitForTransaction(tx.hash)
    const chainId = await getChainId()

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      otpHash,
      explorerUrl: getExplorerTxUrl(chainId, tx.hash)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Student: verify OTP to complete exam verification
 */
export const verifyOtp = async ({ examId, otp }: { examId: string; otp: string }) => {
  if (!examId) throw new Error('Exam ID is required')
  if (!otp) throw new Error('OTP is required')

  try {
    const contract = await getOnlineExamContract('write')
    const tx = await contract.verifyOTP(examId, otp)
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
 * Read OTP status for a student address (view-only)
 */
export const getOtpStatus = async ({
  studentAddress,
  examId
}: {
  studentAddress: string
  examId: string
}): Promise<OtpStatus> => {
  if (!isValidAddress(studentAddress)) throw new Error('Invalid wallet address')
  if (!examId) throw new Error('Exam ID is required')

  try {
    const contract = await getOnlineExamContract('read')
    const [isValid, isUsed, isExpired] = await contract.getOTPStatus(ethers.getAddress(studentAddress), examId)
    return {
      isValid: Boolean(isValid),
      isUsed: Boolean(isUsed),
      isExpired: Boolean(isExpired)
    }
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Fetch list of exam IDs associated with a student
 */
export const getStudentExamIds = async (studentAddress: string): Promise<string[]> => {
  if (!isValidAddress(studentAddress)) throw new Error('Invalid wallet address')

  try {
    const contract = await getOnlineExamContract('read')
    return await contract.getStudentExamIds(ethers.getAddress(studentAddress))
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Fetch a specific exam request for a student + exam ID
 */
export const getExamRequest = async ({
  studentAddress,
  examId
}: {
  studentAddress: string
  examId: string
}): Promise<ExamRequest> => {
  if (!isValidAddress(studentAddress)) throw new Error('Invalid wallet address')
  if (!examId) throw new Error('Exam ID is required')

  try {
    const contract = await getOnlineExamContract('read')
    const raw = await contract.getExamRequest(ethers.getAddress(studentAddress), examId)
    return normalizeExamRequest(raw)
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

/**
 * Utility to hash an OTP without sending it to the chain
 */
export const hashOtp = (otp: string): string => {
  if (!otp) throw new Error('OTP is required')
  return ethers.keccak256(ethers.toUtf8Bytes(otp))
}

/**
 * Get pending exam requests from ExamRequestCreated events for a specific examId
 */
export const getPendingRequestsForExam = async (examId: string): Promise<ExamRequest[]> => {
  if (!examId) throw new Error('Exam ID is required')

  try {
    const contract = await getOnlineExamContract('read')
    const provider = getProvider()
    
    // Query ExamRequestCreated events - use valid block range
    const currentBlock = await provider.getBlockNumber()
    const fromBlock = Math.max(0, currentBlock - 10000) // Last ~10k blocks or from genesis
    
    const filter = contract.filters.ExamRequestCreated()
    const events = await contract.queryFilter(filter, fromBlock, currentBlock)

    const pendingRequests: ExamRequest[] = []

    for (const event of events) {
      if (!('args' in event) || !event.args) continue

      const studentAddress = event.args[0] as string
      const eventExamId = event.args[1] as string
      
      if (eventExamId === examId) {
        try {
          // Fetch current state of this request
          const request = await contract.getExamRequest(studentAddress, examId)
          const normalized = normalizeExamRequest(request)
          
          // Only include if still pending
          if (normalized.examStatus === ExamRequestStatus.Pending) {
            pendingRequests.push(normalized)
          }
        } catch (err) {
          console.warn(`Failed to fetch request for ${studentAddress}:`, err)
        }
      }
    }
    
    return pendingRequests
  } catch (error: any) {
    throw new Error(handleContractError(error))
  }
}

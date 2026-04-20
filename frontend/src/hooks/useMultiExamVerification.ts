import { useState } from 'react'
import { useContract } from './useContract'

/**
 * Hook for multi-exam online exam verification
 * Supports multiple concurrent exam requests per student
 */
export const useMultiExamVerification = (studentAccount: string | null) => {
  const [exams, setExams] = useState<Map<string, any>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { contract: onlineExam } = useContract('OnlineExam', 'write')

  /**
   * Request exam for the student
   */
  const requestExam = async (studentID: string, examID: string) => {
    try {
      setIsLoading(true)
      setError('')

      if (!onlineExam) throw new Error('OnlineExam contract not loaded')
      if (!studentAccount) throw new Error('Student account not connected')

      const tx = await onlineExam.requestExam(studentID, examID)
      await tx.wait()

      // Update local state
      setExams(prev => new Map(prev).set(examID, { status: 'Pending', examID }))

      return true
    } catch (err: any) {
      const errorMsg = err?.reason || err?.message || 'Failed to request exam'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get OTP status for a specific exam
   */
  const getOTPStatus = async (examID: string) => {
    try {
      if (!onlineExam || !studentAccount) return null

      // Call: getOTPStatus(studentAddress, examID)
      const [isValid, isUsed, isExpired] = await onlineExam.getOTPStatus(studentAccount, examID)

      return {
        isValid,
        isUsed,
        isExpired,
      }
    } catch (err: any) {
      console.error(`Failed to fetch OTP status for exam ${examID}:`, err)
      return null
    }
  }

  /**
   * Verify OTP for a specific exam
   */
  const verifyOTP = async (examID: string, otp: string) => {
    try {
      setIsLoading(true)
      setError('')

      if (!onlineExam) throw new Error('OnlineExam contract not loaded')

      // Call: verifyOTP(examID, otp)
      const tx = await onlineExam.verifyOTP(examID, otp)
      await tx.wait()

      // Update local state
      setExams(prev => new Map(prev).set(examID, { status: 'Verified', examID }))

      return true
    } catch (err: any) {
      const errorMsg = err?.reason || err?.message || 'OTP verification failed'
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    exams,
    requestExam,
    getOTPStatus,
    verifyOTP,
    isLoading,
    error,
  }
}

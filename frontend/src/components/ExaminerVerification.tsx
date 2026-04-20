import { useState, useEffect } from 'react'
import TopBar from './TopBar'
import './ExaminerVerification.css'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { useWallet } from '../context/WalletContext'
import { approveExamRequest, getPendingRequestsForExam, type ExamRequest } from '../services/onlineExamService'
import { getExaminerCourse } from '../services/graduateIdService'

type ExaminerVerificationProps = {
  onBack: () => void
}

function ExaminerVerification({ onBack }: ExaminerVerificationProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [generatedOTPs, setGeneratedOTPs] = useState<Record<string, { otp: string; txHash: string }>>({})

  const { account } = useWallet()
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)

  const [requests, setRequests] = useState<ExamRequest[]>([])
  const [examinerCourse, setExaminerCourse] = useState('')

  useEffect(() => {
    const loadCourse = async () => {
      if (!account || !isCorrectNetwork) return
      try {
        const course = await getExaminerCourse(account)
        setExaminerCourse(course || '')
      } catch (err) {
        console.warn('Failed to load examiner course', err)
      }
    }

    loadCourse()
  }, [account, isCorrectNetwork])

  const loadPendingRequests = async () => {
    if (!examinerCourse || !isCorrectNetwork) {
      setRequests([])
      return
    }

    try {
      setIsLoadingRequests(true)
      setErrorMessage('')
      
      const pending = await getPendingRequestsForExam(examinerCourse)
      setRequests(pending)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err?.message || 'Failed to load pending requests')
    } finally {
      setIsLoadingRequests(false)
    }
  }

  useEffect(() => {
    if (examinerCourse && isCorrectNetwork) {
      loadPendingRequests()
      
      // Auto-refresh every 15 seconds
      const interval = setInterval(loadPendingRequests, 15000)
      return () => clearInterval(interval)
    }
  }, [examinerCourse, isCorrectNetwork])

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleVerifySingle = async (request: ExamRequest) => {
    if (!isCorrectNetwork) {
      setErrorMessage('Please switch to the correct network')
      return
    }

    try {
      setIsProcessing(request.studentAddress)
      setErrorMessage('')

      const otp = generateOTP()
      const result = await approveExamRequest({
        studentAddress: request.studentAddress,
        examId: request.examId,
        otp
      })

      // Store generated OTP and transaction hash to display to examiner
      setGeneratedOTPs((prev) => ({ 
        ...prev, 
        [request.studentAddress + request.examId]: { otp, txHash: result.txHash } 
      }))
      
      setSuccessMessage(`Request approved! Share OTP with student.`)
      setShowSuccessModal(true)
      
      // Reload pending requests
      await loadPendingRequests()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || 'Failed to approve exam request')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleVerifyAll = async () => {
    if (!isCorrectNetwork) {
      setErrorMessage('Please switch to the correct network')
      return
    }

    if (requests.length === 0) {
      setErrorMessage('No pending requests to approve')
      return
    }

    try {
      setIsProcessing('all')
      setErrorMessage('')

      const otps: Record<string, { otp: string; txHash: string }> = {}

      for (const req of requests) {
        const otp = generateOTP()
        const result = await approveExamRequest({
          studentAddress: req.studentAddress,
          examId: req.examId,
          otp
        })
        otps[req.studentAddress + req.examId] = { otp, txHash: result.txHash }
      }

      setGeneratedOTPs((prev) => ({ ...prev, ...otps }))
      setSuccessMessage(`All ${requests.length} requests approved with OTPs!`)
      setShowSuccessModal(true)
      
      // Reload pending requests
      await loadPendingRequests()
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error?.message || 'Failed to approve all requests')
    } finally {
      setIsProcessing(null)
    }
  }

  const handleCloseModal = () => {
    setShowSuccessModal(false)
  }

  return (
    <div className="examiner-verification-page">
      <TopBar roleName="Examiner" />

      <div className="examiner-verification-container">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <h1 className="examiner-verification-title">
          Online Exams Identity Verification Requests
        </h1>

        <div className="course-banner">
          <span>Course: <strong>{examinerCourse || 'Not registered'}</strong></span>
          <button 
            className="refresh-btn-small" 
            onClick={loadPendingRequests}
            disabled={isLoadingRequests || !examinerCourse}
          >
            {isLoadingRequests ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {!isCorrectNetwork && (
          <div style={{ 
            padding: '10px', 
            marginBottom: '15px', 
            backgroundColor: '#ffe6e6', 
            color: '#d32f2f', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Wrong network detected. 
            <button 
              onClick={switchToCorrectNetwork}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Switch to Localhost
            </button>
          </div>
        )}

        {isLoadingRequests && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Loading pending requests...
          </div>
        )}

        {errorMessage && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#ffe6e6',
            color: '#d32f2f',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {errorMessage}
          </div>
        )}

        <button 
          className="verify-all-btn" 
          onClick={handleVerifyAll}
          disabled={isProcessing !== null || !isCorrectNetwork || requests.length === 0}
        >
          {isProcessing === 'all' ? 'Processing...' : `Approve All (${requests.length})`}
        </button>

        <div className="requests-card">
          {requests.map((request, idx) => {
            const otpKey = request.studentAddress + request.examId
            const generatedOTP = generatedOTPs[otpKey]
            
            return (
              <div key={`${request.studentAddress}-${request.examId}-${idx}`} className="examiner-request-item">
                <div className="examiner-request-info">
                  <p className="request-name">{request.examId}</p>
                  <p className="request-id">Student: {request.studentId}</p>
                  <p className="request-address">{request.studentAddress.slice(0, 12)}...</p>
                  <p className="request-time">Requested: {new Date(request.requestTime * 1000).toLocaleString()}</p>
                </div>

                <div className="examiner-request-action">
                  {generatedOTP ? (
                    <div className="otp-display-bubble">
                      <div className="otp-label">Share with Student</div>
                      <div className="otp-code">{generatedOTP.otp}</div>
                      <div className="tx-hash-label">Transaction</div>
                      <div className="tx-hash">{generatedOTP.txHash.slice(0, 10)}...</div>
                    </div>
                  ) : (
                    <button
                      className="verify-single-btn"
                      onClick={() => handleVerifySingle(request)}
                      disabled={isProcessing !== null || !isCorrectNetwork}
                    >
                      {isProcessing === request.studentAddress ? '...' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {requests.length === 0 && !isLoadingRequests && (
          <div className="empty-requests">
            <p>No pending OTP requests found for {examinerCourse || 'your course'}.</p>
            <p className="helper-note">Students can request OTP from their exam verification page.</p>
          </div>
        )}
      </div>

      {showSuccessModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>
              ×
            </button>
            <div className="success-icon">✓</div>
            <h2 className="modal-title">{successMessage}</h2>
          </div>
        </div>
      )}

      <footer className="examiner-verification-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default ExaminerVerification

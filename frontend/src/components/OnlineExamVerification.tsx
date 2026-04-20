import { useState, useEffect, useCallback } from 'react'
import TopBar from './TopBar'
import './OnlineExamVerification.css'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { useWallet } from '../context/WalletContext'
import {
  getExamRequest,
  getStudentExamIds,
  requestExam,
  verifyOtp as verifyOtpService,
  type ExamRequest,
  ExamRequestStatus
} from '../services/onlineExamService'

type OnlineExamVerificationProps = {
  onBack: () => void
}

function OnlineExamVerification({ onBack }: OnlineExamVerificationProps) {
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard()
  const { account } = useWallet()

  const [examRequests, setExamRequests] = useState<ExamRequest[]>([])
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [requestingExamId, setRequestingExamId] = useState<string>('')
  const [verifyingExamId, setVerifyingExamId] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})

  const loadRequests = useCallback(async () => {
    if (!account) return
    setIsLoading(true)
    setErrorMessage('')

    try {
      const examIds = await getStudentExamIds(account)
      const requests = await Promise.all(
        examIds.map(async (examId) => {
          try {
            return await getExamRequest({ studentAddress: account, examId })
          } catch (err) {
            console.warn('Failed to load exam request', examId, err)
            return null
          }
        })
      )
      const validRequests = requests.filter((req): req is ExamRequest => !!req)
      
      // Detect new OTP approvals and show notifications
      validRequests.forEach((req) => {
        const key = req.examId
        const wasNotified = notifications[key]
        const isApproved = req.examStatus === ExamRequestStatus.Approved && !req.otpUsed
        
        if (isApproved && !wasNotified) {
          setNotifications((prev) => ({ ...prev, [key]: true }))
        }
      })
      
      setExamRequests(validRequests)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err?.message || 'Failed to load exam requests')
    } finally {
      setIsLoading(false)
    }
  }, [account])

  useEffect(() => {
    if (!isCorrectNetwork) return
    loadRequests()
  }, [isCorrectNetwork, loadRequests])

  const statusLabel = (req: ExamRequest) => {
    const now = Math.floor(Date.now() / 1000)
    const expired = req.otpExpiry > 0 && now > req.otpExpiry
    if (req.examStatus === ExamRequestStatus.Pending) return 'Pending (waiting for OTP)'
    if (req.examStatus === ExamRequestStatus.Rejected) return 'Rejected'
    if (req.otpUsed) return 'Verified'
    if (expired) return 'OTP expired'
    return 'OTP ready'
  }

  const canVerify = (req: ExamRequest) => {
    const now = Math.floor(Date.now() / 1000)
    const expired = req.otpExpiry > 0 && now > req.otpExpiry
    return req.examStatus === ExamRequestStatus.Approved && !req.otpUsed && !expired
  }

  const handleRequestOtpFromCard = async (req: ExamRequest) => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!isCorrectNetwork) {
      setErrorMessage('Please switch to the correct network')
      return
    }

    if (!req.studentId) {
      setErrorMessage('Missing student ID for this request')
      return
    }

    try {
      setRequestingExamId(req.examId)
      await requestExam({ studentId: req.studentId, examId: req.examId })
      setSuccessMessage('OTP request sent! Waiting for examiner approval...')
      await loadRequests()
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err?.message || 'Failed to request OTP')
    } finally {
      setRequestingExamId('')
    }
  }

  const handleVerify = async (examId: string) => {
    setErrorMessage('')
    setSuccessMessage('')

    const otp = otpInputs[examId]?.trim()
    if (!otp) {
      setErrorMessage('Please enter the OTP for this exam.')
      return
    }

    if (!isCorrectNetwork) {
      setErrorMessage('Please switch to the correct network')
      return
    }

    try {
      setVerifyingExamId(examId)
      await verifyOtpService({ examId, otp })
      setSuccessMessage('OTP verified successfully!')
      setOtpInputs((prev) => ({ ...prev, [examId]: '' }))
      await loadRequests()
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err?.message || 'Failed to verify OTP')
    } finally {
      setVerifyingExamId('')
    }
  }

  return (
    <div className="verification-page">
      <TopBar roleName="Student" />

      <div className="verification-container">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>

        <h1 className="verification-title">Online Exams Identity Verification</h1>

        {!isCorrectNetwork && (
          <div
            style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#ffe6e6',
              color: '#d32f2f',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
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

        {isLoading && (
          <div
            style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              borderRadius: '4px',
              textAlign: 'center'
            }}
          >
            Loading exam requests...
          </div>
        )}

        {errorMessage && <div className="exam-alert error">{errorMessage}</div>}

        {successMessage && <div className="exam-alert success">{successMessage}</div>}

        <div className="requests-header">
          <div>
            <h2>Exam Requests</h2>
            <p>View pending and approved requests or request OTP for your exam.</p>
          </div>
          <button className="refresh-btn" onClick={loadRequests} disabled={isLoading || !isCorrectNetwork}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="requests-grid">
          {examRequests.map((req) => {
            const now = Math.floor(Date.now() / 1000)
            const expired = req.otpExpiry > 0 && now > req.otpExpiry
            const isVerified = req.otpUsed
            const pending = req.examStatus === ExamRequestStatus.Pending
            const statusText = statusLabel(req)

            return (
              <div key={req.examId} className="request-card">
                <div className="request-card-content">
                  <div className="card-info">
                    <div className="request-exam">{req.examId}</div>
                    <div className="request-student">Student ID: {req.studentId || '—'}</div>
                    <div className="request-meta">
                      <span>
                        Requested at: {req.requestTime ? new Date(req.requestTime * 1000).toLocaleString() : 'N/A'}
                      </span>
                      {req.otpExpiry > 0 && <span>OTP expiry: {new Date(req.otpExpiry * 1000).toLocaleString()}</span>}
                    </div>
                  </div>

                  <div className="card-action">
                    {pending && !isVerified && (
                      <button
                        className="request-otp-btn"
                        onClick={() => handleRequestOtpFromCard(req)}
                        disabled={requestingExamId === req.examId || !isCorrectNetwork}
                      >
                        {requestingExamId === req.examId ? 'Requesting...' : 'Request OTP'}
                      </button>
                    )}

                    {canVerify(req) && notifications[req.examId] && (
                      <div className="notification-badge">
                        <span className="bell-icon">🔔</span>
                        <span className="notification-text">OTP Ready!</span>
                      </div>
                    )}

                    {isVerified && <span className="verified-badge">✓ Verified</span>}
                  </div>
                </div>

                {canVerify(req) && !isVerified && (
                  <div className="otp-verification-section">
                    <label>Enter OTP</label>
                    <div className="otp-input-group">
                      <input
                        type="text"
                        value={otpInputs[req.examId] || ''}
                        placeholder="Enter OTP"
                        onChange={(e) => setOtpInputs((prev) => ({ ...prev, [req.examId]: e.target.value }))}
                        maxLength={12}
                        className="otp-input"
                      />
                      <button
                        className="submit-btn"
                        onClick={() => handleVerify(req.examId)}
                        disabled={verifyingExamId === req.examId || !isCorrectNetwork}
                      >
                        {verifyingExamId === req.examId ? 'Verifying...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className={`status-chip ${pending ? 'pending' : isVerified ? 'verified' : expired ? 'expired' : 'approved'}`}
                >
                  {statusText}
                </div>
              </div>
            )
          })}
        </div>

        {!examRequests.length && !isLoading && (
          <div className="empty-state">
            <p>No exam requests yet. Your examiner will create a request for you.</p>
          </div>
        )}
      </div>

      <footer className="verification-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default OnlineExamVerification

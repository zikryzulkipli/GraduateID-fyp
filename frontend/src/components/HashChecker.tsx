import { useState } from 'react'
import './HashChecker.css'
import { useContract } from '../hooks/useContract'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { verifyHashOnChain } from '../services/hashService'

type VerificationStatus = 'idle' | 'verified' | 'corrupted' | 'network_error'

interface HashCheckerProps {
  onBack?: () => void
}

function HashChecker({ onBack }: HashCheckerProps = {}) {
  const [hash, setHash] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Get contract instance and network guard
  const { contract, isLoading: contractLoading } = useContract('HashChecker', 'read')
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)

  const handleVerify = async () => {
    if (!hash.trim()) {
      return
    }

    // Check network first
    if (!isCorrectNetwork) {
      setStatus('network_error')
      setErrorMessage('Please switch to the correct network')
      return
    }

    if (!contract) {
      setErrorMessage('Contract not loaded. Please try again.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      // Call contract to verify hash
      const result = await verifyHashOnChain(hash, contract)
      setStatus(result ? 'verified' : 'corrupted')
    } catch (error: any) {
      console.error('Verification error:', error)
      setErrorMessage(error?.message || 'Failed to verify hash')
      setStatus('corrupted')
    } finally {
      setIsVerifying(false)
    }
  }

  const closeModal = () => {
    setStatus('idle')
    setErrorMessage('')
  }

  const handleGoBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <div className="hash-checker-page">
      <div className="hash-checker-container">
        <button className="back-button" onClick={handleGoBack}>
          ← Back
        </button>

        <div className="hash-checker-content">
          <h2 className="instruction">
            Enter hash number from exported file/QR Scan
          </h2>

          {/* Show network error if on wrong network */}
          {!isCorrectNetwork && (
            <div style={{ 
              padding: '10px', 
              marginBottom: '10px', 
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

          {/* Show loading state */}
          {contractLoading && (
            <div style={{
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              Loading contract...
            </div>
          )}

          <input
            type="text"
            className="hash-input"
            placeholder="0x1ndi2348al38349qo324992mssa"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            disabled={contractLoading}
          />

          <button
            className="verify-button"
            onClick={handleVerify}
            disabled={isVerifying || !hash.trim() || !isCorrectNetwork || contractLoading}
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>

      <footer className="hash-checker-footer">
        GraduateID (GrID) Rights, (2025)
      </footer>

      {/* Verification Result Modal */}
      {status !== 'idle' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              ✕
            </button>

            {status === 'network_error' ? (
              <>
                <div className="modal-icon corrupted-icon">
                  <svg viewBox="0 0 100 100" width="100" height="100">
                    <circle cx="50" cy="50" r="45" fill="#e74c3c" />
                    <path
                      d="M35 35 L65 65 M65 35 L35 65"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="modal-message">{errorMessage}</p>
              </>
            ) : status === 'verified' ? (
              <>
                <div className="modal-icon verified-icon">
                  <svg viewBox="0 0 100 100" width="100" height="100">
                    <circle cx="50" cy="50" r="45" fill="#D4A017" />
                    <path
                      d="M30 50 L45 65 L70 35"
                      stroke="white"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="modal-message">
                  Credentials hash is verified and validated with the IPFS
                </p>
              </>
            ) : (
              <>
                <div className="modal-icon corrupted-icon">
                  <svg viewBox="0 0 100 100" width="100" height="100">
                    <circle cx="50" cy="50" r="45" fill="#e74c3c" />
                    <path
                      d="M35 35 L65 65 M65 35 L35 65"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="modal-message">
                  {errorMessage || 'Credentials hash could not be verified'}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default HashChecker

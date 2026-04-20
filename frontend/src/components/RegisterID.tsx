import { useState } from 'react'
import TopBar from './TopBar'
import './RegisterID.css'
import { registerWithRole, registerExaminer } from '../services/graduateIdService.ts'
import { parseContractError, isUserRejection } from '../utils/errorParser'
import { checkSufficientBalance } from '../utils/gasEstimator'
import { useWallet } from '../context/WalletContext'
import { Role } from '../types'
import { ethers } from 'ethers'
import TransactionStatus, { type TransactionState } from './TransactionStatus'

interface RegisterIDProps {
  onBack?: () => void
}

function RegisterID({ onBack }: RegisterIDProps) {
  const { account: connectedWallet } = useWallet()
  const [walletAddress, setWalletAddress] = useState('')
  const [examinerId, setExaminerId] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [selectedRole, setSelectedRole] = useState<number>(Role.Examiner)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txState, setTxState] = useState<TransactionState | null>(null)
  const [txHash, setTxHash] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [gasWarning, setGasWarning] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTxState(null)
    setErrorMessage('')
    setGasWarning('')
    setTxHash('')

    if (!walletAddress.trim() || !examinerId.trim()) {
      setErrorMessage('Wallet address and ID are required')
      return
    }

    if (selectedRole === Role.Examiner && !courseCode.trim()) {
      setErrorMessage('Course code/name is required for examiners')
      return
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      setErrorMessage('Invalid wallet address format. Please enter a valid Ethereum address')
      return
    }

    // Check gas before submitting
    if (connectedWallet) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const gasCheck = await checkSufficientBalance(
          provider,
          connectedWallet,
          { to: walletAddress, data: '0x' }
        )
        
        if (!gasCheck.hasSufficient) {
          setGasWarning(
            `Warning: Your balance (${gasCheck.balance} ETH) may be insufficient. ` +
            `Estimated cost: ${gasCheck.estimatedCost} ETH`
          )
        }
      } catch (err) {
        console.warn('Gas estimation failed:', err)
      }
    }

    try {
      setIsSubmitting(true)
      setTxState('pending')
      
      let receipt

      if (selectedRole === Role.Examiner) {
        receipt = await registerExaminer({
          walletAddress,
          examinerId,
          courseCode
        })
      } else {
        receipt = await registerWithRole({
          walletAddress,
          userId: examinerId,
          userName: courseCode || examinerId,
          role: selectedRole as Role
        })
      }
      
      setTxHash(receipt.txHash || '')
      setTxState('success')
      
      // Clear form on success
      setWalletAddress('')
      setExaminerId('')
      setCourseCode('')
      setSelectedRole(Role.Examiner)
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Don't show error modal if user rejected
      if (isUserRejection(error)) {
        setTxState(null)
        return
      }
      
      setTxState('error')
      setErrorMessage(parseContractError(error))
    } finally {
      setIsSubmitting(false)
      setGasWarning('')
    }
  }

  const closeModal = () => {
    setTxState(null)
    setErrorMessage('')
    setTxHash('')
  }

  return (
    <div className="register-page">
      <TopBar />

      <div className="register-body">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        
        <div className="register-header">
          <p className="role-label">Admin</p>
          <h1 className="register-title">Register ID</h1>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">Wallet Address</label>
            <input
              className="form-input"
              type="text"
              placeholder="0x123..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Examiner/Staff ID</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter the ID"
              value={examinerId}
              onChange={(e) => setExaminerId(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Role</label>
            <select
              className="form-input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(Number(e.target.value))}
              disabled={isSubmitting}
              style={{ cursor: 'pointer' }}
            >
              <option value={Role.Student}>Student</option>
              <option value={Role.Examiner}>Examiner</option>
              <option value={Role.Admin}>Admin</option>
              <option value={Role.Staff}>Staff</option>
            </select>
          </div>

          <div className="form-row">
            <label className="form-label">Course Code / Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter the Course Code"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}
          {gasWarning && <p className="warning-text">{gasWarning}</p>}

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>

      <footer className="register-footer">GraduateID (GrID) Rights, (2025)</footer>

      {txState && (
        <TransactionStatus
          state={txState}
          txHash={txHash}
          chainId={31337}
          errorMessage={errorMessage}
          successMessage="Examiner registered successfully!"
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default RegisterID

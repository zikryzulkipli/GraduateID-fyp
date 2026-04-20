import { useState } from 'react'
import { revokeCredential, revokeCredentialWithReason, updateCredentialIpfsHash } from '../services/issueCredentialService'
import TopBar from './TopBar'
import './CredentialManagement.css'

interface CredentialManagementProps {
  onBack?: () => void
}

function CredentialManagement({ onBack }: CredentialManagementProps) {
  const [studentWallet, setStudentWallet] = useState('')
  const [credentialIndex, setCredentialIndex] = useState('')
  const [revokeReason, setRevokeReason] = useState('')
  const [newIpfsHash, setNewIpfsHash] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentWallet.trim() || !credentialIndex.trim()) {
      setError('Please fill all required fields')
      return
    }

    const confirmed = window.confirm('Are you sure you want to revoke this credential?')
    if (!confirmed) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await revokeCredential(studentWallet.trim(), parseInt(credentialIndex))
      setSuccess(`Credential revoked! Tx: ${result.txHash.slice(0, 10)}...`)
      setStudentWallet('')
      setCredentialIndex('')
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke credential')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeWithReason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentWallet.trim() || !credentialIndex.trim() || !revokeReason.trim()) {
      setError('Please fill all fields including reason')
      return
    }

    const confirmed = window.confirm('Are you sure you want to revoke this credential?')
    if (!confirmed) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await revokeCredentialWithReason(
        studentWallet.trim(),
        parseInt(credentialIndex),
        revokeReason.trim()
      )
      setSuccess(`Credential revoked with reason! Tx: ${result.txHash.slice(0, 10)}...`)
      setStudentWallet('')
      setCredentialIndex('')
      setRevokeReason('')
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke credential')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateHash = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentWallet.trim() || !credentialIndex.trim() || !newIpfsHash.trim()) {
      setError('Please fill all fields')
      return
    }

    const confirmed = window.confirm('Are you sure you want to update this credential IPFS hash?')
    if (!confirmed) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await updateCredentialIpfsHash(
        studentWallet.trim(),
        parseInt(credentialIndex),
        newIpfsHash.trim()
      )
      setSuccess(`Credential updated! Tx: ${result.txHash.slice(0, 10)}...`)
      setStudentWallet('')
      setCredentialIndex('')
      setNewIpfsHash('')
    } catch (err: any) {
      setError(err?.message || 'Failed to update credential')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="credential-management">
      <TopBar roleName="Admin" />
      
      <div className="management-container">
        <div className="management-header">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <h1>Credential Management</h1>
          <p className="subtitle">Revoke or update student credentials</p>
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Revoke Credential Section */}
        <div className="management-section">
          <h2>Revoke Credential</h2>
          <form onSubmit={handleRevoke}>
            <div className="form-group">
              <label>Student Wallet Address</label>
              <input
                type="text"
                value={studentWallet}
                onChange={(e) => setStudentWallet(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label>Credential Index</label>
              <input
                type="number"
                value={credentialIndex}
                onChange={(e) => setCredentialIndex(e.target.value)}
                placeholder="0, 1, 2..."
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn-danger" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Revoke Credential'}
            </button>
          </form>
        </div>

        {/* Revoke with Reason Section */}
        <div className="management-section">
          <h2>Revoke Credential with Reason</h2>
          <form onSubmit={handleRevokeWithReason}>
            <div className="form-group">
              <label>Student Wallet Address</label>
              <input
                type="text"
                value={studentWallet}
                onChange={(e) => setStudentWallet(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label>Credential Index</label>
              <input
                type="number"
                value={credentialIndex}
                onChange={(e) => setCredentialIndex(e.target.value)}
                placeholder="0, 1, 2..."
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label>Revocation Reason</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Enter reason for revocation..."
                disabled={isLoading}
                rows={3}
              />
            </div>
            <button type="submit" className="btn-danger" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Revoke with Reason'}
            </button>
          </form>
        </div>

        {/* Update IPFS Hash Section */}
        <div className="management-section">
          <h2>Update Credential IPFS Hash</h2>
          <form onSubmit={handleUpdateHash}>
            <div className="form-group">
              <label>Student Wallet Address</label>
              <input
                type="text"
                value={studentWallet}
                onChange={(e) => setStudentWallet(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label>Credential Index</label>
              <input
                type="number"
                value={credentialIndex}
                onChange={(e) => setCredentialIndex(e.target.value)}
                placeholder="0, 1, 2..."
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label>New IPFS Hash</label>
              <input
                type="text"
                value={newIpfsHash}
                onChange={(e) => setNewIpfsHash(e.target.value)}
                placeholder="Qm..."
                disabled={isLoading}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Hash'}
            </button>
          </form>
        </div>

        <div className="info-section">
          <h3>How to Use</h3>
          <ul>
            <li><strong>Credential Index:</strong> The position of the credential in the student's list (starts from 0)</li>
            <li><strong>Revoke:</strong> Marks credential as invalid, cannot be undone</li>
            <li><strong>Update Hash:</strong> Replace the IPFS hash if credential needs correction</li>
          </ul>
        </div>
      </div>

      <footer className="management-footer">
        GraduateID (GrID) Rights, (2025)
      </footer>
    </div>
  )
}

export default CredentialManagement

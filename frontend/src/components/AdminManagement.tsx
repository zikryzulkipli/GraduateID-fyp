import { useState, useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { addAdmin, removeAdmin, isUserAdmin, getOwner, transferOwnership } from '../services/graduateIdService'
import TopBar from './TopBar'
import './AdminManagement.css'

interface AdminManagementProps {
  onBack?: () => void
}

function AdminManagement({ onBack }: AdminManagementProps) {
  const { account } = useWallet()
  const [adminAddress, setAdminAddress] = useState('')
  const [checkAddress, setCheckAddress] = useState('')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ownerAddress, setOwnerAddress] = useState<string>('')
  const [newOwnerAddress, setNewOwnerAddress] = useState('')

  useEffect(() => {
    const checkOwner = async () => {
      try {
        const owner = await getOwner()
        setOwnerAddress(owner)
        if (account && owner.toLowerCase() === account.toLowerCase()) {
          setIsOwner(true)
        } else {
          setIsOwner(false)
        }
      } catch (err) {
        console.error('Failed to get owner:', err)
      }
    }
    if (account) {
      checkOwner()
    }
  }, [account])

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminAddress.trim()) {
      setError('Please enter an address')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await addAdmin(adminAddress.trim())
      setSuccess(`Admin added successfully! Tx: ${result.txHash.slice(0, 10)}...`)
      setAdminAddress('')
    } catch (err: any) {
      setError(err?.message || 'Failed to add admin')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminAddress.trim()) {
      setError('Please enter an address')
      return
    }

    const confirmed = window.confirm(`Are you sure you want to remove admin: ${adminAddress}?`)
    if (!confirmed) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await removeAdmin(adminAddress.trim())
      setSuccess(`Admin removed successfully! Tx: ${result.txHash.slice(0, 10)}...`)
      setAdminAddress('')
    } catch (err: any) {
      setError(err?.message || 'Failed to remove admin')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkAddress.trim()) {
      setError('Please enter an address to check')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await isUserAdmin(checkAddress.trim())
      setIsAdmin(result)
      setSuccess(`Address ${result ? 'IS' : 'IS NOT'} an admin`)
    } catch (err: any) {
      setError(err?.message || 'Failed to check admin status')
      setIsAdmin(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOwnerAddress.trim()) {
      setError('Please enter new owner address')
      return
    }

    const confirmed = window.confirm(
      `WARNING: Transfer ownership to ${newOwnerAddress}?\n\nThis action is PERMANENT. You will lose owner privileges!`
    )
    if (!confirmed) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const result = await transferOwnership(newOwnerAddress.trim())
      setSuccess(`Ownership transferred! Tx: ${result.txHash.slice(0, 10)}...`)
      setNewOwnerAddress('')
      // Refresh owner info
      const owner = await getOwner()
      setOwnerAddress(owner)
      if (account && owner.toLowerCase() === account.toLowerCase()) {
        setIsOwner(true)
      } else {
        setIsOwner(false)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer ownership')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="admin-management">
      <TopBar roleName="Admin" />
      
      <div className="admin-management-container">
        <div className="admin-management-header">
          {onBack && (
            <button className="back-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <h1>Admin Management</h1>
          <p className="subtitle">Owner-only: Add or remove system administrators</p>
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Add/Remove Admin Section */}
        <div className="admin-section">
          <h2>Add or Remove Admin</h2>
          <form onSubmit={handleAddAdmin}>
            <div className="form-group">
              <label>Wallet Address</label>
              <input
                type="text"
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>

            <div className="button-group">
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !adminAddress.trim()}
              >
                {isLoading ? 'Processing...' : 'Add Admin'}
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleRemoveAdmin}
                disabled={isLoading || !adminAddress.trim()}
              >
                {isLoading ? 'Processing...' : 'Remove Admin'}
              </button>
            </div>
          </form>
        </div>

        {/* Check Admin Status Section */}
        <div className="admin-section">
          <h2>Check Admin Status</h2>
          <form onSubmit={handleCheckAdmin}>
            <div className="form-group">
              <label>Wallet Address</label>
              <input
                type="text"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn-secondary"
              disabled={isLoading || !checkAddress.trim()}
            >
              {isLoading ? 'Checking...' : 'Check Status'}
            </button>

            {isAdmin !== null && (
              <div className={`status-badge ${isAdmin ? 'admin' : 'not-admin'}`}>
                {isAdmin ? 'IS ADMIN' : 'NOT ADMIN'}
              </div>
            )}
          </form>
        </div>

        {/* Transfer Ownership Section - Only show if user is owner */}
        {isOwner && (
          <div className="admin-section" style={{ borderColor: '#d32f2f' }}>
            <h2 style={{ color: '#d32f2f' }}>Transfer Ownership</h2>
            <p className="warning" style={{ color: '#d32f2f', marginBottom: '15px' }}>
              WARNING: This action is PERMANENT and cannot be undone!
            </p>
            <form onSubmit={handleTransferOwnership}>
              <div className="form-group">
                <label>New Owner Address</label>
                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className="btn-danger"
                disabled={isLoading || !newOwnerAddress.trim()}
              >
                {isLoading ? 'Processing...' : 'Transfer Ownership'}
              </button>
            </form>
          </div>
        )}

        {/* Current User Info */}
        <div className="admin-section info-section">
          <h3>Current Account</h3>
          <p><strong>Your Address:</strong> {account || 'Not connected'}</p>
          <p><strong>Contract Owner:</strong> {ownerAddress || 'Loading...'}</p>
          <p><strong>You are owner:</strong> {isOwner === null ? 'Checking...' : isOwner ? 'YES ✓' : 'NO ✗'}</p>
          <p className="note">Only the contract owner can add/remove admins</p>
          {isOwner === false && (
            <p className="warning" style={{ color: '#d32f2f', fontWeight: 'bold', marginTop: '10px' }}>
              ⚠️ You are NOT the owner. Switch to account: {ownerAddress}
            </p>
          )}
        </div>
      </div>

      <footer className="admin-management-footer">
        GraduateID (GrID) Rights, (2025)
      </footer>
    </div>
  )
}

export default AdminManagement

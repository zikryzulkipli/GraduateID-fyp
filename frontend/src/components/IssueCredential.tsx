import { useState, useRef, useEffect } from 'react'
import TopBar from './TopBar'
import './IssueCredential.css'
import { issueCredentialToStudent } from '../services/issueCredentialService'
import { useContract } from '../hooks/useContract'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { parseContractError, isUserRejection } from '../utils/errorParser'
import { checkSufficientBalance } from '../utils/gasEstimator'
import { useWallet } from '../context/WalletContext'
import { ethers } from 'ethers'
import TransactionStatus, { type TransactionState } from './TransactionStatus'

interface IssueCredentialProps {
  onBack?: () => void
}

function IssueCredential({ onBack }: IssueCredentialProps) {
  const { account: connectedWallet } = useWallet()
  const [studentWallet, setStudentWallet] = useState('')
  const [credentialName, setCredentialName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txState, setTxState] = useState<TransactionState | null>(null)
  const [txHash, setTxHash] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [ipfsHash, setIpfsHash] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [gasWarning, setGasWarning] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get contract and network guard
  const { contract, isLoading: contractLoading, error: contractError } = useContract('IssueCredential', 'write')
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)

  // Update error message when contract fails to load
  useEffect(() => {
    if (contractError) {
      setErrorMessage(parseContractError(contractError))
    }
  }, [contractError])

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!validTypes.includes(selectedFile.type)) {
      setErrorMessage('Only PDF, DOC, and DOCX files are allowed')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be less than 10 MB. Please choose a smaller file.')
      return
    }

    setFile(selectedFile)
    setErrorMessage('')
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTxState(null)
    setErrorMessage('')
    setTxHash('')
    setIpfsHash('')
    setGasWarning('')
    setUploadStatus('')

    if (!isCorrectNetwork) {
      setErrorMessage('Please switch to the correct network to issue credentials')
      return
    }

    if (!studentWallet.trim()) {
      setErrorMessage('Student wallet address is required')
      return
    }

    if (!ethers.isAddress(studentWallet)) {
      setErrorMessage('Invalid wallet address format')
      return
    }

    if (!credentialName.trim()) {
      setErrorMessage('Credential name is required')
      return
    }

    if (!file) {
      setErrorMessage('Please upload a credential file')
      return
    }

    if (!contract) {
      setErrorMessage('Contract not loaded. Please refresh the page and try again.')
      return
    }

    // Check gas before submitting
    if (connectedWallet) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const gasCheck = await checkSufficientBalance(
          provider,
          connectedWallet,
          { to: await contract.getAddress(), data: '0x' }
        )
        
        if (!gasCheck.hasSufficient) {
          setGasWarning(
            `Warning: Low balance (${gasCheck.balance} ETH). Estimated cost: ${gasCheck.estimatedCost} ETH. ` +
            `You may need to add more funds.`
          )
        }
      } catch (err) {
        console.warn('Gas estimation failed:', err)
      }
    }

    try {
      setIsSubmitting(true)
      setUploadProgress(0)
      setUploadStatus('Preparing file...')

      setTxState('pending')
      setUploadStatus('Uploading to IPFS...')
      
      // Call the service which handles IPFS upload + contract interaction
      const result = await issueCredentialToStudent({
        walletAddress: studentWallet,
        credentialName,
        file,
      })

      setUploadStatus('Complete!')
      
      setTxHash(result.txHash || '')
      setIpfsHash(result.ipfsHash || '')
      setTxState('success')
      
      // Direct issuance success message
      setSuccessMessage('Credential issued successfully! Student can now view it in their credentials.')
      
      // Reset form
      setStudentWallet('')
      setCredentialName('')
      setFile(null)
    } catch (error: any) {
      console.error('Credential issuance error:', error)
      
      // Don't show error modal if user rejected
      if (isUserRejection(error)) {
        setTxState(null)
        setUploadStatus('')
        setIsSubmitting(false)
        return
      }
      
      // Check if it's IPFS upload error
      if (error?.message?.toLowerCase().includes('ipfs') || error?.message?.toLowerCase().includes('upload')) {
        setErrorMessage('Failed to upload file to IPFS. Please check your connection and try again.')
      } else {
        setErrorMessage(parseContractError(error))
      }
      
      setTxState('error')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
      setGasWarning('')
      if (txState === 'success') {
        setUploadStatus('')
      }
    }
  }

  const closeModal = () => {
    setTxState(null)
    setErrorMessage('')
    setSuccessMessage('')
    setTxHash('')
    setIpfsHash('')
    setUploadStatus('')
  }

  return (
    <div className="issue-credential-page">
      <TopBar />

      <div className="issue-body">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        
        <div className="issue-header">
          <p className="role-label">Admin</p>
          <h1 className="issue-title">Issue Credentials and Achievements</h1>
        </div>

        {/* Show network error if on wrong network */}
        {!isCorrectNetwork && (
          <div style={{ 
            padding: '12px', 
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
                padding: '6px 12px',
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
            padding: '12px',
            marginBottom: '15px',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Loading contract...
          </div>
        )}

        <form className="issue-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="form-label">Student Wallet Address</label>
            <input
              className="form-input"
              type="text"
              placeholder="0x..."
              value={studentWallet}
              onChange={(e) => setStudentWallet(e.target.value)}
              disabled={contractLoading || !isCorrectNetwork}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Credential Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g., Bachelor of Information Technology"
              value={credentialName}
              onChange={(e) => setCredentialName(e.target.value)}
              disabled={contractLoading || !isCorrectNetwork}
            />
          </div>

          <div className="upload-section">
            <p className="upload-instruction">
              Insert the credentials to be issued below
              <br />
              (Upload or Drag)
            </p>

            <div
              className={`upload-area ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !contractLoading && !isSubmitting && fileInputRef.current?.click()}
              style={{ 
                opacity: contractLoading || isSubmitting ? 0.6 : 1,
                pointerEvents: contractLoading || isSubmitting ? 'none' : 'auto'
              }}
            >
              {file ? (
                <div className="file-preview">
                  <div className="file-icon"></div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon"></div>
                  <p>Click or drag file here</p>
                  <p className="upload-hint">PDF, DOC, DOCX only (Max 10 MB)</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <p>{uploadStatus || `${uploadProgress}% - Uploading...`}</p>
                <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', marginTop: '5px' }}>
                  <div style={{ 
                    height: '100%', 
                    backgroundColor: '#1976d2',
                    width: `${uploadProgress}%`,
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            {uploadStatus && uploadProgress === 100 && (
              <div style={{ marginTop: '10px', textAlign: 'center', color: '#1976d2' }}>
                {uploadStatus}
              </div>
            )}
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}
          {gasWarning && <p className="warning-text">{gasWarning}</p>}

          <div className="button-row">
            <button 
              type="submit" 
              className="primary-button" 
              disabled={isSubmitting || !isCorrectNetwork || contractLoading || !contract}
            >
              {isSubmitting ? (uploadStatus || 'Processing...') : 'Confirm Issuance'}
            </button>
          </div>
        </form>
      </div>

      <footer className="issue-footer">GraduateID (GrID) Rights, (2025)</footer>

      {txState && (
        <TransactionStatus
          state={txState}
          txHash={txHash}
          chainId={31337}
          errorMessage={errorMessage}
          successMessage={
            successMessage || (
              ipfsHash 
                ? `Credential issued successfully!\n\nIPFS Hash: ${ipfsHash}`
                : 'Credential issued successfully!'
            )
          }
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default IssueCredential

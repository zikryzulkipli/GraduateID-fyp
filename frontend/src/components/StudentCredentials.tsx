import { useState, useEffect } from 'react'
import TopBar from './TopBar'
import './StudentCredentials.css'
import { useContract } from '../hooks/useContract'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { useWallet } from '../context/WalletContext'
import { getCredentialsByWallet } from '../services/issueCredentialService'

type Credential = {
  id: string
  title: string
  type: 'certificate' | 'achievement'
  year: number
  issueDate: string
  description: string
  ipfsHash: string
  imageUrl?: string
}

type StudentCredentialsProps = {
  onBack: () => void
  onViewCredential: (credential: Credential) => void
}

function StudentCredentials({ onBack, onViewCredential }: StudentCredentialsProps) {
  const { account } = useWallet()
  const { contract, isLoading: contractLoading } = useContract('IssueCredential', 'read')
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false)
  const [credentialsError, setCredentialsError] = useState<string | null>(null)

  // Credentials loaded from blockchain
  const [credentials, setCredentials] = useState<Credential[]>([])

  // Load credentials from blockchain
  useEffect(() => {
    if (!contract || !account || !isCorrectNetwork) {
      return
    }

    const loadCredentials = async () => {
      try {
        setIsLoadingCredentials(true)
        setCredentialsError(null)
        
        // Fetch credentials from contract
        const fetchedCredentials = await getCredentialsByWallet(account)
        
        if (fetchedCredentials && fetchedCredentials.length > 0) {
          // Transform contract data to component format
          const formattedCredentials: Credential[] = fetchedCredentials.map((cred, index) => ({
            id: index.toString(),
            title: 'Issued Credential',
            type: 'certificate',
            year: new Date().getFullYear(),
            issueDate: new Date(Number(cred.dateIssued) * 1000).toLocaleDateString(),
            description: cred.credentialName,
            ipfsHash: cred.ipfsHash,
          }))
          
          setCredentials(prevCreds => [...prevCreds, ...formattedCredentials])
        }
      } catch (error: any) {
        console.error('Failed to load credentials:', error)
        // Treat BAD_DATA error (getAllCredentials not found) as no credentials yet
        if (error?.message?.includes('getAllCredentials') || error?.code === 'BAD_DATA') {
          setCredentialsError(null) // Don't show error, just empty state
        } else {
          setCredentialsError(error?.message || 'Failed to load credentials from blockchain')
        }
      } finally {
        setIsLoadingCredentials(false)
      }
    }

    loadCredentials()
  }, [contract, account, isCorrectNetwork])

  // Group credentials by year
  const credentialsByYear = credentials.reduce((acc, cred) => {
    if (!acc[cred.year]) {
      acc[cred.year] = []
    }
    acc[cred.year].push(cred)
    return acc
  }, {} as Record<number, Credential[]>)

  const years = Object.keys(credentialsByYear).map(Number).sort()

  return (
    <div className="student-credentials-page">
      <TopBar roleName="Student" />

      <div className="credentials-container">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>

        <div className="credentials-header">
          <h1 className="credentials-title">Credentials and Achievements</h1>
          <button className="export-all-btn">
            Export Credentials
          </button>
        </div>

        {/* Show network error if on wrong network */}
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

        {/* Show loading state */}
        {(contractLoading || isLoadingCredentials) && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Loading credentials from blockchain...
          </div>
        )}

        {/* Show "no credentials yet" message when empty */}
        {!credentialsError && !isLoadingCredentials && credentials.length === 0 && isCorrectNetwork && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #3b82f6'
          }}>
            <h2 style={{ color: '#1e40af', margin: '0 0 8px 0' }}>No credential yet!</h2>
            <p style={{ color: '#3b82f6', margin: 0, fontSize: '16px', fontWeight: '500' }}>Keep active!</p>
          </div>
        )}

        {/* Show error message */}
        {credentialsError && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            backgroundColor: '#fff3e0',
            color: '#f57c00',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {credentialsError}
          </div>
        )}

        {/* Timeline view */}
        <div className="timeline-container">
          <div className="timeline-years">
            {years.map((year) => (
              <div key={year} className="year-section">
                <div className="year-badge">{year}</div>
                <div className="year-credentials">
                  {credentialsByYear[year].map((cred) => (
                    <div 
                      key={cred.id} 
                      className="credential-preview"
                      onClick={() => onViewCredential(cred)}
                    >
                      <div className="credential-info">
                        <h3>{cred.title}</h3>
                        <p>{cred.description}</p>
                        {cred.type === 'achievement' && (
                          <span className="achievement-badge">Achievement</span>
                        )}
                        {cred.type === 'certificate' && (
                          <span className="certificate-badge">Certificate</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credential Cards Grid */}
        <div className="credentials-grid">
          <h2 className="section-title">All Credentials</h2>
          <div className="cards-grid">
            {credentials.map((cred) => (
              <div 
                key={cred.id} 
                className="credential-card"
                onClick={() => onViewCredential(cred)}
              >
                <div className="card-header">
                  <span className="card-type">
                    {cred.type === 'certificate' ? 'Certificate' : 'Achievement'}
                  </span>
                  <span className="card-year">{cred.year}</span>
                </div>
                {cred.imageUrl && (
                  <div className="card-preview">
                    <img src={cred.imageUrl} alt={cred.title} />
                  </div>
                )}
                <div className="card-body">
                  <h3>{cred.title}</h3>
                  <p>{cred.description}</p>
                  <span className="card-date">Issued: {cred.issueDate}</span>
                </div>
                <button className="view-btn">View Full Credential →</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="credentials-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default StudentCredentials
export type { Credential }

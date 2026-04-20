import { useState, useEffect } from 'react'
import './App.css'
import { useWalletConnection } from './hooks/useWalletConnection'
import { useIDRegistry } from './hooks/useIDRegistry'
import { getGraduateByAddress, registerStudent } from './services/graduateIdService'
import { Role, type RoleType } from './services/walletService'
import HashChecker from './components/HashChecker'
import Mainpage from './components/AdminMainpage.tsx'
import ExaminerMainpage from './components/ExaminerMainpage.tsx'
import ExaminerCreateExamRequest from './components/ExaminerCreateExamRequest.tsx'
import RegisterID from './components/RegisterID.tsx'
import IssueCredential from './components/IssueCredential.tsx'
import StudentMainpage from './components/StudentMainpage.tsx'
import OnlineExamVerification from './components/OnlineExamVerification.tsx'
import ExaminerVerification from './components/ExaminerVerification.tsx'
import StudentCredentials from './components/StudentCredentials.tsx'
import CredentialViewer from './components/CredentialViewer.tsx'
import AdminManagement from './components/AdminManagement.tsx'
import CredentialManagement from './components/CredentialManagement.tsx'
import type { Credential } from './components/StudentCredentials'

function App() {
  console.log('🚀 App component started')
  
  const [currentPage, setCurrentPage] = useState<'login' | 'hashChecker' | 'mainpage' | 'register' | 'issueCredential' | 'examVerification' | 'examinerVerificationRequests' | 'examinerCreateRequest' | 'credentials' | 'credentialViewer' | 'adminManagement' | 'credentialManagement'>('login')
  const [uniqueID, setUniqueID] = useState<string>('')
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  
  console.log('🔌 About to call useWalletConnection...')
  const {
    account,
    role,
    isConnected,
    isLoading,
    errorMessage,
    connectWallet,
    disconnectWallet,
  } = useWalletConnection()
  
  console.log('✅ useWalletConnection returned:', { account, role, isConnected, isLoading, errorMessage })

  // Fetch server-assigned ID from IDRegistry instead of localStorage
  const { uniqueID: serverID, idData, isLoading: idLoading } = useIDRegistry(account)

  useEffect(() => {
    const fetchGraduateID = async () => {
      if (account) {
        try {
          // First try to read from GraduateID (on-chain)
          const graduate = await getGraduateByAddress(account)
          if (graduate && graduate.ID) {
            setUniqueID(graduate.ID)
            console.log('✅ Graduate ID fetched:', graduate.ID)
            return
          }

          // If not registered yet, auto-register as Student with deterministic ID
          const generatedID = generateStudentID(account)
          const studentName = `Student ${account.slice(0, 6)}`
          try {
            console.log('📝 Auto-registering student with ID:', generatedID)
            await registerStudent({
              walletAddress: account,
              studentId: generatedID,
              studentName,
            })
            setUniqueID(generatedID)
            console.log('✅ Auto-registered student ID:', generatedID)
            return
          } catch (regError) {
            console.warn('⚠️ Auto-registration attempt failed (maybe already registered):', regError)
            // If auto-register failed, fallback to IDRegistry if present
          }

          if (serverID) {
            setUniqueID(serverID)
            console.log('✅ Server-assigned ID fetched:', serverID)
            return
          }

          // As a last resort, show generated ID even if not yet on-chain
          setUniqueID(generatedID)
          console.warn('⚠️ Showing generated ID (not yet on-chain):', generatedID)
        } catch (error) {
          console.error('Error fetching graduate ID:', error)
          if (serverID) {
            setUniqueID(serverID)
          } else if (account) {
            const fallbackID = generateStudentID(account)
            setUniqueID(fallbackID)
          }
        }
      }
    }

    fetchGraduateID()
  }, [serverID, account, idLoading])

  const navigateToHashChecker = () => {
    setCurrentPage('hashChecker')
  }

  const navigateToLogin = () => {
    setCurrentPage('login')
    disconnectWallet()
  }

  const navigateToMainpage = () => {
    setCurrentPage('mainpage')
  }

  const navigateToRegister = () => {
    setCurrentPage('register')
  }

  const navigateToIssueCredential = () => {
    setCurrentPage('issueCredential')
  }

  const navigateToExamVerification = () => {
    setCurrentPage('examVerification')
  }

  const navigateToExaminerVerificationRequests = () => {
    setCurrentPage('examinerVerificationRequests')
  }

  const navigateToExaminerCreateRequest = () => {
    setCurrentPage('examinerCreateRequest')
  }

  const navigateToCredentials = () => {
    setCurrentPage('credentials')
  }

  const navigateToCredentialViewer = (credential: Credential) => {
    setSelectedCredential(credential)
    setCurrentPage('credentialViewer')
  }

  const navigateToAdminManagement = () => {
    setCurrentPage('adminManagement')
  }

  const navigateToCredentialManagement = () => {
    setCurrentPage('credentialManagement')
  }

  // Deterministic student ID generator (mirrors useGraduateRole)
  const generateStudentID = (walletAddress: string): string => {
    const hash = walletAddress.toLowerCase()
    const prefix = hash.slice(2, 5).toUpperCase()
    const middle = parseInt(hash.slice(5, 11), 16) % 1000000
    return `AD${prefix}${middle.toString().padStart(6, '0')}`
  }

  // Show Mainpage (role-based)
  if (currentPage === 'mainpage' && isConnected) {
    if (role === Role.Admin) {
      return (
        <Mainpage
          onGoRegister={navigateToRegister}
          onGoIssueCredential={navigateToIssueCredential}
          onGoAdminManagement={navigateToAdminManagement}
          onGoCredentialManagement={navigateToCredentialManagement}
        />
      )
    }

    if (role === Role.Examiner) {
      return (
        <ExaminerMainpage
          onGoVerificationRequests={navigateToExaminerVerificationRequests}
          onGoCreateExamRequest={navigateToExaminerCreateRequest}
        />
      )
    }

    // Student role (default for non-admin addresses)
    if (role === Role.Student) {
      return (
        <StudentMainpage 
          onGoExamVerification={navigateToExamVerification}
          onGoCredentials={navigateToCredentials}
        />
      )
    }

    // Fallback: show hash checker for other roles until their pages exist
    return <HashChecker onBack={navigateToLogin} />
  }

  // Show HashChecker page
  if (currentPage === 'hashChecker') {
    return <HashChecker onBack={navigateToLogin} />
  }

  // Show Register ID page (admin)
  if (currentPage === 'register') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Admin) return (
                                <Mainpage onGoRegister={navigateToRegister} 
                                onGoIssueCredential={navigateToIssueCredential} />
                              )
    return <RegisterID onBack={navigateToMainpage} />
  }

  // Show Issue Credential page (admin)
  if (currentPage === 'issueCredential') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Admin) return <Mainpage onGoRegister={navigateToRegister} onGoIssueCredential={navigateToIssueCredential} />
    return <IssueCredential onBack={navigateToMainpage} />
  }

  // Show Exam Verification page (student)
  if (currentPage === 'examVerification') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Student) return <HashChecker onBack={navigateToLogin} />
    return <OnlineExamVerification onBack={navigateToMainpage} />
  }

  // Show Examiner Verification Requests page (examiner)
  if (currentPage === 'examinerVerificationRequests') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Examiner) return <HashChecker onBack={navigateToLogin} />
    return <ExaminerVerification onBack={navigateToMainpage} />
  }

  if (currentPage === 'examinerCreateRequest') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Examiner) return <HashChecker onBack={navigateToLogin} />
    return <ExaminerCreateExamRequest onBack={navigateToMainpage} />
  }

  // Show Student Credentials page (student)
  if (currentPage === 'credentials') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Student) return <HashChecker onBack={navigateToLogin} />
    return (
      <StudentCredentials 
        onBack={navigateToMainpage}
        onViewCredential={navigateToCredentialViewer}
      />
    )
  }

  // Show Credential Viewer page (student)
  if (currentPage === 'credentialViewer' && selectedCredential) {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Student) return <HashChecker onBack={navigateToLogin} />
    return (
      <CredentialViewer 
        credential={selectedCredential}
        onBack={navigateToCredentials}
      />
    )
  }

  // Show Admin Management page (admin)
  if (currentPage === 'adminManagement') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Admin) return <HashChecker onBack={navigateToLogin} />
    return <AdminManagement onBack={navigateToMainpage} />
  }

  // Show Credential Management page (admin)
  if (currentPage === 'credentialManagement') {
    if (!isConnected) return <HashChecker onBack={navigateToLogin} />
    if (role !== Role.Admin) return <HashChecker onBack={navigateToLogin} />
    return <CredentialManagement onBack={navigateToMainpage} />
  }

  const getRoleName = (role: RoleType): string => {
    switch (role) {
      case Role.Student:
        return 'Student'
      case Role.Examiner:
        return 'Examiner'
      case Role.Admin:
        return 'Admin'
      case Role.Staff:
        return 'Staff'
      default:
        return 'Not Registered'
    }
  }

  return (
    <div className="app-container">
      <div className="left-section">
        <div className="login-card">
          
          {!isConnected ? (
            <>
              <h2 className="welcome-section">Welcome</h2>

              <div className="connect-section">
                <h3>Connect your wallet to get started</h3>
                
                <button 
                  className="connect-button"
                  onClick={connectWallet}
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : '🔗 Connect Wallet'}
                </button>

                {errorMessage && (
                  <p className="error-message">{errorMessage}</p>
                )}
              </div>

              <div className="hash-checker-section">
                <p>Want to check credentials validity?</p>
                <button className="hash-checker-button" onClick={navigateToHashChecker}>
                  Hash Checker
                </button>
              </div>
            </>
          ) : (
            <div className="connected-section">
              <h2>✅ Wallet Connected</h2>
              
              <div className="account-info">
                <p className="label">Unique ID:</p>
                <p className="address">{uniqueID}</p>
                
                <p className="label">Wallet Address:</p>
                <p className="address">{account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
                
                <p className="label">Role:</p>
                <p className="role">{getRoleName(role)}</p>
              </div>

              <button 
                className="continue-button"
                onClick={navigateToMainpage}
              >
                Continue to Dashboard
              </button>

              <button 
                className="disconnect-button"
                onClick={navigateToLogin}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="right-section">
        <div className="branding">
          <h1>GraduateID</h1>
          <h2 className='info-apps'>Decentralised Digital Identity Wallet for Education & Hiring</h2>
          <p className="description">
            Secure, tamper-proof credentials on the blockchain. Issue, verify, and share educational achievements instantly.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

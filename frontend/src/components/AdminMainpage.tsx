import { useState } from 'react'
import TopBar from './TopBar'
import { useWallet } from '../context/WalletContext'
import { Role } from '../services/walletService'
import './AdminMainpage.css'

interface Credential {
  id: number
  title: string
  subtitle: string
  dueDate: string
}

interface Examiner {
  id: number
  name: string
  code: string
  subject: string
  date: string
  time: string
}

type MainpageProps = {
  onGoRegister?: () => void
  onGoIssueCredential?: () => void
  onGoAdminManagement?: () => void
  onGoCredentialManagement?: () => void
}

function Mainpage({ onGoRegister, onGoIssueCredential, onGoAdminManagement, onGoCredentialManagement }: MainpageProps) {
  const { role } = useWallet()
  const [credentialsToIssue] = useState<Credential[]>([])
  const [examinersList] = useState<Examiner[]>([])

  const getRoleName = (): string => {
    switch (role) {
      case Role.Admin:
        return 'Admin'
      case Role.Student:
        return 'Student'
      case Role.Examiner:
        return 'Examiner'
      case Role.Staff:
        return 'Staff'
      default:
        return 'User'
    }
  }

  return (
    <div className="mainpage">
      <TopBar roleName={getRoleName()} />

      <div className="mainpage-container">
        <h1 className="page-title">Welcome, <strong>{getRoleName()}</strong></h1>

        {/* Action Cards */}
        <div className="action-cards">
          <div className="action-card register-card" onClick={onGoRegister}>
            <h3>Register ID</h3>
            <p>Register examiners and staff</p>
          </div>

          <div className="action-card issue-card" onClick={onGoIssueCredential}>
            <h3>Issue Credentials</h3>
            <p>Issue digital certificates to students</p>
          </div>

          <div className="action-card admin-card" onClick={onGoAdminManagement}>
            <h3>Admin Management</h3>
            <p>Add/remove system admins</p>
          </div>

          <div className="action-card credential-mgmt-card" onClick={onGoCredentialManagement}>
            <h3>Credential Management</h3>
            <p>Revoke or update credentials</p>
          </div>
        </div>

        {/* Credentials Section */}
        <div className="credentials-section">
          <h2>To be issued:</h2>
          <div className="credentials-list">
            {credentialsToIssue.map((credential) => (
              <div key={credential.id} className="credential-item">
                <div className="credential-number">{credential.id}</div>
                <div className="credential-content">
                  <h4>{credential.title}</h4>
                  {credential.subtitle && <p className="subtitle">{credential.subtitle}</p>}
                  <p className="due-date">{credential.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Examiners Section */}
        <div className="examiners-section">
          <h2>Lists of Lecturers to be Examiners:</h2>
          <div className="examiners-list">
            {examinersList.map((examiner) => (
              <div key={examiner.id} className="examiner-item">
                <div className="examiner-header">
                  <h4>{examiner.name}</h4>
                  <span className="examiner-code">{examiner.code}</span>
                </div>
                <p className="examiner-subject">{examiner.subject}</p>
                <p className="examiner-datetime">
                  {examiner.date}, {examiner.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mainpage-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default Mainpage

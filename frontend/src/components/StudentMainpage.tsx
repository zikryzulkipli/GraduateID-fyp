import { useState, useEffect } from 'react'
import TopBar from './TopBar'
import './StudentMainpage.css'
import { useWallet } from '../context/WalletContext'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { getCredentialsByWallet } from '../services/issueCredentialService'

type ExamItem = {
  id: number
  course: string
  assessment: string
  datetime: string
}

type SemesterStat = {
  label: string
  gpa: string
  cgpa: string
}

type Achievement = {
  id: number
  title: string
  description?: string
}

type StudentMainpageProps = {
  onGoExamVerification?: () => void
  onGoCredentials?: () => void
}

function StudentMainpage({ onGoExamVerification, onGoCredentials }: StudentMainpageProps) {
  const { account } = useWallet()
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)
  const [upcomingExams] = useState<ExamItem[]>([])

  const [semesterStats] = useState<SemesterStat[]>([])

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false)

  useEffect(() => {
    const loadCredentials = async () => {
      if (!account || !isCorrectNetwork) return
      
      try {
        setIsLoadingCredentials(true)
        const creds = await getCredentialsByWallet(account)
        
        if (creds && creds.length > 0) {
          const formatted = creds.slice(0, 3).map((cred, idx) => ({
            id: idx + 1,
            title: cred.credentialName,
            description: `Issued: ${new Date(Number(cred.dateIssued) * 1000).toLocaleDateString()} • IPFS: ${cred.ipfsHash.slice(0, 12)}...`
          }))
          setAchievements(formatted)
        }
      } catch (err) {
        console.warn('Failed to load credentials preview:', err)
      } finally {
        setIsLoadingCredentials(false)
      }
    }

    loadCredentials()
  }, [account, isCorrectNetwork])

  return (
    <div className="student-mainpage">
      <TopBar roleName="Student" />

      <div className="student-container">
        <h1 className="page-title">Welcome, <strong>Student</strong></h1>

        {/* Action tiles */}
        <div className="student-actions">
          <div className="student-action-card progress">
            <div>
              <h3>Study Progress</h3>
              <p>Track GPA and course milestones</p>
            </div>
          </div>

          <div className="student-action-card credentials" onClick={onGoCredentials}>
            <div>
              <h3>Credentials and Achievements</h3>
              <p>View issued certificates and badges</p>
            </div>
          </div>

          <div className="student-action-card exams" onClick={onGoExamVerification}>
            <div>
              <h3>Online Examinations</h3>
              <p>See upcoming assessments and schedules</p>
            </div>
          </div>
        </div>

        {/* Upcoming exams */}
        <div className="student-section">
          <h2>Upcoming Online Examination:</h2>
          <div className="exam-list">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="exam-row">
                <div className="exam-number">{exam.id}</div>
                <div className="exam-content">
                  <div className="exam-title">{exam.course}</div>
                  <div className="exam-subtitle">{exam.assessment}</div>
                  <div className="exam-datetime">{exam.datetime}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GPA timeline */}
        <div className="student-section">
          <h2>Study Progress:</h2>
          <div className="timeline">
            {semesterStats.map((s, idx) => (
              <div className="timeline-item" key={`${s.label}-${idx}`}>
                <div className="dot" />
                <div className="timeline-text">
                  <div className="semester">{s.label}</div>
                  <div className="scores">GPA: {s.gpa} CGPA: {s.cgpa}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="student-section">
          <h2>Your Credentials and Achievements so far!</h2>
          {isLoadingCredentials ? (
            <div className="credential-loading">Loading credentials...</div>
          ) : achievements.length > 0 ? (
            <>
              <div className="achievement-grid">
                {achievements.map((a) => (
                  <div key={a.id} className="achievement-card" onClick={onGoCredentials}>
                    <div className="achievement-title">{a.title}</div>
                    {a.description && <div className="achievement-desc">{a.description}</div>}
                  </div>
                ))}
              </div>
              <div className="view-all-credentials" onClick={onGoCredentials}>
                View All Credentials →
              </div>
            </>
          ) : (
            <div className="no-credentials">No credentials issued yet. Check back later!</div>
          )}
        </div>
      </div>

      <footer className="student-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default StudentMainpage

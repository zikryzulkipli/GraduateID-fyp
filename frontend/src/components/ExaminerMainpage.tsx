import { useEffect, useState } from 'react'
import TopBar from './TopBar'
import { useWallet } from '../context/WalletContext'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { getExaminerCourse } from '../services/graduateIdService'
import './ExaminerMainpage.css'

type ExamItem = {
  id: number
  course: string
  assessment: string
  datetime: string
}

type ExaminerMainpageProps = {
  onGoVerificationRequests?: () => void
  onGoCreateExamRequest?: () => void
  onBack?: () => void
}

function ExaminerMainpage({ onGoVerificationRequests, onGoCreateExamRequest, onBack }: ExaminerMainpageProps) {
  const { account } = useWallet()
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)

  const [examList, setExamList] = useState<ExamItem[]>([])
  const [courseDisplay, setCourseDisplay] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      if (!account || !isCorrectNetwork) return
      try {
        const course = await getExaminerCourse(account)
        if (course) {
          setCourseDisplay(course)
          setExamList([
            {
              id: 1,
              course,
              assessment: 'Course Examiner',
              datetime: ''
            }
          ])
        }
      } catch (err) {
        console.warn('No examiner course found', err)
      }
    }

    load()
  }, [account, isCorrectNetwork])

  return (
    <div className="mainpage examiner-mainpage">
      <TopBar roleName="Examiner" />

      <div className="examiner-container">
        {onBack && (
          <button className="back-button" onClick={onBack}>
            ← Back
          </button>
        )}

        <h1 className="page-title">
          Welcome, <strong>Examiner</strong>
        </h1>

        {!isCorrectNetwork && (
          <div className="network-warning">
            Wrong network detected.
            <button onClick={switchToCorrectNetwork}>Switch to Localhost</button>
          </div>
        )}

        <div className="examiner-actions">
          <button className="verification-requests-btn" onClick={() => onGoVerificationRequests && onGoVerificationRequests()}>
            View Identity Verification Requests
          </button>
        </div>

        <div className="exam-card">
          <div className="exam-card-header">Online Exams Examiners:</div>
          {examList.map((exam) => (
            <div key={exam.id} className="exam-item">
              <div className="exam-item-content">
                <div className="exam-title">{exam.course}</div>
                <div className="exam-subtitle">{exam.assessment}</div>
                <div className="exam-datetime">{exam.datetime}</div>
                <div className="course-chip">Your course: {courseDisplay || 'Not registered'}</div>
              </div>
              <button className="create-exam-btn" onClick={() => onGoCreateExamRequest && onGoCreateExamRequest()}>
                Create Exam Request
              </button>
            </div>
          ))}
        </div>
      </div>

      <footer className="mainpage-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default ExaminerMainpage

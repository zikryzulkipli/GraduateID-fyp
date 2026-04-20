import { useEffect, useState } from 'react'
import TopBar from './TopBar'
import './ExaminerCreateExamRequest.css'
import { useWallet } from '../context/WalletContext'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { createExamRequestForStudent } from '../services/onlineExamService'
import { getExaminerCourse } from '../services/graduateIdService'

type ExaminerCreateExamRequestProps = {
  onBack?: () => void
}

type StudentInput = {
  address: string
  id: string
}

function ExaminerCreateExamRequest({ onBack }: ExaminerCreateExamRequestProps) {
  const { account } = useWallet()
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)

  const [students, setStudents] = useState<StudentInput[]>([
    { address: '', id: '' }
  ])
  const [course, setCourse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadCourse = async () => {
      if (!account || !isCorrectNetwork) return
      try {
        const courseCode = await getExaminerCourse(account)
        if (courseCode) {
          setCourse(courseCode)
        }
      } catch (err) {
        console.warn('No examiner course registered', err)
      }
    }

    loadCourse()
  }, [account, isCorrectNetwork])

  const handleStudentChange = (index: number, field: 'address' | 'id', value: string) => {
    const updated = [...students]
    updated[index][field] = value
    setStudents(updated)
  }

  const addStudentRow = () => {
    setStudents([...students, { address: '', id: '' }])
  }

  const removeStudentRow = (index: number) => {
    if (students.length > 1) {
      setStudents(students.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!isCorrectNetwork) {
      setErrorMessage('Please switch to the correct network')
      return
    }

    const validStudents = students.filter(s => s.address.trim() && s.id.trim())
    if (validStudents.length === 0) {
      setErrorMessage('Please enter at least one student address and ID')
      return
    }

    try {
      setIsSubmitting(true)
      let successCount = 0

      for (const student of validStudents) {
        try {
          await createExamRequestForStudent({
            studentAddress: student.address.trim(),
            studentId: student.id.trim(),
            examId: course
          })
          successCount++
        } catch (err: any) {
          console.error(`Failed for student ${student.id}:`, err)
        }
      }

      setSuccessMessage(`Successfully created ${successCount} exam request(s)`)
      setStudents([{ address: '', id: '' }])
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err?.message || 'Failed to create exam requests')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-exam-page">
      <TopBar roleName="Examiner" />

      <div className="create-exam-body">
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>

        <div className="create-header">
          <p className="role-label">Examiner</p>
          <h1 className="create-title">Create Exam Request</h1>
          <p className="subtitle">Pre-fill exam details for your students. They will see the request instantly.</p>
        </div>

        {!isCorrectNetwork && (
          <div className="network-callout">
            Wrong network detected.
            <button onClick={switchToCorrectNetwork}>Switch to Localhost</button>
          </div>
        )}

        {errorMessage && <div className="form-alert error">{errorMessage}</div>}
        {successMessage && <div className="form-alert success">{successMessage}</div>}

        <form className="create-exam-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Course Information</h3>
            <p className="course-display">Course Code: <strong>{course || 'Not registered'}</strong></p>
          </div>

          <div className="form-section">
            <h3>Add Students</h3>
            <div className="students-list">
              {students.map((student, index) => (
                <div key={index} className="student-row">
                  <div className="row-inputs">
                    <div className="form-row">
                      <label>Student Wallet Address</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="0x123..."
                        value={student.address}
                        onChange={(e) => handleStudentChange(index, 'address', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-row">
                      <label>Student ID</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="e.g., STU2025-001"
                        value={student.id}
                        onChange={(e) => handleStudentChange(index, 'id', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  {students.length > 1 && (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeStudentRow(index)}
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="add-more-btn"
              onClick={addStudentRow}
              disabled={isSubmitting}
            >
              + Add Another Student
            </button>

            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#f0f4f8',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#475569'
            }}>
              {students.length} student row(s) • {students.filter(s => s.address.trim() && s.id.trim()).length} ready to submit
            </div>
          </div>

          <div className="button-row">
            <button type="submit" className="create-primary-button" disabled={isSubmitting || !isCorrectNetwork}>
              {isSubmitting ? 'Creating...' : `Create Request(s)`}
            </button>
          </div>
        </form>
      </div>

      <footer className="create-exam-footer">GraduateID (GrID) Rights, (2025)</footer>
    </div>
  )
}

export default ExaminerCreateExamRequest

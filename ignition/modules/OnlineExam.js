/**
 * Hardhat Ignition Module: OnlineExam Contract Deployment
 * 
 * Deploys the OnlineExam contract which manages the online exam system
 * including exam creation, submission, and verification.
 * 
 * Dependencies: GraduateID (required for student verification)
 * Required by: None
 * 
 * The OnlineExam contract:
 * - Creates and manages online exams
 * - Registers student exam submissions with timestamps
 * - Stores IPFS hashes of exam answers and metadata
 * - Verifies student eligibility through GraduateID
 * - Tracks exam results and student performance
 * - Enables examiner verification of submitted exams
 */

const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules')

module.exports = buildModule('OnlineExamModule', (m) => {
  // Import the GraduateID contract from its module
  const { graduateID } = m.useModule(require('./GraduateID'))

  // Deploy OnlineExam contract with GraduateID address as constructor parameter
  // OnlineExam needs GraduateID to verify student eligibility
  const onlineExam = m.contract('OnlineExam', [graduateID])

  return { onlineExam }
})

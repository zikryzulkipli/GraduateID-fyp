/**
 * Hardhat Ignition Module: HashChecker Contract Deployment
 * 
 * Deploys the HashChecker contract which provides hash verification
 * utilities for validating credential documents and exam submissions.
 * 
 * Dependencies: IssueCredential (required for credential hash verification)
 * Required by: None
 * 
 * The HashChecker contract:
 * - Verifies IPFS document hashes against on-chain records
 * - Confirms credential authenticity and integrity
 * - Validates exam submission document hashes
 * - Provides proof of existence for documents on IPFS
 * - Supports batch hash verification for multiple documents
 * - Enables external verification services to check documents
 */

const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules')

module.exports = buildModule('HashCheckerModule', (m) => {
  // Import the IssueCredential contract from its module
  const { issueCredential } = m.useModule(require('./IssueCredential'))

  // Deploy HashChecker contract with IssueCredential address as constructor parameter
  // HashChecker needs IssueCredential to verify credential document hashes
  const hashChecker = m.contract('HashChecker', [issueCredential])

  return { hashChecker }
})

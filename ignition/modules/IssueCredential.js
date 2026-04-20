/**
 * Hardhat Ignition Module: IssueCredential Contract Deployment
 * 
 * Deploys the IssueCredential contract which issues verifiable credentials
 * for student qualifications stored on IPFS with on-chain references.
 * 
 * Dependencies: None (independent contract)
 * Required by: HashChecker
 * 
 * The IssueCredential contract:
 * - Creates verifiable credentials for graduates
 * - Stores IPFS hashes of credential documents on-chain
 * - Issues credentials with metadata and timestamps
 * - Manages issuer approval and credential distribution
 * - Supports credential revocation by authorized issuers
 */

const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules')

module.exports = buildModule('IssueCredentialModule', (m) => {
  // Deploy IssueCredential contract
  // This contract is independent and can be deployed alongside GraduateID
  const issueCredential = m.contract('IssueCredential')

  return { issueCredential }
})

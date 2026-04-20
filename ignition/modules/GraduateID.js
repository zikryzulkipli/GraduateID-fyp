/**
 * Hardhat Ignition Module: GraduateID Contract Deployment
 * 
 * Deploys the GraduateID contract which manages student registration
 * and credential ownership verification on the blockchain.
 * 
 * Dependencies: None (base contract)
 * Required by: OnlineExam
 * 
 * The GraduateID contract:
 * - Registers students with their unique IDs
 * - Issues certificates (NFT credentials) to graduates
 * - Tracks ownership of graduated credentials
 * - Manages role-based access (student/admin/registrar)
 */

const { buildModule } = require('@nomicfoundation/hardhat-ignition/modules')

module.exports = buildModule('GraduateIDModule', (m) => {
  // Deploy GraduateID contract
  // This is the foundational contract - no dependencies needed
  const graduateID = m.contract('GraduateID')

  return { graduateID }
})

/**
 * Verify that all contracts are properly deployed and linked
 * Tests contract connectivity and basic functionality
 * 
 * Usage: npx hardhat run scripts/verify-deployment.js --network localhost
 */

const hre = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🔍 Verifying contract deployment...\n')

  try {
    // ============================================================================
    // 1. Load deployed addresses
    // ============================================================================
    console.log('1️⃣  Loading deployed addresses...')
    const addressPath = path.join(__dirname, '../frontend/src/config/deployed-addresses.json')
    
    if (!fs.existsSync(addressPath)) {
      throw new Error(`Addresses file not found at ${addressPath}. Please run deploy-all.js first.`)
    }

    const addresses = JSON.parse(fs.readFileSync(addressPath, 'utf8'))
    console.log(`   ✅ Loaded addresses:`)
    console.log(`      GraduateID:      ${addresses.GraduateID}`)
    console.log(`      IssueCredential: ${addresses.IssueCredential}`)
    console.log(`      OnlineExam:      ${addresses.OnlineExam}`)
    console.log(`      HashChecker:     ${addresses.HashChecker}`)

    // ============================================================================
    // 2. Verify all contracts exist on chain
    // ============================================================================
    console.log('\n2️⃣  Verifying contracts exist on blockchain...')
    
    const contractNames = ['GraduateID', 'IssueCredential', 'OnlineExam', 'HashChecker']
    
    for (const name of contractNames) {
      const code = await ethers.provider.getCode(addresses[name])
      if (code === '0x') {
        throw new Error(`${name} not found at ${addresses[name]}`)
      }
      console.log(`   ✅ ${name} exists on chain`)
    }

    // ============================================================================
    // 3. Get contract instances
    // ============================================================================
    console.log('\n3️⃣  Getting contract instances...')
    
    const GraduateID = await ethers.getContractAt('GraduateID', addresses.GraduateID)
    const IssueCredential = await ethers.getContractAt('IssueCredential', addresses.IssueCredential)
    const OnlineExam = await ethers.getContractAt('OnlineExam', addresses.OnlineExam)
    const HashChecker = await ethers.getContractAt('HashChecker', addresses.HashChecker)
    
    console.log(`   ✅ All contract instances created`)

    // ============================================================================
    // 4. Verify contract linkage
    // ============================================================================
    console.log('\n4️⃣  Verifying contract linkage...')
    
    // OnlineExam should be linked to GraduateID
    const onlineExamGraduateID = await OnlineExam.graduateIDContract()
    if (onlineExamGraduateID.toLowerCase() !== addresses.GraduateID.toLowerCase()) {
      throw new Error(`OnlineExam not properly linked to GraduateID`)
    }
    console.log(`   ✅ OnlineExam correctly linked to GraduateID`)
    
    // HashChecker should be linked to IssueCredential
    const hashCheckerIssueCredential = await HashChecker.issueCredentialContract()
    if (hashCheckerIssueCredential.toLowerCase() !== addresses.IssueCredential.toLowerCase()) {
      throw new Error(`HashChecker not properly linked to IssueCredential`)
    }
    console.log(`   ✅ HashChecker correctly linked to IssueCredential`)

    // ============================================================================
    // 5. Test basic contract functionality
    // ============================================================================
    console.log('\n5️⃣  Testing basic contract functionality...')
    
    const [owner] = await ethers.getSigners()
    
    // Test GraduateID - get owner
    const graduateIDOwner = await GraduateID.owner()
    if (graduateIDOwner.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`GraduateID owner not set correctly`)
    }
    console.log(`   ✅ GraduateID owner verified`)
    
    // Test IssueCredential - get issuer
    const issueCredentialIssuer = await IssueCredential.issuer()
    if (issueCredentialIssuer.toLowerCase() !== owner.address.toLowerCase()) {
      throw new Error(`IssueCredential issuer not set correctly`)
    }
    console.log(`   ✅ IssueCredential issuer verified`)
    
    // Test OnlineExam exists and is callable
    const onlineExamOwner = await OnlineExam.owner()
    console.log(`   ✅ OnlineExam is callable`)
    
    // Test HashChecker exists and is callable
    const hashCheckerOwner = await HashChecker.owner()
    console.log(`   ✅ HashChecker is callable`)

    // ============================================================================
    // 6. Display success
    // ============================================================================
    console.log('\n' + '='.repeat(70))
    console.log('✅ ALL VERIFICATIONS PASSED ✅')
    console.log('='.repeat(70))
    console.log('\n🎉 Contracts are deployed and properly configured!')
    console.log('\n📋 Contract Addresses:')
    console.log(`   GraduateID:      ${addresses.GraduateID}`)
    console.log(`   IssueCredential: ${addresses.IssueCredential}`)
    console.log(`   OnlineExam:      ${addresses.OnlineExam}`)
    console.log(`   HashChecker:     ${addresses.HashChecker}`)
    console.log('\n🚀 Ready to:')
    console.log('   1. Update frontend/src/config/contracts.ts')
    console.log('   2. Start building services in Sprint 4')
    console.log('='.repeat(70) + '\n')

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED')
    console.error(error.message)
    process.exit(1)
  }
}

main()

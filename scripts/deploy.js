/**
 * Deploy all GraduateID smart contracts
 * Deploys contracts in correct order with proper linking
 * 
 * Usage: npx hardhat run scripts/deploy-all.js --network localhost
 */

const hre = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🚀 Starting contract deployment...')
  
  // Get deployer account
  const [deployer] = await ethers.getSigners()
  console.log(`📝 Deploying with account: ${deployer.address}`)
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`)

  const deployedAddresses = {}

  try {
    // ============================================================================
    // 1. Deploy GraduateID
    // ============================================================================
    console.log('\n1️⃣  Deploying GraduateID contract...')
    const GraduateID = await ethers.getContractFactory('GraduateID')
    const graduateID = await GraduateID.deploy()
    await graduateID.waitForDeployment()
    const graduateIDAddress = await graduateID.getAddress()
    
    console.log(`   ✅ GraduateID deployed at: ${graduateIDAddress}`)
    deployedAddresses.GraduateID = graduateIDAddress

    // Bootstrap: register deployer as Admin (both in graduates mapping and _admins mapping)
    console.log('   👤 Bootstrapping deployer as Admin...')
    
    // 1. Register deployer in graduates mapping with Admin role
    const registerTx = await graduateID.registerID(
      deployer.address,
      'ADMIN001',
      'System Administrator',
      3 // Role.Admin = 3 (None=0, Student=1, Examiner=2, Admin=3, Staff=4)
    )
    await registerTx.wait()
    console.log(`   ✅ Deployer registered as Admin: ${deployer.address}`)
    
    // 2. Add deployer to _admins mapping for permissions
    const addAdminTx = await graduateID.addAdmin(deployer.address)
    await addAdminTx.wait()
    console.log(`   ✅ Admin permissions granted: ${deployer.address}`)

    // ============================================================================
    // 2. Deploy IssueCredential
    // ============================================================================
    console.log('\n2️⃣  Deploying IssueCredential contract...')
    const IssueCredential = await ethers.getContractFactory('IssueCredential')
    const issueCredential = await IssueCredential.deploy(graduateIDAddress)
    await issueCredential.waitForDeployment()
    const issueCredentialAddress = await issueCredential.getAddress()
    
    console.log(`   ✅ IssueCredential deployed at: ${issueCredentialAddress}`)
    deployedAddresses.IssueCredential = issueCredentialAddress

    // ============================================================================
    // 3. Deploy OnlineExam (linked to GraduateID)
    // ============================================================================
    console.log('\n3️⃣  Deploying OnlineExam contract...')
    console.log(`   🔗 Linking to GraduateID at ${graduateIDAddress}`)
    
    const OnlineExam = await ethers.getContractFactory('OnlineExam')
    const onlineExam = await OnlineExam.deploy(graduateIDAddress)
    await onlineExam.waitForDeployment()
    const onlineExamAddress = await onlineExam.getAddress()
    
    console.log(`   ✅ OnlineExam deployed at: ${onlineExamAddress}`)
    deployedAddresses.OnlineExam = onlineExamAddress

    // ============================================================================
    // 4. Deploy IDRegistry (server-side ID assignment for security)
    // ============================================================================
    console.log('\n4️⃣  Deploying IDRegistry contract...')
    const IDRegistry = await ethers.getContractFactory('IDRegistry')
    const idRegistry = await IDRegistry.deploy()
    await idRegistry.waitForDeployment()
    const idRegistryAddress = await idRegistry.getAddress()
    console.log(`   ✅ IDRegistry deployed at: ${idRegistryAddress}`)
    deployedAddresses.IDRegistry = idRegistryAddress

    // ============================================================================
    // 5. Deploy HashChecker (linked to IssueCredential)
    // ============================================================================
    console.log('\n5️⃣  Deploying HashChecker contract...')
    console.log(`   🔗 Linking to IssueCredential at ${issueCredentialAddress}`)
    
    const HashChecker = await ethers.getContractFactory('HashChecker')
    const hashChecker = await HashChecker.deploy(issueCredentialAddress)
    await hashChecker.waitForDeployment()
    const hashCheckerAddress = await hashChecker.getAddress()
    
    console.log(`   ✅ HashChecker deployed at: ${hashCheckerAddress}`)
    deployedAddresses.HashChecker = hashCheckerAddress

    // ============================================================================
    // 5. Verify all contracts deployed
    // ============================================================================
    console.log('\n✔️  Verifying all contracts are deployed...')
    
    for (const [name, address] of Object.entries(deployedAddresses)) {
      const code = await ethers.provider.getCode(address)
      if (code === '0x') {
        throw new Error(`${name} not deployed at ${address}`)
      }
      console.log(`   ✅ ${name} verified`)
    }

    // ============================================================================
    // 6. Save addresses to file AND auto-update contracts.ts
    // ============================================================================
    console.log('\n💾 Saving deployed addresses...')
    
    // Save JSON file
    const outputPath = path.join(__dirname, '../frontend/src/config/deployed-addresses.json')
    fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2))
    console.log(`   ✅ Addresses saved to: ${outputPath}`)
    
    // Auto-update contracts.ts
    console.log('\n🔄 Auto-updating contracts.ts...')
    const contractsPath = path.join(__dirname, '../frontend/src/config/contracts.ts')
    const contractsContent = `/**
 * Contract address management for different networks
 * Stores and retrieves deployed contract addresses
 * 
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Updated by scripts/deploy.js on each deployment
 */

import type { ContractAddresses } from '../types'

export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
  localhost: {
    GraduateID: '${deployedAddresses.GraduateID}',
    IssueCredential: '${deployedAddresses.IssueCredential}',
    OnlineExam: '${deployedAddresses.OnlineExam}',
    HashChecker: '${deployedAddresses.HashChecker}',
    IDRegistry: '${deployedAddresses.IDRegistry}'
  },
  sepolia: {
    GraduateID: '',
    IssueCredential: '',
    OnlineExam: '',
    HashChecker: '',
    IDRegistry: ''
  },
  mainnet: {
    GraduateID: '',
    IssueCredential: '',
    OnlineExam: '',
    HashChecker: '',
    IDRegistry: ''
  }
}

export const getContractAddress = (network: string, contractName: keyof ContractAddresses): string => {
  const addresses = CONTRACT_ADDRESSES[network]
  if (!addresses) {
    throw new Error(\`Unsupported network: \${network}\`)
  }
  const address = addresses[contractName]
  if (!address) {
    throw new Error(\`Contract \${contractName} not deployed on \${network}\`)
  }
  return address
}
`
    fs.writeFileSync(contractsPath, contractsContent)
    console.log(`   ✅ contracts.ts updated automatically!`)

    // ============================================================================
    // 7. Display summary
    // ============================================================================
    console.log('\n' + '='.repeat(70))
    console.log('✨ DEPLOYMENT SUCCESSFUL ✨')
    console.log('='.repeat(70))
    console.log('\n📋 Deployed Contracts:')
    console.log(`   GraduateID:      ${deployedAddresses.GraduateID}`)
    console.log(`   IssueCredential: ${deployedAddresses.IssueCredential}`)
    console.log(`   OnlineExam:      ${deployedAddresses.OnlineExam}`)
    console.log(`   IDRegistry:      ${deployedAddresses.IDRegistry}`)
    console.log(`   HashChecker:     ${deployedAddresses.HashChecker}`)
    console.log('\n📝 Next steps:')
    console.log('   1. ✅ Contract addresses auto-updated in contracts.ts')
    console.log('   2. Run: npm run export:abis (if ABIs changed)')
    console.log('   3. Start frontend: cd frontend && npm run dev')
    console.log('='.repeat(70) + '\n')

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED')
    console.error(error)
    process.exit(1)
  }
}

main()

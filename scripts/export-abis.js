/**
 * Export Contract ABIs to Frontend
 * 
 * Automatically copies ABI JSON files from Hardhat artifacts to frontend/src/abi
 * Run after compiling contracts or when ABIs change
 * 
 * Usage: node scripts/export-abis.js
 *        or: npm run export:abis
 */

const fs = require('fs')
const path = require('path')

// Configuration
const CONTRACTS = [
  'GraduateID',
  'IssueCredential',
  'OnlineExam',
  'HashChecker',
  'IDRegistry'
]

const ARTIFACTS_DIR = path.join(__dirname, '../artifacts/contracts')
const OUTPUT_DIR = path.join(__dirname, '../frontend/src/abi')

/**
 * Extract ABI from compiled artifact
 */
function extractABI(contractName) {
  const artifactPath = path.join(ARTIFACTS_DIR, `${contractName}.sol`, `${contractName}.json`)
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`)
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
  return artifact.abi
}

/**
 * Save ABI to frontend
 */
function saveABI(contractName, abi) {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const outputPath = path.join(OUTPUT_DIR, `${contractName}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2))
  
  return outputPath
}

/**
 * Main execution
 */
async function main() {
  console.log('📦 Exporting Contract ABIs...\n')
  
  let successCount = 0
  let failCount = 0

  for (const contractName of CONTRACTS) {
    try {
      console.log(`📄 Processing ${contractName}...`)
      
      // Extract ABI from artifact
      const abi = extractABI(contractName)
      
      // Save to frontend
      const outputPath = saveABI(contractName, abi)
      
      console.log(`   ✅ Exported to: ${path.relative(process.cwd(), outputPath)}`)
      console.log(`   📊 ABI entries: ${abi.length}\n`)
      
      successCount++
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}\n`)
      failCount++
    }
  }

  // Summary
  console.log('='.repeat(70))
  if (failCount === 0) {
    console.log(`✨ Successfully exported ${successCount} ABIs`)
  } else {
    console.log(`⚠️  Exported ${successCount} ABIs with ${failCount} failures`)
  }
  console.log('='.repeat(70))
  
  if (failCount > 0) {
    console.log('\n💡 Tip: Run "npx hardhat compile" first if ABIs are missing')
    process.exit(1)
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Export failed:', error)
  process.exit(1)
})

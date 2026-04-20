/**
 * Check Roles and Admin Status
 * Verifies which accounts have admin permissions and their roles in GraduateID
 * 
 * Usage: npx hardhat run scripts/check-roles.js --network localhost
 */

const hre = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🔍 Checking Account Roles and Permissions...\n')
  
  try {
    // Get all available accounts
    const accounts = await ethers.getSigners()
    console.log(`📊 Found ${accounts.length} accounts in Hardhat\n`)

    // Read deployed contract addresses
    const addressesPath = path.join(__dirname, '../frontend/src/config/deployed-addresses.json')
    if (!fs.existsSync(addressesPath)) {
      console.error('❌ Deployed addresses not found. Please run deployment first.')
      return
    }

    const deployedAddresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'))
    const graduateIDAddress = deployedAddresses.GraduateID
    
    if (!graduateIDAddress) {
      console.error('❌ GraduateID address not found in deployed addresses')
      return
    }

    console.log(`📝 GraduateID Contract: ${graduateIDAddress}\n`)

    // Get GraduateID contract
    const GraduateID = await ethers.getContractFactory('GraduateID')
    const graduateID = GraduateID.attach(graduateIDAddress)

    // Get contract owner
    const owner = await graduateID.owner()
    console.log(`👑 Contract Owner: ${owner}\n`)

    console.log('=' .repeat(80))
    console.log('ACCOUNT ROLES AND PERMISSIONS')
    console.log('=' .repeat(80))

    // Check each account
    for (let i = 0; i < Math.min(accounts.length, 10); i++) {
      const account = accounts[i]
      const address = account.address
      
      console.log(`\n🔑 Account ${i}: ${address}`)
      
      // Check if owner
      if (address.toLowerCase() === owner.toLowerCase()) {
        console.log('   👑 IS CONTRACT OWNER')
      }

      // Check admin status in _admins mapping
      let isAdmin = false
      try {
        isAdmin = await graduateID.isUserAdmin(address)
        if (isAdmin) {
          console.log('   ✅ IS ADMIN (in _admins mapping)')
        } else {
          console.log('   ❌ NOT ADMIN (not in _admins mapping)')
        }
      } catch (err) {
        console.log('   ⚠️  Error checking admin status:', err.message)
      }

      // Check registration in graduates mapping
      try {
        const graduate = await graduateID.graduates(address)
        
        if (graduate.wallet === '0x0000000000000000000000000000000000000000') {
          console.log('   📋 NOT REGISTERED in graduates mapping')
        } else {
          console.log('   📋 REGISTERED in graduates mapping:')
          console.log(`      ID: ${graduate.ID}`)
          console.log(`      Name: ${graduate.name}`)
          
          // Decode role enum
          const roleNames = ['None', 'Student', 'Examiner', 'Admin', 'Staff']
          const roleName = roleNames[Number(graduate.role)] || 'Unknown'
          console.log(`      Role: ${roleName} (${graduate.role})`)
          console.log(`      Verified: ${graduate.isVerified}`)
        }
      } catch (err) {
        console.log('   ⚠️  Error checking graduate record:', err.message)
      }

      // Overall permission summary
      console.log('\n   📊 PERMISSION SUMMARY:')
      if (isAdmin && address.toLowerCase() === owner.toLowerCase()) {
        console.log('   ✅ FULL ACCESS (Owner + Admin)')
      } else if (isAdmin) {
        console.log('   ✅ CAN ISSUE CREDENTIALS (Admin)')
      } else if (address.toLowerCase() === owner.toLowerCase()) {
        console.log('   ⚠️  OWNER BUT NOT ADMIN (Can manage admins, but cannot issue credentials)')
      } else {
        console.log('   ❌ NO ADMIN ACCESS (Cannot issue credentials)')
      }
    }

    console.log('\n' + '=' .repeat(80))
    console.log('SUMMARY')
    console.log('=' .repeat(80))

    // Count admins
    let adminCount = 0
    for (let i = 0; i < Math.min(accounts.length, 10); i++) {
      const isAdmin = await graduateID.isUserAdmin(accounts[i].address)
      if (isAdmin) adminCount++
    }

    console.log(`\n👥 Total Admins (first 10 accounts): ${adminCount}`)
    console.log(`👑 Contract Owner: ${owner}`)
    
    console.log('\n💡 TO ADD MORE ADMINS:')
    console.log('   1. Use the contract owner account')
    console.log('   2. Call: graduateID.addAdmin(newAdminAddress)')
    console.log('   3. Or update deploy.js to register multiple admins at deployment')

    console.log('\n✅ Role check complete!\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 DEBUG: Checking Admin Status and Contract Links\n");
  console.log("=".repeat(70));

  // Get signers
  const [deployer, account1, account2] = await hre.ethers.getSigners();
  
  console.log("\n👤 WALLET ADDRESSES:");
  console.log("   Account 0 (Deployer):", deployer.address);
  console.log("   Account 1:          ", account1.address);
  console.log("   Account 2:          ", account2.address);

  // Read deployed addresses
  const addressesPath = path.join(__dirname, "../frontend/src/config/deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

  console.log("\n📝 DEPLOYED CONTRACT ADDRESSES:");
  console.log("   GraduateID:      ", addresses.GraduateID);
  console.log("   IssueCredential: ", addresses.IssueCredential);

  // Get contract instances
  const GraduateID = await hre.ethers.getContractAt("GraduateID", addresses.GraduateID);
  const IssueCredential = await hre.ethers.getContractAt("IssueCredential", addresses.IssueCredential);

  console.log("\n� ADMIN STATUS CHECK ON GRADUATEID:");
  for (const [name, signer] of [["Account 0", deployer], ["Account 1", account1], ["Account 2", account2]]) {
    const isAdmin = await GraduateID.isUserAdmin(signer.address);
    const graduate = await GraduateID.getGraduate(signer.address);
    console.log(`   ${name} (${signer.address}):`);
    console.log(`      isUserAdmin:    ${isAdmin ? "✅ TRUE" : "❌ FALSE"}`);
    console.log(`      Registered:     ${graduate.isRegistered ? "✅ YES" : "❌ NO"}`);
    if (graduate.isRegistered) {
      console.log(`      ID:             ${graduate.studentID}`);
      console.log(`      Role:           ${graduate.role}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✨ Debug complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

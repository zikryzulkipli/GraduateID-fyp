# New System Flows - Key Features

## Table of Contents
1. [Credential Issuance (Multi-Sig)](#1-credential-issuance-multi-sig)
2. [Credential Verification](#2-credential-verification)
3. [Exam Request & Verification (Multi-Exam)](#3-exam-request--verification-multi-exam)
4. [ID Assignment & Registration](#4-id-assignment--registration)
5. [Admin Key Rotation](#5-admin-key-rotation)

---

## 1. Credential Issuance (Multi-Sig)

### **Flow A: Direct Issuance (No Multi-Sig)**
*When MultiSigManager is not enabled or quorum not required*

```
Admin                  IssueCredential              Student
  |                           |                        |
  |--issueCredential()-------->|                        |
  |   (student, id, name,      |                        |
  |    issuer, hash, expiry)   |                        |
  |                           |---emit CredentialIssued-|
  |<--receipt---------------- |                        |
  |   (txHash, blocknum)      |                        |
```

**Code Example:**
```typescript
// In IssueCredential component
const { contract } = useWalletConnection()
const { issueCredential } = useCredentialManagement()

const handleIssue = async () => {
  const expiryDate = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60
  
  const tx = await issueCredential(
    studentAddress,           // 0x...
    'STU2024001',            // student ID
    "Bachelor's Degree",     // credential name
    adminAddress,            // issuer
    'QmHash...',            // IPFS hash
    expiryDate              // 2 years from now
  )
  
  console.log('Credential issued:', tx.hash)
}
```

**Storage Result:**
```solidity
// In IssueCredential.sol
credentials[hash] = {
  credentialName: "Bachelor's Degree",
  studentID: "STU2024001",
  studentWallet: 0x...,
  dateIssued: 1703000000,
  expiryDate: 1766139200,  // NEW: 2 years expiry
  issuer: 0x...AdminAddress,
  ipfsHash: "QmHash...",
  isValid: true,
  revokeReason: "",
  createdAt: blockTimestamp
}

_hashToStudent["QmHash..."] = "STU2024001"
_hashToCredential["QmHash..."] = { ...credential }  // NEW: Metadata index
```

---

### **Flow B: Multi-Sig Issuance**
*When MultiSigManager requires 2-of-N approvals before execution*

```
Admin1                    Admin2                    Admin3
  |                         |                         |
  |--proposeCredential()-->MultiSigManager------------>|
  |   (student, id, name,    |                         |
  |    issuer, hash, expiry) |                         |
  |<--proposalID--------     |                         |
  |   (ID: 0x1a2b...)       |                         |
  |                         |                         |
  |--approveProposal()------>|                         |
  |   (proposalID)          |                         |
  |<--approved--------       |                         |
  |                         |                         |
  |                         |--approveProposal()----->|
  |                         |   (proposalID)          |
  |                         |<--approved----------    |
  |                         |   (2/2 quorum met)     |
  |                         |                         |
  |--executeCredentialIssuance()-->IssueCredential   |
  |   (proposalID, student,                          |
  |    id, name, issuer,                             |
  |    hash, expiry)                                 |
  |                         |<--CredentialIssued     |
  |<--receipt--------       |                         |
```

**Code Example:**
```typescript
// Step 1: Admin1 proposes
const { proposeCredentialIssuance } = useMultiSigCredentials()

const proposalID = await proposeCredentialIssuance(
  studentAddress,
  'STU2024001',
  "Bachelor's Degree",
  adminAddress,
  'QmHash...',
  expiryDate
)
console.log('Proposed:', proposalID)

// Step 2: Admin2 approves
const { approveProposal } = useMultiSigCredentials()
await approveProposal(proposalID)

// Step 3: Admin3 approves (reaches quorum)
await approveProposal(proposalID)

// Step 4: Any admin executes
const { executeCredentialIssuance } = useMultiSigCredentials()
await executeCredentialIssuance(
  proposalID,
  studentAddress,
  'STU2024001',
  "Bachelor's Degree",
  adminAddress,
  'QmHash...',
  expiryDate
)
```

**MultiSigManager Storage:**
```solidity
proposals[0] = {
  proposer: 0x...Admin1,
  actionType: "issueCredential",
  payloadHash: keccak256(abi.encode(student, id, name...)),
  approvalCount: 3,
  hasApproved: {
    0x...Admin1: true,
    0x...Admin2: true,
    0x...Admin3: true
  },
  isExecuted: true,
  createdAt: blockTimestamp
}
```

---

## 2. Credential Verification

### **Employer Verification Flow**

```
Employer           HashChecker         IssueCredential        Graduate
   |                    |                    |                    |
   |--verifyHash()---->|                    |                    |
   |   (ipfsHash)      |--getCredentialBy..->|                    |
   |                   |   HashFields()     |                    |
   |                   |<--credential-------|                    |
   |<--metadata--------| (name, issuer,     |                    |
   |   (6-tuple)       |  dateIssued,       |                    |
   |                   |  expiryDate,       |                    |
   |                   |  isValid,          |                    |
   |                   |  studentWallet)    |                    |
```

**Code Example:**
```typescript
// In CredentialViewer component
const { metadata, isLoading } = useCredentialVerification('QmHash...')

if (metadata) {
  console.log('Credential Name:', metadata.credentialName)
  console.log('Issued Date:', new Date(metadata.dateIssued * 1000))
  console.log('Expiry Date:', 
    metadata.expiryDate > 0 
      ? new Date(metadata.expiryDate * 1000)
      : 'No expiry'
  )
  console.log('Issuer:', metadata.issuer)
  console.log('Valid:', metadata.isValid ? 'YES ✅' : 'NO ❌')
  console.log('Student Wallet:', metadata.studentWallet)
}
```

**Response Data:**
```typescript
interface CredentialMetadata {
  exists: boolean
  credentialName: string
  dateIssued: number           // seconds since epoch
  expiryDate: number           // seconds since epoch (0 = no expiry)
  issuer: string               // admin address
  isValid: boolean             // true if not revoked AND (no expiry OR not expired)
  studentWallet: string        // student address
}
```

### **Valid Credentials Only**

```
Student            IssueCredential        Frontend Hook
   |                    |                      |
   |--getValidCredentials()                   |
   |   (studentAddress)--|-->filter by:       |
   |                    |  - isValid: true   |
   |                    |  - not revoked     |
   |                    |  - not expired     |
   |<--[valid creds]------|--returns array---|
   |                       | of credentials  |
```

**Code Example:**
```typescript
// In StudentDashboard component
const { credentials, isLoading } = useValidCredentials(studentAddress)

return (
  <div>
    {credentials.map((cred, idx) => (
      <div key={idx}>
        <h4>{cred.credentialName}</h4>
        <p>Issued: {new Date(cred.dateIssued * 1000).toLocaleDateString()}</p>
        {cred.expiryDate > 0 && (
          <p>Expires: {new Date(cred.expiryDate * 1000).toLocaleDateString()}</p>
        )}
        <p>Status: ✅ Valid</p>
      </div>
    ))}
  </div>
)
```

**Automatic Filtering:**
- Only credentials with `isValid: true` returned
- Automatically excludes revoked credentials
- Automatically excludes expired credentials (compares `now > expiryDate`)
- No frontend filtering needed; contract handles logic

---

## 3. Exam Request & Verification (Multi-Exam)

### **Multiple Concurrent Exams Flow**

```
Student              OnlineExam              Examiner              Admin
   |                    |                       |                   |
   |--requestExam()---->|                       |                   |
   | (studentID,        |                       |                   |
   |  examID: 'CS101')  |                       |                   |
   |<--ExamRequested----|                       |                   |
   |                    |                       |                   |
   |--requestExam()---->|                       |                   |
   | (studentID,        |                       |                   |
   |  examID: 'MTH202') |                       |                   |
   |<--ExamRequested----|                       |                   |
   |                    |                       |                   |
   |                    |<--(examiner checks)---|                   |
   |                    |--generateOTP()------->|                   |
   |                    |  for CS101 exam      |                   |
   |<--OTP 'sent'------|                       |                   |
   |                    |                       |                   |
   |--verifyOTP()------>|                       |                   |
   | (examID: 'CS101',  |                       |                   |
   |  otp: 'abc123')   |                       |                   |
   |<--verified--------| (OTP valid, used, clear hash)             |
   |                    |                       |                   |
   |                    |                       |                   |
   |--verifyOTP()------>|                       |                   |
   | (examID: 'MTH202', |                       |                   |
   |  otp: 'def456')   |                       |                   |
   |<--verified--------| (OTP valid, used, clear hash)             |
   |                    |                       |                   |
   |<--BothExamsComplete-------------------------------------------|
```

**Storage State:**

```solidity
// examRequests[studentAddress][examID]
examRequests[0x...Student][CS101] = {
  status: Verified,
  otpHash: bytes32(0),           // cleared after verification
  otpUsed: true,
  createdAt: 1703000000,
  approvedAt: 1703001200,
  verifiedAt: 1703002400
}

examRequests[0x...Student][MTH202] = {
  status: Verified,
  otpHash: bytes32(0),           // cleared after verification
  otpUsed: true,
  createdAt: 1703000500,
  approvedAt: 1703001700,
  verifiedAt: 1703003100
}
```

**Code Example:**

```typescript
// In OnlineExamVerification component
const { 
  exams, 
  requestExam, 
  verifyOTP, 
  getOTPStatus,
  error 
} = useMultiExamVerification(studentAccount)

// Request multiple exams
const handleRequestCS101 = async () => {
  try {
    await requestExam('STU2024001', 'CS101')
    console.log('Requested CS101')
  } catch (err) {
    console.error(err.message)
  }
}

const handleRequestMTH202 = async () => {
  try {
    await requestExam('STU2024001', 'MTH202')
    console.log('Requested MTH202')
  } catch (err) {
    console.error(err.message)
  }
}

// Check status of specific exam
const handleCheckCS101Status = async () => {
  const status = await getOTPStatus('CS101')
  console.log('CS101 Status:', status)
  // { isValid: true, isUsed: false, isExpired: false }
}

// Verify specific exam OTP
const handleVerifyCS101 = async (otp: string) => {
  try {
    await verifyOTP('CS101', otp)
    console.log('CS101 verified!')
  } catch (err) {
    console.error(err.message)
  }
}

// UI
return (
  <div>
    <button onClick={handleRequestCS101}>Request CS101</button>
    <button onClick={handleRequestMTH202}>Request MTH202</button>
    
    <div>
      <h4>CS101 OTP</h4>
      <input 
        placeholder="Enter OTP"
        onKeyPress={(e) => {
          if (e.key === 'Enter') handleVerifyCS101(e.currentTarget.value)
        }}
      />
      <button onClick={handleCheckCS101Status}>Check Status</button>
    </div>
    
    <div>
      <h4>MTH202 OTP</h4>
      <input 
        placeholder="Enter OTP"
        onKeyPress={(e) => {
          if (e.key === 'Enter') handleVerifyOTP('MTH202', e.currentTarget.value)
        }}
      />
      <button onClick={() => getOTPStatus('MTH202')}>Check Status</button>
    </div>
  </div>
)
```

### **OTP Hardening: Failure Handling**

```
Student              OnlineExam
   |                    |
   |--verifyOTP()------>| Attempt 1
   | (otp: 'wrong')     |
   |<--FailedAttempt----|
   |   (attemptCount: 1) |
   |                    |
   |--verifyOTP()------>| Attempt 2
   | (otp: 'wrong')     |
   |<--FailedAttempt----|
   |   (attemptCount: 2) |
   |                    |
   |--verifyOTP()------>| Attempt 3
   | (otp: 'wrong')     |
   |<--LOCKED-----------|
   |                    | OTP hash cleared
   | Status: Rejected   | Status: Rejected
   |                    | Requires new request
```

**Hardening Mechanism:**

```solidity
function verifyOTP(string calldata _examID, string calldata _otp) external {
  ExamRequest storage exam = examRequests[msg.sender][_examID];
  
  if (exam.status != Approved) revert ExamNotApproved();
  if (exam.otpUsed) revert OTPAlreadyUsed();
  
  bytes32 hashedOTP = keccak256(abi.encodePacked(_otp));
  
  if (hashedOTP != exam.otpHash) {
    exam.attemptCount++;
    
    if (exam.attemptCount >= 3) {
      // HARDENING: Lock after 3 failures
      exam.otpHash = bytes32(0);        // Clear hash
      exam.status = Rejected;            // Mark as rejected
      // Student must request new exam
    }
    revert IncorrectOTP();
  }
  
  // Success path
  exam.otpUsed = true;
  exam.status = Verified;
  exam.otpHash = bytes32(0);  // Clear hash (cleanup)
  exam.verifiedAt = block.timestamp;
}
```

---

## 4. ID Assignment & Registration

### **Server-Side ID Assignment Flow**

```
Admin              IDRegistry           Student              Frontend
  |                    |                   |                    |
  |--assignID()------->|                   |                    |
  | (wallet, ID,       |                   |                    |
  |  type, metadata)   |                   |                    |
  |<--IDAssigned-------|                   |                    |
  |   event logged     |                   |                    |
  |                    |                   |                    |
  |                    |                   |--connects wallet   |
  |                    |                   |                    |
  |                    |<--(frontend)------|--useIDRegistry()   |
  |                    |   getID(wallet)   |                    |
  |                    |--returns--------->|--returns---------->|
  |                    | (ID, type, meta)  |   uniqueID         |
  |                    |                   |                    |
  |                    |                   |   App renders with  |
  |                    |                   |   server ID        |
```

**Code Example:**

```typescript
// Step 1: Admin assigns ID (backend/server)
// const tx = await idRegistry.assignID(
//   studentWalletAddress,
//   'STU2024001',
//   0,  // IDType.Student
//   'John Doe'
// )

// Step 2: Frontend fetches on app load
import { useIDRegistry } from './hooks/useIDRegistry'

export function App() {
  const { account } = useWalletConnection()
  const { uniqueID, idData, isLoading } = useIDRegistry(account)
  
  useEffect(() => {
    if (uniqueID) {
      setUserID(uniqueID)
      setUserType(idData.idType) // 0=Student, 1=Staff, 2=Examiner
      setUserMetadata(idData.metadata)
    }
  }, [uniqueID, idData])
  
  if (isLoading) return <p>Loading your ID...</p>
  if (!uniqueID) return <p>❌ No server-assigned ID found. Contact admin.</p>
  
  return (
    <main>
      <p>Welcome, {idData.metadata}!</p>
      <Dashboard userID={uniqueID} userType={idData.idType} />
    </main>
  )
}
```

**IDRegistry Storage:**

```solidity
// idAssignments[wallet]
idAssignments[0x...Student] = {
  uniqueID: "STU2024001",
  idType: 0,                      // Student
  issuedAt: 1703000000,
  isActive: true,
  metadata: "John Doe"
}

// idToWallet["STU2024001"] = 0x...Student (reverse lookup)
```

### **Security Advantage Over localStorage**

| Aspect | localStorage | IDRegistry |
|--------|-------------|-----------|
| **Persistence** | Client-side, can be cleared | On-chain, immutable |
| **Modification** | User can edit directly | Requires admin transaction |
| **Audit Trail** | No history | Event logs: IDAssigned |
| **Revocation** | No mechanism | `revokeID(wallet)` sets `isActive = false` |
| **Uniqueness** | Not enforced | `idToWallet` ensures no duplicates |
| **Sync Issues** | Local-only, out of sync | Single source of truth on-chain |

---

## 5. Admin Key Rotation

### **Key Rotation Process**

```
Current Admin        GraduateID           New Admin
      |                  |                   |
      |--transferOwnership()               |
      |  (newAdminAddress)                 |
      |<--OwnershipTransferred|            |
      |   event logged         |           |
      |   (oldAdmin, newAdmin) |           |
      |                       |           |
      |                       |--addAdmin(newAdmin)
      |                       |<--(new admin is added)
      |                       |           |
      |--removeAdmin()-------<--(current admin removes old)
      |<--removed-------------|           |
      |   (loses privileges)  |           |
```

**Code Example:**

```typescript
// Current admin initiates rotation
const { contract } = useWalletConnection()

const handleRotateKey = async (newAdminAddress: string) => {
  try {
    // Step 1: Transfer ownership
    const tx1 = await contract.GraduateID.transferOwnership(newAdminAddress)
    await tx1.wait()
    console.log('Ownership transferred')
    
    // Step 2: New admin adds themselves
    // (new admin connects to same app, calls addAdmin)
    
    // Step 3: Current admin removes themselves
    const tx2 = await contract.GraduateID.removeAdmin(currentAdminAddress)
    await tx2.wait()
    console.log('Current admin removed from list')
    
  } catch (err) {
    console.error('Key rotation failed:', err.message)
  }
}

return (
  <div>
    <h3>Admin Key Rotation</h3>
    <input 
      placeholder="New admin wallet address"
      onChange={(e) => setNewAdminAddress(e.currentTarget.value)}
    />
    <button onClick={() => handleRotateKey(newAdminAddress)}>
      Rotate Key
    </button>
  </div>
)
```

**Event Audit Log:**

```solidity
// Event emitted on rotation
event OwnershipTransferred(
  indexed address previousOwner,
  indexed address newOwner,
  uint256 timestamp
)

// Example: 0xOldAdmin -> 0xNewAdmin at block 18,500,000
```

**Multi-Sig Key Rotation (Enhanced):**

```
Admin1              MultiSigManager         Admin2              Admin3
  |                     |                     |                   |
  |--propose rotation---|                    |                   |
  |  (newAdmin)         |                    |                   |
  |<--proposalID--------|                    |                   |
  |                     |                    |                   |
  |--approve-----------|                    |                   |
  |                     |--approve------------|                   |
  |                     |<--quorum met----    |                   |
  |                     |                    |                   |
  |--execute-----------|--call GraduateID.transferOwnership()   |
  |                     |<--ownership transferred          |
  |<--rotation complete-|                    |                   |
```

---

## Data Model Summary

### **Credential Struct**
```solidity
struct Credential {
  string credentialName;
  string studentID;
  address studentWallet;
  uint256 dateIssued;
  uint256 expiryDate;        // NEW: 0 = no expiry
  address issuer;
  string ipfsHash;
  bool isValid;
  string revokeReason;       // NEW: Reason if revoked
  uint256 createdAt;
}
```

### **ExamRequest Struct**
```solidity
struct ExamRequest {
  address studentAddress;
  string studentID;
  ExamStatus status;         // Pending, Approved, Verified, Rejected
  bytes32 otpHash;
  bool otpUsed;
  uint256 attemptCount;      // NEW: Failure counter
  uint256 createdAt;
  uint256 approvedAt;
  uint256 verifiedAt;
}

// KEY CHANGE: mapping(address => mapping(string => ExamRequest))
// Now: mapping[studentAddress][examID] = ExamRequest
```

### **Admin/Multi-Sig Data**
```solidity
// GraduateID: Simple admin list
mapping(address => bool) _admins;
address owner;

// MultiSigManager: Proposal-based governance
struct Proposal {
  address proposer;
  string actionType;
  bytes32 payloadHash;
  uint256 approvalCount;
  mapping(address => bool) hasApproved;
  bool isExecuted;
  uint256 createdAt;
}

uint256 approvalsRequired;  // e.g., 2 for 2-of-N
```

### **IDRegistry Data**
```solidity
struct IDAssignment {
  string uniqueID;
  IDType idType;            // 0=Student, 1=Staff, 2=Examiner
  uint256 issuedAt;
  bool isActive;
  string metadata;          // e.g., student name
}

mapping(address => IDAssignment) idAssignments;
mapping(string => address) idToWallet;  // Enforce uniqueness
```

---

## Deployment Order

1. **Deploy GraduateID.sol** → Get GraduateID address
2. **Deploy IDRegistry.sol** → Owner = deployer
3. **Deploy MultiSigManager.sol** → Owner = deployer
4. **Deploy IssueCredential.sol** → Pass GraduateID address to constructor
5. **Deploy OnlineExam.sol** → Pass GraduateID address
6. **Deploy HashChecker.sol** → Pass IssueCredential address
7. **Run deploy.js bootstrap script** → Adds deployer to admin list

**See:** [hardhat.config.js](hardhat.config.js), [scripts/deploy.js](scripts/deploy.js)

---

## Testing Checklist

- [ ] Admin can assign ID via `IDRegistry.assignID()`
- [ ] Frontend fetches ID via `useIDRegistry()` hook
- [ ] Multi-sig: Propose → 2 approvals → Execute works
- [ ] Credential issued with expiry date
- [ ] Expired credentials filtered by `getValidCredentials()`
- [ ] Student can request CS101 and MTH202 simultaneously
- [ ] OTP verified independently per exam
- [ ] 3 failed OTP attempts lock exam (requires new request)
- [ ] Employer sees metadata via `verifyHashWithMetadata()`
- [ ] Key rotation: Transfer ownership → New admin → Old admin removed
- [ ] Events logged for all critical actions

All flows ready for integration testing! ✅

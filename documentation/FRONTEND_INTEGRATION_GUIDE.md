# GraduateID Frontend Integration Guide

## Overview

All smart contract improvements have been integrated into the frontend via new hooks and updated components. This guide explains the new integration points and how to use them.

---

## New Frontend Hooks

### 1. `useIDRegistry.ts` — Server-Side ID Management

**Purpose:** Fetch server-assigned unique ID from IDRegistry contract instead of client-side localStorage.

**Usage:**
```tsx
import { useIDRegistry } from './hooks/useIDRegistry'

function MyComponent() {
  const { uniqueID, idData, isLoading, error } = useIDRegistry(account)
  
  return (
    <div>
      {isLoading && <p>Loading ID...</p>}
      {idData && <p>ID: {idData.uniqueID} ({idData.metadata})</p>}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

**Returns:**
- `uniqueID`: The assigned ID string (e.g., "STU2024001")
- `idData`: Full assignment details (type, issuedAt, isActive, metadata)
- `isLoading`: Fetching state
- `error`: Error message if fetch failed

**Key Change:** No more localStorage. IDs are assigned by server (admin) via `IDRegistry.assignID()`.

---

### 2. `useCredentialManagement.ts` — Multi-Sig & Verification

#### `useMultiSigCredentials()`

**Purpose:** Handle proposal → approval → execution workflow for credential issuance.

**Usage:**
```tsx
import { useMultiSigCredentials } from './hooks/useCredentialManagement'

function AdminIssuePanel() {
  const {
    proposalID,
    proposeCredentialIssuance,
    approveProposal,
    executeCredentialIssuance,
    isProposing,
    isApproving,
    isExecuting,
    error,
  } = useMultiSigCredentials()

  const handlePropose = async () => {
    try {
      const pID = await proposeCredentialIssuance(
        '0xStudent...',
        'STU123',
        "Bachelor's Degree",
        '0xIssuer...',
        'QmHash...',
        Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 60 * 60 // 2 years expiry
      )
      console.log('Proposed:', pID)
    } catch (err) {
      console.error(err)
    }
  }

  const handleApprove = async () => {
    try {
      await approveProposal(proposalID)
      console.log('Approved!')
    } catch (err) {
      console.error(err)
    }
  }

  const handleExecute = async () => {
    try {
      await executeCredentialIssuance(
        proposalID,
        '0xStudent...',
        'STU123',
        "Bachelor's Degree",
        '0xIssuer...',
        'QmHash...',
        2 * 365 * 24 * 60 * 60
      )
      console.log('Executed!')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <button onClick={handlePropose} disabled={isProposing}>Propose</button>
      <button onClick={handleApprove} disabled={isApproving}>Approve</button>
      <button onClick={handleExecute} disabled={isExecuting}>Execute</button>
      {error && <p>{error}</p>}
    </div>
  )
}
```

**Key Change:** Credential issuance now requires `expiryDate` parameter (use 0 for no expiry).

---

#### `useCredentialVerification(ipfsHash)`

**Purpose:** Verify credential and fetch rich metadata (name, issuer, date, validity).

**Usage:**
```tsx
import { useCredentialVerification } from './hooks/useCredentialManagement'

function VerifyPanel() {
  const { metadata, isLoading, error } = useCredentialVerification('QmHash...')

  return (
    <div>
      {isLoading && <p>Verifying...</p>}
      {metadata && (
        <div>
          <p>Credential: {metadata.credentialName}</p>
          <p>Issued by: {metadata.issuer}</p>
          <p>Date: {new Date(metadata.dateIssued * 1000).toLocaleDateString()}</p>
          <p>Valid: {metadata.isValid ? '✅' : '❌'}</p>
        </div>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

**Returns:**
- `credentialName`: Name of the credential
- `ipfsHash`: IPFS hash
- `dateIssued`: Timestamp (in seconds)
- `expiryDate`: Expiry timestamp (0 = no expiry)
- `issuer`: Admin/issuer address
- `isValid`: Current validity status
- `studentWallet`: Student wallet address

---

#### `useValidCredentials(studentWallet)`

**Purpose:** Fetch only valid, non-expired credentials for a student.

**Usage:**
```tsx
import { useValidCredentials } from './hooks/useCredentialManagement'

function StudentDashboard() {
  const { credentials, isLoading, error } = useValidCredentials(studentAddress)

  return (
    <div>
      {credentials.map((cred, idx) => (
        <div key={idx}>
          <h4>{cred.credentialName}</h4>
          <p>Issued: {new Date(cred.dateIssued * 1000).toLocaleDateString()}</p>
          {cred.expiryDate > 0 && (
            <p>Expires: {new Date(cred.expiryDate * 1000).toLocaleDateString()}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

### 3. `useMultiExamVerification.ts` — Multiple Concurrent Exams

**Purpose:** Request, verify, and check status for multiple exams simultaneously.

**Usage:**
```tsx
import { useMultiExamVerification } from './hooks/useMultiExamVerification'

function StudentExamPanel() {
  const { exams, requestExam, getOTPStatus, verifyOTP, isLoading, error } = 
    useMultiExamVerification(studentAccount)

  const handleRequestCS101 = async () => {
    try {
      await requestExam('STU123', 'CS101')
      console.log('Requested CS101')
    } catch (err) {
      console.error(err)
    }
  }

  const handleVerifyCS101 = async (otp: string) => {
    try {
      await verifyOTP('CS101', otp)
      console.log('Verified CS101!')
    } catch (err) {
      console.error(err)
    }
  }

  const handleCheckStatus = async () => {
    const status = await getOTPStatus('CS101')
    console.log('CS101 OTP Status:', status) // { isValid, isUsed, isExpired }
  }

  return (
    <div>
      <button onClick={handleRequestCS101}>Request CS101</button>
      <button onClick={handleCheckStatus}>Check Status</button>
      <input type="text" placeholder="Enter OTP" onKeyPress={(e) => {
        if (e.key === 'Enter') handleVerifyCS101(e.currentTarget.value)
      }} />
      {error && <p>{error}</p>}
    </div>
  )
}
```

**Key Change:** `verifyOTP()` and `approveRequest()` now require `examID` parameter.

---

## Updated Components

### 1. `App.tsx` — Server-Side ID Integration

**Before (localStorage):**
```tsx
const storageKey = `staffID_${account}`
const existingID = localStorage.getItem(storageKey)
if (!existingID) {
  const newID = generateUniqueID(account)
  localStorage.setItem(storageKey, newID)
}
```

**After (IDRegistry):**
```tsx
const { uniqueID: serverID, idData, isLoading: idLoading } = useIDRegistry(account)
useEffect(() => {
  if (serverID) {
    setUniqueID(serverID)
  }
}, [serverID, account, idLoading])
```

**Impact:** 
- IDs are now immutable and server-assigned
- No client-side manipulation possible
- Admin uses `IDRegistry.assignID()` to provision IDs

---

### 2. `AdminMultiSigPanel.tsx` — New Admin Panel

**Purpose:** Interface for admins to view, approve, and execute multi-sig proposals.

**Features:**
- Load pending proposals
- View proposal details (action type, approvals, proposer)
- Approve proposals
- Manage governance quorum

**Usage:** Add to AdminMainpage:
```tsx
import AdminMultiSigPanel from './AdminMultiSigPanel'

export default function AdminMainpage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <AdminMultiSigPanel />
      {/* Other admin components */}
    </div>
  )
}
```

---

## Updated Component Signatures

### IssueCredential Component

**Old:**
```tsx
await issueCredential(studentWallet, studentID, credentialName, issuer, ipfsHash)
```

**New:**
```tsx
// Without multi-sig (direct)
await issueCredential(studentWallet, studentID, credentialName, issuer, ipfsHash, expiryDate)

// With multi-sig
const proposalID = await proposeCredentialIssuance(...)
await approveProposal(proposalID) // From other admins
await executeCredentialIssuance(proposalID, ...)
```

**Add to form:**
```tsx
const [expiryDate, setExpiryDate] = useState(0) // 0 = no expiry

const handleSetExpiry = () => {
  const years = 2
  const expiry = Math.floor(Date.now() / 1000) + years * 365 * 24 * 60 * 60
  setExpiryDate(expiry)
}
```

---

### OnlineExamVerification Component

**Old:**
```tsx
await requestExam(studentID, examID)
await getOTPStatus(studentAddress) // returns status for ANY exam
await verifyOTP(otp) // verifies ANY exam
```

**New:**
```tsx
await requestExam(studentID, examID)
await getOTPStatus(studentAddress, examID) // specific exam
await verifyOTP(examID, otp) // specific exam

// Now supports multiple concurrent exams:
await requestExam(studentID, 'CS101')
await requestExam(studentID, 'MTH202')
// Both can be in Pending → Approved → Verified states independently
```

---

### HashChecker Component

**Old:**
```tsx
const verified = await hashChecker.verifyHash(hash)
// Returns: true | false
```

**New:**
```tsx
const metadata = await hashChecker.verifyHashWithMetadata(hash)
// Returns: {
//   exists: bool,
//   credentialName: string,
//   dateIssued: number,
//   issuer: address,
//   isValid: bool,
//   studentWallet: address
// }
```

**Update UI:**
```tsx
{metadata && (
  <div>
    <p><strong>Credential:</strong> {metadata.credentialName}</p>
    <p><strong>Issued by:</strong> {metadata.issuer}</p>
    <p><strong>Date:</strong> {new Date(metadata.dateIssued * 1000).toLocaleDateString()}</p>
    <p><strong>Status:</strong> {metadata.isValid ? '✅ Valid' : '❌ Invalid'}</p>
    <p><strong>Holder:</strong> {metadata.studentWallet}</p>
  </div>
)}
```

---

## Configuration Updates

### `frontend/src/config/deployed-addresses.json`

Ensure all new contracts are included:

```json
{
  "GraduateID": "0x...",
  "IssueCredential": "0x...",
  "OnlineExam": "0x...",
  "MultiSigManager": "0x...",
  "IDRegistry": "0x...",
  "HashChecker": "0x..."
}
```

### `frontend/src/config/contracts.ts`

Add new contract ABIs:

```typescript
export const CONTRACTS = {
  GraduateID: { address: '...', abi: GraduateIDABI },
  IssueCredential: { address: '...', abi: IssueCredentialABI },
  OnlineExam: { address: '...', abi: OnlineExamABI },
  MultiSigManager: { address: '...', abi: MultiSigManagerABI },
  IDRegistry: { address: '...', abi: IDRegistryABI },
  HashChecker: { address: '...', abi: HashCheckerABI },
}
```

---

## Testing Checklist

- [ ] **ID Registry:** Admin assigns ID via `assignID()`, frontend fetches via `useIDRegistry()`
- [ ] **Multi-Sig Issuance:** Propose → Approve (from 2 admins) → Execute → Credential stored
- [ ] **Credential Expiry:** Issue with future expiry date, verify `getValidCredentials()` filters correctly
- [ ] **Multi-Exam:** Student requests CS101 and MTH202, verifies both independently
- [ ] **Hash Verification:** Employer calls `verifyHashWithMetadata()`, sees full details
- [ ] **OTP Hardening:** Student fails OTP 3 times, gets cooldown + OTP invalidated
- [ ] **Admin Rotation:** Owner transfers ownership, new owner can add admins

---

## Migration Notes

**For Existing Deployments:**

1. Deploy new contracts: `MultiSigManager`, `IDRegistry`
2. Update `IssueCredential` constructor to accept `GraduateID` address
3. Run `scripts/deploy.js` to bootstrap admin registry
4. Migrate IDRegistry assignments for existing users (backend task)
5. Update frontend hooks and components incrementally

**Backwards Compatibility:**

- Old credential issuance calls without `expiryDate` will fail (add default 0 or prompt user)
- Old exam request calls without `examID` keying will fail (frontend must be updated)
- Old hash checker calls return boolean (new calls return metadata)

---

## Summary

All improvements are now integrated into the frontend:

✅ Server-side ID assignment (IDRegistry)  
✅ Multi-sig credential workflow (MultiSigManager)  
✅ Credential expiry tracking  
✅ Multiple concurrent exam requests  
✅ Rich credential verification metadata  
✅ Admin multi-sig panel  

The system is ready for testing and deployment!

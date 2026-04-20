# GraduateID - Blockchain Credential and Verification System

GraduateID is a final year project that manages educational identity, credential issuance, and online exam verification using Ethereum smart contracts with a React frontend.

## Current System Snapshot

- Active smart contracts: 5
- Frontend stack: React 19 + TypeScript + Vite
- Blockchain stack: Hardhat + Solidity 0.8.28 + OpenZeppelin
- Storage model: on-chain credential metadata with IPFS hash references
- Deployment model: local-first workflow for Hardhat node and frontend integration

## Core Features

- Role-based identity management (Student, Examiner, Admin, Staff)
- Admin-controlled credential issuance with IPFS hash tracking
- Hash-based credential verification for third-party checks
- OTP-based online exam verification with cooldown after repeated failures
- Student and examiner dashboard flows in frontend components

## Active Smart Contracts

- contracts/GraduateID.sol: user registration, roles, admin management
- contracts/IssueCredential.sol: credential issue/revoke/update and query endpoints
- contracts/OnlineExam.sol: exam request lifecycle and OTP verification
- contracts/HashChecker.sol: public hash verification with metadata responses
- contracts/IDRegistry.sol: on-chain ID assignment and lookup

Note: artifacts and ABI folders may still include legacy files from previous revisions, but the active contracts in contracts/ are the source of truth.

## Project Structure

```text
contracts/                 Solidity contracts (source of truth)
scripts/                   Deploy, debug, ABI export, role checks
frontend/                  React app
frontend/src/abi/          ABI files consumed by frontend
frontend/src/components/   UI pages and feature components
documentation/             System guides and reference docs
```

## Quick Start (Local)

1. Install dependencies

```bash
npm install
cd frontend
npm install
cd ..
```

2. Start local blockchain

```bash
npm run node
```

3. In a second terminal, compile and deploy

```bash
npm run compile
npm run deploy:local
```

4. Export ABIs to frontend

```bash
npm run export:abis
```

5. Start frontend

```bash
cd frontend
npm run dev
```

Frontend URL: http://localhost:5173

## Root Commands

```bash
npm run node               # Start Hardhat local node
npm run compile            # Compile contracts
npm run deploy:local       # Deploy contracts to localhost
npm run verify:deployment  # Run deployment verification script
npm run export:abis        # Export contract ABIs to frontend/src/abi
npm run check:roles        # Check role state
npm run debug:admin        # Debug admin permissions
npm run setup:local        # Compile + export ABIs + deploy
```

## Frontend Commands

```bash
cd frontend
npm run dev                # Start Vite dev server
npm run build              # Production build
npm run lint               # Lint frontend
npm run preview            # Preview production build
```

## Main Flows

### Credential Issuance

1. Admin uploads credential file to IPFS (off-chain).
2. Admin submits credential metadata and IPFS hash on-chain via IssueCredential.
3. Student retrieves credentials from contract-backed frontend views.

### Exam Verification

1. Student requests exam verification (or examiner creates request).
2. Examiner approves request with hashed OTP.
3. Student submits OTP for on-chain verification.
4. Failed OTP attempts are rate-limited via cooldown logic.

### Employer Verification

1. Employer submits IPFS hash to hash verification view.
2. HashChecker queries IssueCredential state.
3. System returns validity and metadata.

## Documentation

- documentation/DOCUMENTATION_INDEX.md: entry point to all guides
- documentation/IMPLEMENTATION_STATUS.md: implementation and status tracking
- documentation/SECURITY_AND_IMPROVEMENTS.md: security improvements and known gaps
- documentation/FRONTEND_INTEGRATION_GUIDE.md: frontend integration details
- documentation/NEW_SYSTEM_FLOWS.md: end-to-end flow documentation
- documentation/QUICK_REFERENCE.md: commands and quick lookup tables
- documentation/FUTURE_IMPROVEMENTS.md: roadmap items

## Notes and Caveats

- The test folder currently exists as a scaffold and may need additional automated tests for full CI readiness.
- Some documentation files include historical references from earlier architecture phases; use contracts/ and scripts/ as operational truth.

## License

Educational project, Final Year Project 2026.

## Status

- Last updated: April 20, 2026
- Repository status: active development with working local deployment workflow

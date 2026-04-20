# GraduateID - Blockchain Credential System

A decentralized digital identity and credential management system for education built on Ethereum blockchain with IPFS storage.

## Core Features

✅ **Identity Management** - Role-based user registration (Student, Examiner, Admin, Staff)  
✅ **Credential Issuance** - Direct credential issuance with IPFS integration  
✅ **Verification System** - Hash-based credential verification for employers  
✅ **Online Exam Verification** - OTP-based exam identity verification with multi-student support 
✅ **IPFS Integration** - Decentralized storage via Pinata for credentials

## Smart Contracts

- **GraduateID.sol** - User registration, role management, multi-admin governance
- **IssueCredential.sol** - Credential issuance with IPFS hash storage
- **HashChecker.sol** - Credential authenticity verification
- **OnlineExam.sol** - OTP-based exam verification with request/approve flow
- **IDRegistry.sol** - Centralized ID assignment (optional)
- **MultiSigManager.sol** - Multi-signature admin governance (optional)

## Quick Start

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start local Hardhat node
npx hardhat node

# Deploy contracts (new terminal)
npm run deploy:local

# Export contract ABIs to frontend
npm run export:abis

# Start frontend dev server
cd frontend
npm run dev
```

Access at: http://localhost:5173

## Key Commands

```bash
# Smart Contract Development
npx hardhat compile              # Compile contracts
npx hardhat test                 # Run tests
npm run deploy:local             # Deploy to local network
npm run export:abis              # Export ABIs to frontend

# Frontend Development
cd frontend
npm run dev                      # Start dev server
npm run build                    # Production build

# Check admin status
npm run debug:admin

# Verify deployment
npm run verify:deployment
```

## 📚 Documentation

- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Complete project status and features
- **[SECURITY_AND_IMPROVEMENTS.md](SECURITY_AND_IMPROVEMENTS.md)** - Security improvements and resolutions
- **[FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md)** - Frontend development guide
- **[NEW_SYSTEM_FLOWS.md](NEW_SYSTEM_FLOWS.md)** - Complete system flow diagrams
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick command reference
- **[FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md)** - Planned enhancements and roadmap

## System Architecture

**Credential Issuance Flow:**
1. Admin uploads credential file → IPFS
2. IPFS hash + metadata stored on-chain
3. Student receives notification
4. Student views credential in dashboard

**Exam Verification Flow:**
1. Examiner creates exam request for student
2. Student requests OTP verification
3. Examiner approves → generates time-limited OTP
4. Student enters OTP to verify identity
5. System records verification on-chain

**Credential Verification (Third Party):**
1. Employer receives IPFS hash from student
2. Hash entered in verification portal
3. Blockchain confirms authenticity
4. Metadata displayed for validation

## Tech Stack Details

- **Solidity 0.8.x** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Secure contract libraries
- **React 18 + TypeScript** - Frontend framework
- **Ethers.js v6** - Blockchain interaction
- **Vite** - Fast build tool
- **IPFS/Pinata** - Decentralized storage

## Security & Compliance

✅ 11/12 security weaknesses resolved  
✅ Multi-admin governance implemented  
✅ Role-based access control  
✅ Time-limited OTP verification  
✅ Tamper-proof IPFS storage  
✅ Complete audit trail via events  
⏳ Multi-sig operations (optional enhancement)

See [SECURITY_AND_IMPROVEMENTS.md](SECURITY_AND_IMPROVEMENTS.md) for details.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a Pull Request

See [FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md) for enhancement ideas.

## License

Educational Project - Final Year Project 2026

## Support & Contact

- **Issues:** GitHub Issues
- **Documentation:** See files listed above
- **Future Features:** [FUTURE_IMPROVEMENTS.md](FUTURE_IMPROVEMENTS.md)

---

**Last Updated:** January 6, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready (Core Features Complete)

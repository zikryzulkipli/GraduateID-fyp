# 🔑 Pinata JWT Setup - Quick Reference

## 1️⃣ Get Your JWT Token

```
https://pinata.cloud → Login → API Keys → Create New Key → Copy JWT
```

**Example JWT (don't use this):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mbyI6e...
```

---

## 2️⃣ Add to .env File

**File location:** `frontend/.env`

```env
# Paste your JWT here:
VITE_PINATA_JWT=YOUR_JWT_TOKEN_HERE

# Gateway (optional, Pinata gateway is faster):
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

**Before:**
```env
VITE_PINATA_JWT=INSERT_YOUR_PINATA_JWT_HERE
```

**After:**
```env
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```

---

## 3️⃣ Restart Frontend

```bash
cd frontend
npm run dev
```

---

## 4️⃣ Test Upload

1. Login as Admin
2. Issue a credential (upload PDF)
3. **Console should show:**
   ```
   🔌 Using Pinata IPFS (cloud-based)
   📤 Uploading to IPFS: document.pdf
   ✅ Upload successful! CID: QmXyZ...
   ```

---

## 5️⃣ View PDF

1. Login as Student
2. View credential
3. PDF preview should load! ✅

---

## ⚠️ Important Notes

- **Do NOT share** your JWT token
- **Do NOT commit** `.env` file to git
- **Keep `.env.example`** for team reference
- **JWT expires** - if upload fails, generate new one

---

## 🔗 Useful Links

- Pinata Dashboard: https://pinata.cloud
- API Keys: https://pinata.cloud/api-keys
- Pinata Docs: https://docs.pinata.cloud/

---

**That's it! Your PDF preview should now work with real IPFS storage!** 🎉

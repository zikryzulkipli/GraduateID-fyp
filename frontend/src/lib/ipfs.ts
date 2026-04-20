/**
 * IPFS client integration for decentralized file storage
 * Handles uploading, downloading, and retrieving credential documents
 * 
 * Uses Pinata cloud IPFS (recommended) with local IPFS as fallback
 */

import { IPFS_GATEWAY_URL } from '../utils/constants'

/**
 * Upload a file to Pinata IPFS using REST API
 * This is the primary upload method - uses Pinata Files API directly
 * 
 * @param file - File object to upload
 * @returns Promise resolving to IPFS CID (hash)
 * @throws Error if upload fails
 */
async function uploadToPinata(file: File): Promise<string> {
  const pinataJwt = import.meta.env.VITE_PINATA_JWT
  
  if (!pinataJwt) {
    throw new Error('Pinata JWT not configured. Set VITE_PINATA_JWT in .env file.')
  }

  try {
    console.log(`📤 Uploading to Pinata: ${file.name} (${file.size} bytes)`)
    
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    
    // Add optional metadata
    formData.append('pinataMetadata', JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedAt: new Date().toISOString()
      }
    }))
    
    // Upload to Pinata Pinning API
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJwt}`
      },
      body: formData
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`Pinata API error: ${error.message || response.status}`)
    }
    
    const result = await response.json()
    const cid = result.IpfsHash
    
    console.log(`✅ Upload successful! CID: ${cid}`)
    return cid
  } catch (error: any) {
    console.error('❌ Pinata upload error:', error)
    throw new Error(`Failed to upload to Pinata: ${error.message}`)
  }
}

/**
 * Upload a file to local IPFS daemon (fallback)
 * Only used if Pinata JWT is not available
 * 
 * @param file - File object to upload
 * @returns Promise resolving to IPFS CID
 * @throws Error if upload fails
 */
async function uploadToLocalIPFS(file: File): Promise<string> {
  const ipfsApiUrl = import.meta.env.VITE_IPFS_API_URL || 'http://localhost:5001'
  
  try {
    console.log(`🖥️  Uploading to local IPFS: ${file.name}`)
    
    // Create FormData for local IPFS
    const formData = new FormData()
    formData.append('file', file)
    
    // Upload to local IPFS node
    const response = await fetch(`${ipfsApiUrl}/api/v0/add`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Local IPFS error: ${response.statusText}`)
    }
    
    const result = await response.json()
    const cid = result.Hash
    
    console.log(`✅ Upload successful! CID: ${cid}`)
    return cid
  } catch (error: any) {
    console.error('❌ Local IPFS upload error:', error)
    throw new Error(`Failed to upload to local IPFS: ${error.message}`)
  }
}

/**
 * Main upload function - tries Pinata first, falls back to local IPFS
 * Returns the CID (Content Identifier) which can be stored on blockchain
 * 
 * @param file - File object to upload (PDF, Word doc, etc.)
 * @returns Promise resolving to IPFS CID (hash)
 * @throws Error if both Pinata and local IPFS fail
 * 
 * @example
 * const file = fileInput.files[0]
 * const cid = await uploadToIPFS(file)
 * console.log(`File uploaded: ${cid}`)
 */
export async function uploadToIPFS(file: File): Promise<string> {
  const pinataJwt = import.meta.env.VITE_PINATA_JWT
  
  // Try Pinata first (recommended)
  if (pinataJwt) {
    console.log('🌐 Using Pinata IPFS (cloud-based)')
    return uploadToPinata(file)
  }
  
  // Fallback to local IPFS
  console.log('🖥️  Pinata JWT not found, falling back to local IPFS')
  return uploadToLocalIPFS(file)
}

/**
 * Download a file from IPFS via HTTP gateway
 * Tries multiple gateways as fallback for reliability
 * 
 * @param cid - IPFS Content Identifier (hash)
 * @returns Promise resolving to file content as Blob
 * @throws Error if download fails from all gateways
 * 
 * @example
 * const blob = await downloadFromIPFS('QmXyZ123...')
 * const url = URL.createObjectURL(blob)
 * window.open(url) // Open the document
 */
export async function downloadFromIPFS(cid: string): Promise<Blob> {
  // Multiple gateways to try as fallback
  const gateways = [
    getIPFSUrl(cid), // Primary gateway from config
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`
  ]
  
  let lastError: Error | null = null
  
  for (const url of gateways) {
    try {
      console.log(`📥 Trying to download from: ${url}`)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      console.log(`✅ Downloaded successfully from gateway: ${blob.size} bytes`)
      return blob
    } catch (error: any) {
      console.warn(`⚠️  Failed from this gateway: ${error.message}`)
      lastError = error
      // Continue to next gateway
    }
  }
  
  // All gateways failed
  console.error('❌ All IPFS gateways failed')
  throw new Error(`Failed to download file from IPFS (tried ${gateways.length} gateways): ${lastError?.message}`)
}

/**
 * Get IPFS gateway URL for a CID
 * Converts CID to a publicly accessible HTTP URL
 * 
 * @param cid - IPFS Content Identifier
 * @returns Full IPFS gateway URL
 * 
 * @example
 * const url = getIPFSUrl('QmXyZ123...')
 * // Returns: 'https://ipfs.io/ipfs/QmXyZ123...'
 */
export function getIPFSUrl(cid: string): string {
  return `${IPFS_GATEWAY_URL}${cid}`
}

/**
 * Upload file with metadata to IPFS
 * Uploads both file and metadata, returns both CIDs
 * 
 * @param file - File to upload
 * @param metadata - Additional metadata object
 * @returns Promise resolving to object with file CID and metadata CID
 * 
 * @example
 * const result = await uploadWithMetadata(file, {
 *   studentId: 'STU2025001',
 *   credentialType: 'Bachelor Degree',
 *   issueDate: Date.now()
 * })
 */
export async function uploadWithMetadata(
  file: File,
  metadata: Record<string, any>
): Promise<{ fileCID: string; metadataCID: string }> {
  try {
    // Upload the file first
    const fileCID = await uploadToIPFS(file)
    
    // Create metadata object with file reference
    const metadataWithFile = {
      ...metadata,
      fileCID,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: Date.now()
    }
    
    // Upload metadata as JSON
    const metadataJson = JSON.stringify(metadataWithFile)
    const metadataBlob = new Blob([metadataJson], { type: 'application/json' })
    const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' })
    const metadataCID = await uploadToIPFS(metadataFile)
    
    console.log(`📋 Metadata uploaded: ${metadataCID}`)
    
    return {
      fileCID,
      metadataCID
    }
  } catch (error: any) {
    console.error('❌ Error uploading with metadata:', error)
    throw new Error(`Failed to upload with metadata: ${error.message}`)
  }
}

/**
 * Download and parse metadata from IPFS
 * 
 * @param metadataCID - CID of the metadata JSON
 * @returns Promise resolving to parsed metadata object
 * 
 * @example
 * const metadata = await downloadMetadata(credential.metadataCID)
 * console.log(metadata.studentId)
 */
export async function downloadMetadata(metadataCID: string): Promise<Record<string, any>> {
  try {
    const blob = await downloadFromIPFS(metadataCID)
    const text = await blob.text()
    return JSON.parse(text)
  } catch (error: any) {
    console.error('❌ Error downloading metadata:', error)
    throw new Error(`Failed to download metadata: ${error.message}`)
  }
}

/**
 * Download a PDF from IPFS and convert to a URL for preview
 * Creates a blob URL that can be used with PDF viewers
 * 
 * @param cid - IPFS Content Identifier (hash)
 * @returns Promise resolving to Blob URL for PDF viewing
 * @throws Error if download fails
 * 
 * @example
 * const pdfUrl = await downloadPDFAsUrl('QmXyZ123...')
 * <Document file={pdfUrl} />
 */
export async function downloadPDFAsUrl(cid: string): Promise<string> {
  try {
    const blob = await downloadFromIPFS(cid)
    
    // Verify it's actually a PDF
    if (!blob.type.includes('pdf') && !blob.type.includes('octet-stream')) {
      console.warn('⚠️  File type may not be PDF:', blob.type)
    }
    
    // Create a blob URL for viewing
    const url = URL.createObjectURL(blob)
    console.log(`📄 PDF blob URL created for preview`)
    return url
  } catch (error: any) {
    console.error('❌ PDF download error:', error)
    throw new Error(`Failed to download PDF from IPFS: ${error.message}`)
  }
}

/**
 * Download file from IPFS via HTTP gateway (explicit gateway download)
 * Same as downloadFromIPFS but more explicit about using gateway
 * 
 * @param cid - IPFS Content Identifier
 * @returns Promise resolving to file content as Blob
 * 
 * @example
 * const blob = await downloadViaGateway('QmXyZ123...')
 * const url = URL.createObjectURL(blob)
 */
export async function downloadViaGateway(cid: string): Promise<Blob> {
  return downloadFromIPFS(cid)
}


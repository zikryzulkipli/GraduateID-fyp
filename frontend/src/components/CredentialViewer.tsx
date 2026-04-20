import { useEffect, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { jsPDF } from 'jspdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import TopBar from './TopBar'
import './CredentialViewer.css'
import { useNetworkGuard } from '../hooks/useNetworkGuard'
import { downloadPDFAsUrl, downloadViaGateway, getIPFSUrl } from '../lib/ipfs'
import type { Credential } from './StudentCredentials'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

type CredentialViewerProps = {
  credential: Credential
  onBack: () => void
}

function CredentialViewer({ credential, onBack }: CredentialViewerProps) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const { isCorrectNetwork, switchToCorrectNetwork } = useNetworkGuard(31337)

  // PDF viewer states
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadPDFFromIPFS()
  }, [credential.ipfsHash])

  const loadPDFFromIPFS = async () => {
    try {
      setIsLoadingDocument(true)
      setPdfLoadError(null)

      console.log('Loading PDF from IPFS:', credential.ipfsHash)

      // Try downloading via IPFS node first
      try {
        const url = await downloadPDFAsUrl(credential.ipfsHash)
        setPdfUrl(url)
        console.log('PDF loaded successfully from IPFS node')
      } catch (nodeError) {
        console.warn('IPFS node unavailable, trying gateway...', nodeError)

        // Fallback to IPFS gateway
        const blob = await downloadViaGateway(credential.ipfsHash)
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        console.log('PDF loaded successfully from IPFS gateway')
      }

      setShowPdfViewer(true)
    } catch (error: any) {
      console.error('Failed to load PDF:', error)
      setPdfLoadError(error.message || 'Failed to load PDF from IPFS')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const changePage = (offset: number) => {
    setPageNumber(prev => prev + offset)
  }

  const previousPage = () => changePage(-1)
  const nextPage = () => changePage(1)

  // Generate QR code image as data URL (lightweight public API)
  const fetchQrDataUrl = async (data: string) => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}`
    const response = await fetch(qrApiUrl)
    if (!response.ok) {
      throw new Error('Failed to generate QR code')
    }

    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read QR code data'))
      reader.readAsDataURL(blob)
    })
  }

  // Build a new PDF that appends a verification page with QR code
  const exportCredentialPdf = async () => {
    if (!pdfUrl) {
      throw new Error('PDF not loaded yet')
    }

    const pdfArrayBuffer = await fetch(pdfUrl).then(res => res.arrayBuffer())
    const sourcePdf = await pdfjs.getDocument({ data: pdfArrayBuffer }).promise

    let exportDoc: jsPDF | null = null
    let firstPageSize = { width: 612, height: 792 }

    // Render each page of the original credential into the new PDF
    for (let pageIndex = 1; pageIndex <= sourcePdf.numPages; pageIndex++) {
      const page = await sourcePdf.getPage(pageIndex)
      const viewport = page.getViewport({ scale: 1.5 })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: context as CanvasRenderingContext2D, viewport }).promise
      const imgData = canvas.toDataURL('image/jpeg', 0.98)

      if (!exportDoc) {
        exportDoc = new jsPDF({ unit: 'px', format: [viewport.width, viewport.height], compress: true })
        firstPageSize = { width: viewport.width, height: viewport.height }
      } else {
        exportDoc.addPage([viewport.width, viewport.height])
      }

      exportDoc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, '', 'FAST')
    }

    if (!exportDoc) {
      throw new Error('Failed to prepare export document')
    }

    const verificationUrl = `${window.location.origin}/verify?hash=${credential.ipfsHash}`
    const qrDataUrl = await fetchQrDataUrl(verificationUrl)

    // Add verification page at the end
    exportDoc.addPage([firstPageSize.width, firstPageSize.height])
    exportDoc.setFontSize(18)
    exportDoc.text('Credential Verification', 40, 60)

    exportDoc.setFontSize(12)
    exportDoc.text(`Credential: ${credential.title}`, 40, 90, { maxWidth: firstPageSize.width - 80 })
    exportDoc.text(`Issued: ${credential.issueDate}`, 40, 110)
    exportDoc.text(`IPFS Hash: ${credential.ipfsHash}`, 40, 130, { maxWidth: firstPageSize.width - 80 })
    exportDoc.text('Scan the QR code to verify this credential on-chain.', 40, 160, { maxWidth: firstPageSize.width - 80 })

    const qrSize = 180
    exportDoc.addImage(qrDataUrl, 'PNG', 40, 190, qrSize, qrSize)
    exportDoc.text('Verification URL:', 40, 190 + qrSize + 30)
    exportDoc.text(verificationUrl, 40, 190 + qrSize + 45, { maxWidth: firstPageSize.width - 80 })

    exportDoc.save(`${credential.title}-verified.pdf`)
  }

  const handleExport = async () => {
    if (!isCorrectNetwork) {
      setPdfLoadError('Please switch to the correct network')
      return
    }

    try {
      setIsLoadingDocument(true)
      setPdfLoadError(null)

      await exportCredentialPdf()

      setShowExportModal(true)
      setTimeout(() => setShowExportModal(false), 1200)
    } catch (error: any) {
      console.error(error)
      setPdfLoadError(error?.message || 'Failed to export credential')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  return (
    <div className="credential-viewer-page">
      <TopBar roleName="Student" />

      <div className="viewer-container">
        <button className="back-button" onClick={onBack}>
          ← Back to Credentials
        </button>

        <div className="viewer-header">
          <h1 className="viewer-title">{credential.title}</h1>
          <button className="export-credential-btn" onClick={handleExport}>
            Export Credential
          </button>
        </div>

        <div className="credential-full-view">
          <div className="credential-meta">
            <div className="meta-item">
              <span className="meta-label">Type:</span>
              <span className="meta-value">
                {credential.type === 'certificate' ? 'Certificate' : 'Achievement'}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Issue Date:</span>
              <span className="meta-value">{credential.issueDate}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">IPFS Hash:</span>
              <span className="meta-value ipfs-hash">{credential.ipfsHash}</span>
            </div>
          </div>

          {/* PDF Viewer Section */}
          {isLoadingDocument && (
            <div className="pdf-loading">
              <div className="loading-spinner"></div>
              <p>Loading document from IPFS...</p>
            </div>
          )}

          {pdfLoadError && (
            <div className="pdf-error">
              <p className="error-icon">⚠️</p>
              <p className="error-message">{pdfLoadError}</p>
              <button 
                className="retry-btn"
                onClick={loadPDFFromIPFS}
              >
                Retry Loading
              </button>
              <a 
                href={getIPFSUrl(credential.ipfsHash)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="gateway-link"
              >
                Open in IPFS Gateway
              </a>
            </div>
          )}

          {showPdfViewer && pdfUrl && !isLoadingDocument && !pdfLoadError && (
            <div className="pdf-viewer-container">
              <div className="pdf-controls">
                <button 
                  onClick={previousPage} 
                  disabled={pageNumber <= 1}
                  className="pdf-nav-btn"
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {pageNumber} of {numPages || '...'}
                </span>
                <button 
                  onClick={nextPage} 
                  disabled={pageNumber >= (numPages || 1)}
                  className="pdf-nav-btn"
                >
                  Next →
                </button>
              </div>
              
              <div className="pdf-document-wrapper">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => {
                    console.error('PDF load error:', error)
                    setPdfLoadError('Failed to render PDF. The file may be corrupted.')
                  }}
                  loading={
                    <div className="pdf-loading">
                      <div className="loading-spinner"></div>
                      <p>Rendering PDF...</p>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="pdf-page"
                  />
                </Document>
              </div>

              <div className="pdf-actions">
                <a 
                  href={pdfUrl} 
                  download={`${credential.title}.pdf`}
                  className="download-pdf-btn"
                >
                  ⬇ Download PDF
                </a>
                <a 
                  href={getIPFSUrl(credential.ipfsHash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="view-ipfs-btn"
                >
                  🌐 View on IPFS
                </a>
              </div>
            </div>
          )}

          {/* Fallback to image/placeholder if no PDF */}
          {!showPdfViewer && !isLoadingDocument && (
            <div className="credential-preview-large">
              {credential.imageUrl ? (
                <img src={credential.imageUrl} alt={credential.title} />
              ) : (
                <div className="credential-placeholder">
                  <div className="placeholder-icon">📄</div>
                  <p>{credential.title}</p>
                  <p className="placeholder-desc">{credential.description}</p>
                </div>
              )}
            </div>
          )}

          <div className="credential-description">
            <h3>Description</h3>
            <p>{credential.description}</p>
          </div>
        </div>
      </div>

      {/* Export Success Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="success-icon">✓</div>
            <h2 className="modal-title">Credential Exported with Verification</h2>
          </div>
        </div>
      )}

      <footer className="viewer-footer">
        <p>GraduateID (GrID) Rights, (2025)</p>
      </footer>
    </div>
  )
}

export default CredentialViewer

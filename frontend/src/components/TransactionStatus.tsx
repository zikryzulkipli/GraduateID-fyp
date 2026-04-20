/**
 * TransactionStatus Component
 * Displays transaction status, hash, and block explorer link
 * Provides consistent UX for all blockchain transactions
 */

import { getNetworkById } from '../config/networks'
import './TransactionStatus.css'

export type TransactionState = 'pending' | 'success' | 'error'

interface TransactionStatusProps {
  /** Current state of the transaction */
  state: TransactionState
  
  /** Transaction hash (optional, shown in success state) */
  txHash?: string
  
  /** Chain ID for block explorer link */
  chainId?: number
  
  /** Error message to display */
  errorMessage?: string
  
  /** Success message (default: "Transaction successful") */
  successMessage?: string
  
  /** Callback when user closes the status display */
  onClose?: () => void
  
  /** Whether to auto-dismiss after success (ms, default: 0 = no auto-dismiss) */
  autoDismissMs?: number
}

function TransactionStatus({
  state,
  txHash,
  chainId = 31337,
  errorMessage = 'Transaction failed',
  successMessage = 'Transaction successful',
  onClose,
  autoDismissMs = 0
}: TransactionStatusProps) {
  // Auto-dismiss on success if configured
  if (state === 'success' && autoDismissMs > 0 && onClose) {
    setTimeout(() => {
      onClose()
    }, autoDismissMs)
  }

  // Get block explorer URL
  const getExplorerUrl = (): string => {
    if (!txHash) return ''
    
    const network = getNetworkById(chainId)
    if (!network || !network.explorer) {
      return '' // No explorer for localhost
    }
    
    return `${network.explorer}/tx/${txHash}`
  }

  const explorerUrl = getExplorerUrl()

  return (
    <div className={`tx-status tx-status--${state}`}>
      <div className="tx-status__content">
        {onClose && (
          <button className="tx-status__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}

        <div className="tx-status__icon">
          {state === 'pending' && (
            <svg className="tx-status__spinner" viewBox="0 0 50 50" width="50" height="50">
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#D4A017"
                strokeWidth="4"
                strokeDasharray="31.4 31.4"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 25 25"
                  to="360 25 25"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          )}

          {state === 'success' && (
            <svg viewBox="0 0 100 100" width="60" height="60">
              <circle cx="50" cy="50" r="45" fill="#10b981" />
              <path
                d="M30 50 L45 65 L70 35"
                stroke="white"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {state === 'error' && (
            <svg viewBox="0 0 100 100" width="60" height="60">
              <circle cx="50" cy="50" r="45" fill="#e74c3c" />
              <path
                d="M35 35 L65 65 M65 35 L35 65"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        <div className="tx-status__message">
          {state === 'pending' && (
            <>
              <p className="tx-status__title">Transaction Pending</p>
              <p className="tx-status__subtitle">Please wait while the transaction is being processed...</p>
            </>
          )}

          {state === 'success' && (
            <>
              <p className="tx-status__title">{successMessage}</p>
              {txHash && (
                <div className="tx-status__details">
                  <p className="tx-status__hash">
                    <span className="tx-status__hash-label">Transaction Hash:</span>
                    <code className="tx-status__hash-value">{formatHash(txHash)}</code>
                  </p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-status__explorer-link"
                    >
                      View on Block Explorer →
                    </a>
                  )}
                  {!explorerUrl && chainId === 31337 && (
                    <p className="tx-status__local-note">
                      Transaction confirmed on local network
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {state === 'error' && (
            <>
              <p className="tx-status__title">Transaction Failed</p>
              <p className="tx-status__error">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Format transaction hash for display
 * Shows first 10 and last 8 characters
 */
function formatHash(hash: string): string {
  if (!hash || hash.length < 18) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

export default TransactionStatus

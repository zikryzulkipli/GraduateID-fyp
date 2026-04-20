import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Minimal error boundary test
function TestApp() {
  console.log('=== TEST APP RENDERING ===')
  
  try {
    // Import and test WalletProvider
    const { WalletProvider } = require('./context/WalletContext')
    console.log('✅ WalletProvider imported successfully')
    
    return (
      <div style={{ padding: '50px', background: '#f0f0f0', minHeight: '100vh' }}>
        <h1>Testing WalletProvider...</h1>
        <WalletProvider>
          <div style={{ background: 'white', padding: '20px', borderRadius: '10px' }}>
            <p>✅ WalletProvider is working!</p>
          </div>
        </WalletProvider>
      </div>
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return (
      <div style={{ padding: '50px', background: '#ffebee' }}>
        <h1 style={{ color: '#c62828' }}>Error Detected!</h1>
        <pre style={{ background: '#fff', padding: '20px', borderRadius: '5px' }}>
          {String(error)}
        </pre>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestApp />
  </StrictMode>,
)

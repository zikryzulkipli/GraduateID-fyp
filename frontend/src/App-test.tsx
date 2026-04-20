import './App.css'

function App() {
  console.log('App component rendering')
  
  return (
    <div style={{ padding: '50px', background: '#f0f0f0', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '40px', borderRadius: '10px' }}>
        <h1 style={{ color: '#333' }}>🎉 App is Loading!</h1>
        <p style={{ fontSize: '18px', color: '#666' }}>If you see this, React is working!</p>
        <div style={{ background: '#d4edda', padding: '20px', borderRadius: '5px', marginTop: '20px' }}>
          <h2 style={{ color: '#155724' }}>✅ Success Checks:</h2>
          <ul style={{ color: '#155724' }}>
            <li>✅ Vite server is running</li>
            <li>✅ React is rendering</li>
            <li>✅ Components are loading</li>
            <li>✅ CSS is working</li>
          </ul>
        </div>
        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '5px' }}>
          <p style={{ color: '#856404' }}><strong>Next:</strong> Check browser console (F12) for any errors</p>
        </div>
      </div>
    </div>
  )
}

export default App

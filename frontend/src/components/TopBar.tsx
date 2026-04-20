import { useTopBar } from '../hooks/useTopBar'
import './TopBar.css'

interface TopBarProps {
  roleName?: string
}

function TopBar(_props: TopBarProps = {}) {
  const { address, staffID, profileImage } = useTopBar()

  const shortAddress = address && address.length > 0 ? `${address.slice(0, 6)}...${address.slice(-6)}` : 'Loading...'

  return (
    <div className="topbar">
      <div className="topbar-left">
        <p className="topbar-welcome">Welcome, <strong>{staffID || 'Loading...'}</strong></p>
        <p className="topbar-id">{shortAddress}</p>
      </div>

      <div className="topbar-right">
        <img 
          src={profileImage} 
          alt="Profile" 
          className="topbar-avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23ccc"/%3E%3C/svg%3E'
          }}
        />
      </div>
    </div>
  )
}

export default TopBar

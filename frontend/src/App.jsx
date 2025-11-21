import { useState, useEffect } from 'react'
import beeStingerLogo from './assets/bee_stinger.png'

function App() {
  const [urls, setUrls] = useState('')
  const [jobId, setJobId] = useState(null)
  const [taskNumber, setTaskNumber] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token'))

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Listen for OAuth callback message
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from our backend
      const allowedOrigins = [
        'http://localhost:8000',
        'https://youtube-bot-m3ga.onrender.com'
      ]
      
      if (!allowedOrigins.includes(event.origin)) {
        return
      }
      
      if (event.data.type === 'auth_success' && event.data.token) {
        const token = event.data.token
        localStorage.setItem('auth_token', token)
        setAuthToken(token)
        setAuthenticated(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [authToken])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setAuthenticated(false)
        setCheckingAuth(false)
        return
      }

      const response = await fetch(`${API_URL}/auth/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setAuthenticated(data.authenticated)
      
      if (!data.authenticated) {
        localStorage.removeItem('auth_token')
        setAuthToken(null)
      }
    } catch (err) {
      console.error('Failed to check auth status:', err)
      setAuthenticated(false)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/login`)
      const data = await response.json()
      
      // Open OAuth in popup window
      const width = 500
      const height = 600
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      
      window.open(
        data.auth_url,
        'oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      )
    } catch (err) {
      setError('Failed to initiate login')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStatus(null)
    setJobId(null)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Not authenticated')
      }

      const urlList = urls.split('\n').filter(url => url.trim())
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ urls: urlList }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit analysis')
      }

      const data = await response.json()
      setJobId(data.job_id)
      setTaskNumber(data.task_number)
      pollStatus(data.job_id)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const pollStatus = async (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/status/${id}`)
        const data = await response.json()
        
        setStatus(data)

        if (data.overall_status === 'complete' || data.overall_status === 'failed') {
          clearInterval(interval)
          setLoading(false)
        }
      } catch (err) {
        setError(err.message)
        clearInterval(interval)
        setLoading(false)
      }
    }, 2000)
  }

  if (checkingAuth) {
    return (
      <div className="h-screen flex items-center justify-center" style={{fontFamily: 'Arial, sans-serif', backgroundColor: '#000000', margin: 0, padding: 0}}>
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-screen grid grid-cols-2" style={{fontFamily: 'Arial, sans-serif', backgroundColor: '#000000', color: '#ffffff', margin: 0, padding: 0, overflow: 'hidden'}}>
      {/* Left Half - Branding */}
      <div className="flex items-center justify-center" style={{backgroundColor: '#000000'}}>
        <div className="text-center px-8">
          <img 
            src={beeStingerLogo} 
            alt="Bee Stinger Brands" 
            className="mx-auto mb-6"
            style={{maxWidth: '300px', height: 'auto'}}
          />
          <h1 className="text-4xl font-bold text-white mb-4">
            Bee Stinger YouTube Analysis Bot
          </h1>
          <p className="text-white text-lg">
            Analyze YouTube channels and export metrics to Google Drive
          </p>
        </div>
      </div>

      {/* Right Half - Functionality */}
      <div className="flex flex-col p-8 gap-4" style={{backgroundColor: '#000000', maxHeight: '100vh', overflow: 'hidden'}}>
        {!authenticated ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                Connect Your Google Account
              </h2>
              <p className="text-gray-300 mb-8">
                Sign in with Google to save analytics reports to your Drive
              </p>
              <button
                onClick={handleLogin}
                className="inline-flex items-center px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Input Section - Top */}
            <div className="p-6" style={{backgroundColor: '#2a2a2a', borderRadius: '8px'}}>
              <form onSubmit={handleSubmit}>
                <label htmlFor="urls" className="block text-sm font-semibold text-white text-center" style={{marginBottom: '24px'}}>
                  Input YouTube Channel URL's below. One per row
                </label>
                <textarea
                  id="urls"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder="https://www.youtube.com/@channel1&#10;https://www.youtube.com/@channel2&#10;https://www.youtube.com/@channel3"
                  className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none resize-none placeholder-gray-500"
                  style={{backgroundColor: '#333333', height: '180px', border: 'none', color: '#ffffff'}}
                  disabled={loading}
                  required
                />

                <button
                  type="submit"
                  disabled={loading || !urls.trim()}
                  className="mt-4 w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {loading ? 'Processing...' : 'Analyze Channels'}
                </button>
              </form>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 rounded-lg" style={{backgroundColor: '#2d1515'}}>
                  <p className="text-red-300 text-sm font-medium">Error: {error}</p>
                </div>
              )}
            </div>

            {/* Status Section - Bottom */}
            <div className="p-4 flex-1" style={{backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'auto', minHeight: '300px'}}>
              {status && status.tasks ? (
                <div className="p-4 rounded-lg" style={{backgroundColor: '#4a4a4a', border: '2px solid #5a5a5a'}}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">Task {taskNumber} Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status.overall_status === 'processing' ? 'bg-yellow-500 text-black' :
                      status.overall_status === 'complete' ? 'bg-green-500 text-black' :
                      'bg-red-500 text-white'
                    }`}>
                      {status.overall_status}
                    </span>
                  </div>

                  {/* Progress indicator */}
                  {status.overall_status === 'processing' && (
                    <div className="mb-3 text-white text-sm">
                      Processing channels...
                    </div>
                  )}

                  {status.overall_status === 'complete' && (
                    <div className="mb-3 text-green-400 text-sm font-medium">
                      ✓ Analysis complete
                    </div>
                  )}

                  {status.overall_status === 'complete' && status.tasks.length > 0 && status.tasks[0].sheet_url && (
                    <div className="mt-4 space-y-2">
                      <a
                        href={status.tasks[0].sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center"
                      >
                        Open Results in Google Drive
                      </a>
                      <button
                        onClick={() => {
                          setUrls('')
                          setJobId(null)
                          setTaskNumber(null)
                          setStatus(null)
                          setError(null)
                        }}
                        className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center"
                      >
                        Start New Analysis
                      </button>
                    </div>
                  )}

                  {status.overall_status === 'failed' && (
                    <div className="p-3 bg-red-900 rounded-lg text-white text-sm">
                      Error: {status.tasks[0]?.error || 'Unknown error occurred'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    Task status will appear here
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App

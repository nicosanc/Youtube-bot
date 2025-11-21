import { useState, useEffect } from 'react'
import beeStingerLogo from './assets/bee_stinger.png'

function App() {
  const [urls, setUrls] = useState('')
  const [jobId, setJobId] = useState(null)
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

        if (data.status === 'complete' || data.status === 'failed') {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center" style={{fontFamily: 'Arial, sans-serif'}}>
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 py-12 px-4" style={{fontFamily: 'Arial, sans-serif'}}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <img 
            src={beeStingerLogo} 
            alt="Bee Stinger Brands" 
            className="mx-auto mb-6 h-24 w-auto"
          />
          <h1 className="text-4xl font-bold text-white mb-3">
            Bee Stinger YouTube Analysis Bot
          </h1>
          <p className="text-gray-300">
            Analyze YouTube channels and export metrics to Google Drive
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-700 rounded-2xl shadow-xl p-8">
          {!authenticated ? (
            <div className="text-center py-12">
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
          ) : (
          <>
            <form onSubmit={handleSubmit}>
              <label htmlFor="urls" className="block text-sm font-semibold text-white mb-3">
                Input YouTube Channel URL's below. One per row
              </label>
              <textarea
                id="urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://www.youtube.com/@channel1&#10;https://www.youtube.com/@channel2&#10;https://www.youtube.com/@channel3"
                className="w-full h-40 px-4 py-3 border border-gray-600 bg-gray-800 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none text-white placeholder-gray-400"
                disabled={loading}
                required
              />

              <button
                type="submit"
                disabled={loading || !urls.trim()}
                className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Processing...' : 'Analyze Channels'}
              </button>
            </form>

            {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-900 border border-red-700 rounded-lg">
              <p className="text-red-200 text-sm font-medium">Error: {error}</p>
            </div>
          )}

          {/* Status Display */}
          {status && status.tasks && (
            <div className="mt-6 p-6 bg-gray-800 border border-gray-600 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white">Task Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status.overall_status === 'processing' ? 'bg-yellow-500 text-gray-900' :
                  status.overall_status === 'complete' ? 'bg-green-500 text-gray-900' :
                  'bg-red-500 text-white'
                }`}>
                  {status.overall_status}
                </span>
              </div>

              {/* Individual Task List */}
              <div className="space-y-2">
                {status.tasks.map((task) => (
                  <div key={task.task_number} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <span className="text-white font-medium">Task {task.task_number}</span>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.status === 'queue' ? 'bg-gray-600 text-gray-300' :
                        task.status === 'working' ? 'bg-yellow-500 text-gray-900' :
                        task.status === 'done' ? 'bg-green-500 text-gray-900' :
                        'bg-red-500 text-white'
                      }`}>
                        {task.status === 'queue' ? 'Queue' :
                         task.status === 'working' ? 'Working' :
                         task.status === 'done' ? 'Done' :
                         'Failed'}
                      </span>
                      {task.status === 'done' && task.sheet_url && (
                        <a
                          href={task.sheet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-500 hover:text-yellow-400 text-xs font-medium"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {status.overall_status === 'complete' && (
                <p className="text-green-400 text-sm mt-4 text-center">
                  All tasks complete! Files saved to Google Drive.
                </p>
              )}
            </div>
          )}
          </>
          )}
        </div>

        {authenticated && (
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>Results will be saved to your Google Drive</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

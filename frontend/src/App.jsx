import { useState, useEffect } from 'react'

function App() {
  const [urls, setUrls] = useState('')
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
    
    // Check if redirected back from OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'success') {
      setAuthenticated(true)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/status`)
      const data = await response.json()
      setAuthenticated(data.authenticated)
    } catch (err) {
      console.error('Failed to check auth status:', err)
    } finally {
      setCheckingAuth(false)
    }
  }

  const handleLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/login`)
      const data = await response.json()
      window.location.href = data.auth_url
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
      const urlList = urls.split('\n').filter(url => url.trim())
      
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            YouTube Analytics Bot
          </h1>
          <p className="text-slate-600">
            Analyze YouTube channels and export metrics to Google Drive
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!authenticated ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                Connect Your Google Account
              </h2>
              <p className="text-slate-600 mb-8">
                Sign in with Google to save analytics reports to your Drive
              </p>
              <button
                onClick={handleLogin}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
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
              <label htmlFor="urls" className="block text-sm font-semibold text-slate-700 mb-3">
                YouTube Channel URLs
              </label>
              <textarea
                id="urls"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="Paste YouTube channel URLs (one per line)&#10;https://www.youtube.com/@channel1&#10;https://www.youtube.com/@channel2"
                className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-slate-900 placeholder-slate-400"
                disabled={loading}
                required
              />

              <button
                type="submit"
                disabled={loading || !urls.trim()}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Processing...' : 'Analyze Channels'}
              </button>
            </form>

            {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">Error: {error}</p>
            </div>
          )}

          {/* Status Display */}
          {status && (
            <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                  status.status === 'complete' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {status.status}
                </span>
              </div>

              {status.status === 'processing' && (
                <p className="text-slate-600 text-sm mt-3">
                  Analyzing channels and generating report...
                </p>
              )}

              {status.status === 'complete' && status.sheet_url && (
                <div className="mt-4">
                  <p className="text-slate-600 text-sm mb-3">
                    Analysis complete! Your report is ready.
                  </p>
                  <a
                    href={status.sheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Google Sheet
                  </a>
                </div>
              )}

              {status.status === 'failed' && (
                <p className="text-red-600 text-sm mt-3">
                  Analysis failed. Please try again or contact support.
                </p>
              )}
            </div>
          )}
          </>
          )}
        </div>

        {authenticated && (
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>Results will be saved to your Google Drive</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

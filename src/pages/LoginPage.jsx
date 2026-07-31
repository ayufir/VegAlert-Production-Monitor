import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function LoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!phone.trim() || !password.trim()) {
      setError('Please enter your phone number and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/login', { phone, password })
      const data = res.data
      const token = data.token || data.accessToken || data.access_token
      const user = data.user || data.employee || data
      if (!token) throw new Error('No access token received from server.')
      localStorage.setItem('accessToken', token)
      localStorage.setItem('userProfile', JSON.stringify(user))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Login failed. Check credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 px-4">
      {/* Subtle decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-100/80 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-200 mb-4">
            <span className="text-3xl">🥬</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">VegAlert Pro</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Production Monitor Dashboard</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-xl shadow-slate-200/50">
          <h2 className="text-slate-900 font-bold text-lg mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-600 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9000000000"
                autoComplete="tel"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium"
              />
            </div>
            <div>
              <label className="text-slate-600 text-xs font-semibold uppercase tracking-wide block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition text-sm px-1"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:bg-emerald-200 disabled:text-emerald-400 text-white font-bold rounded-xl transition-all text-sm tracking-wide mt-2 shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In →</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          VegAlert • Production Monitor v2.0
        </p>
      </div>
    </div>
  )
}

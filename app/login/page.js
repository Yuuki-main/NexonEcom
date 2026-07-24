'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Eye, EyeOff } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { setUser } from '@/store/slices/authSlice'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  // Loading state for submit button
  const [loading, setLoading] = useState(false)

  // Error from API
  const [error, setError] = useState('')

  const searchParams = useSearchParams()
  // Redux dispatcher
  const dispatch = useDispatch()

  // Next router
  const router = useRouter()

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Clear previous error
    setError('')

    // Start loading
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(form),
      })

      const data = await res.json()

      // Stop loading
      setLoading(false)

      // Login failed
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Save user in Redux
      dispatch(setUser(data.user))

      // Redirect to home page
      const redirectTo = searchParams.get('redirect') || '/'
      router.push(redirectTo)
    } catch (err) {
      console.error(err)

      setLoading(false)

      setError('Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <main className="flex items-center justify-center px-4 py-16 min-h-[calc(100vh-140px)]">
        <div className="bg-white border border-[#e0e0e0] rounded-2xl w-full max-w-130 px-12 py-12">
          {/* Heading */}
          <h1 className="text-[34px] font-extrabold text-[#1a1a2e] text-center mb-8 tracking-tight">
            Sign in to Your Account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {/* Email */}
            <div>
              <label className="block text-[14px] text-[#888] mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[14px] text-[#111] focus:outline-none focus:border-[#2196f3] bg-white"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[14px] text-[#888] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 pr-11 text-[14px] text-[#111] focus:outline-none focus:border-[#2196f3] bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                  className="w-5 h-5 rounded border-[#ccc] accent-[#2196f3]"
                />
                <span className="text-[14px] text-[#333]">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-[14px] text-[#2196f3] hover:underline font-medium"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Terms notice */}
            <div className="bg-[#f5f5f5] rounded-lg px-4 py-4 mt-4">
              <p className="text-[13px] text-[#555] leading-5.5">
                By clicking the button below, you agree to our{' '}
                <Link href="#" className="underline text-[#333]">
                  Terms & Conditions
                </Link>
                ,{' '}
                <Link href="#" className="underline text-[#333]">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="#" className="underline text-[#333]">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00a7a7] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[16px] py-3.5 rounded-lg transition cursor-pointer"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-[14px] text-[#888] text-center mt-5">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/signup"
              className="text-[#2196f3] font-semibold hover:underline"
            >
              Sign Up →
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
          <p className="text-[14px] text-[#888]">Loading...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { MapPin, Eye, EyeOff } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useRouter, useSearchParams } from 'next/navigation'
import { setUser } from '@/store/slices/authSlice'
import CustomSelect from '@/components/CustomSelect'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SignupContent() {
  const [gst, setGst] = useState('Yes')
  const [agree1, setAgree1] = useState(false)
  const [agree2, setAgree2] = useState(false)
  const [robot, setRobot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const dispatch = useDispatch()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({
    abn: '',
    companyName: '',
    tradingName: '',
    businessAddress: '',
    hearAboutUs: '',
    installations: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')

    // Validate
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!agree1 || !agree2) {
      setError('Please accept the terms and conditions')
      return
    }

    if (!robot) {
      setError('Please verify that you are not a robot')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          abn: form.abn,
          companyName: form.companyName,
          tradingName: form.tradingName,
          businessAddress: form.businessAddress,
          gst,
          hearAboutUs: form.hearAboutUs,
          installations: form.installations,
          phone: form.phone,
        }),
      })

      const data = await res.json()

      setLoading(false)

      if (!res.ok) {
        setError(data.error || 'Signup failed')
        return
      }

      dispatch(setUser(data.user))
      const redirectTo = searchParams.get('redirect') || '/'
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      console.error(err)
      setLoading(false)
      setError('Something went wrong')
    }
  }

  const inputCls =
    'w-full border border-[#d1d5db] rounded px-4 py-3 text-[14px] text-[#111] focus:outline-none focus:border-[#2196f3] bg-white'
  const labelCls = 'block text-[13px] text-[#666] mb-1.5'
  const requiredStar = <span className="text-red-500 mr-1">*</span>

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-[860px] mx-auto px-6 py-16">
        {/* Heading */}
        <h1 className="text-[40px] font-extrabold text-[#1a1a2e] text-center mb-12 tracking-tight">
          Create An Account
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-8 text-center max-w-[520px] mx-auto">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* ── Company Info ── */}
          <section>
            <h2 className="text-[20px] font-extrabold text-[#111] mb-6">
              Company info
            </h2>

            {/* ABN + Company Name */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelCls}>{requiredStar}ABN</label>
                <input
                  name="abn"
                  value={form.abn}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{requiredStar}Company Name</label>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Registered GST + Trading Name */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelCls}>{requiredStar}Registered GST</label>
                <div className="flex rounded border border-[#d1d5db] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGst('Yes')}
                    className={`flex-1 py-3 text-[14px] font-bold transition cursor-pointer ${gst === 'Yes' ? 'bg-white text-[#111] shadow-sm' : 'bg-[#f1f3f6] text-[#777]'}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setGst('No')}
                    className={`flex-1 py-3 text-[14px] font-medium transition cursor-pointer ${gst === 'No' ? 'bg-white text-[#111] shadow-sm' : 'bg-[#f1f3f6] text-[#777]'}`}
                  >
                    No
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Trading Name</label>
                <input
                  name="tradingName"
                  value={form.tradingName}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Business Address - full width */}
            <div className="mb-6">
              <label className={labelCls}>{requiredStar}Business Address</label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]"
                />
                <input
                  name="businessAddress"
                  value={form.businessAddress}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            {/* How did you hear + installations */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>
                  {requiredStar}How did you hear about us
                </label>
                <CustomSelect
                  name="hearAboutUs"
                  value={form.hearAboutUs}
                  onChange={(val) => handleChange({ target: { name: 'hearAboutUs', value: val } })}
                  placeholder="Please select..."
                  options={[
                    { value: 'Google', label: 'Google' },
                    { value: 'Social Media', label: 'Social Media' },
                    { value: 'Referral', label: 'Referral' },
                    { value: 'Trade Show', label: 'Trade Show' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
              <div>
                <label className={labelCls}>
                  {requiredStar}How many installations do you install on a
                  weekly base?
                </label>
                <CustomSelect
                  name="installations"
                  value={form.installations}
                  onChange={(val) => handleChange({ target: { name: 'installations', value: val } })}
                  placeholder="Please select..."
                  options={[
                    { value: '1–5', label: '1–5' },
                    { value: '6–10', label: '6–10' },
                    { value: '11–20', label: '11–20' },
                    { value: '20+', label: '20+' },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* ── Contact Details ── */}
          <section>
            <h2 className="text-[20px] font-extrabold text-[#111] mb-6">
              Contact Details
            </h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className={labelCls}>{requiredStar}Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{requiredStar}Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Password */}
              <div>
                <label className={labelCls}>{requiredStar}Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    className={inputCls}
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
              {/* Confirm Password */}
              <div>
                <label className={labelCls}>
                  {requiredStar}Confirm Password
                </label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] cursor-pointer"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={labelCls}>{requiredStar}Phone</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </section>

          {/* ── Agreements ── */}
          <section className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agree1}
                onChange={() => setAgree1(!agree1)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#2196f3] shrink-0"
              />
              <span className="text-[14px] text-[#333] leading-[22px]">
                Create a{' '}
                <span className="font-bold text-[#2196f3]">NexonEcom</span>{' '}
                account and i agree to the{' '}
                <Link href="#" className="text-[#2196f3] underline">
                  Terms & Conditions
                </Link>{' '}
                ,{' '}
                <Link href="#" className="text-[#2196f3] underline">
                  Service Terms and Conditions
                </Link>{' '}
                ,
                <Link href="#" className="text-[#2196f3] underline">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-[#2196f3] underline">
                  Cookie Policy
                </Link>
                .
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agree2}
                onChange={() => setAgree2(!agree2)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-[#2196f3] shrink-0"
              />
              <span className="text-[14px] text-[#333]">
                I agree to the{' '}
                <Link href="#" className="text-[#2196f3] underline">
                  Terms & Conditions, Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-[#2196f3] underline">
                  Cookie Policy
                </Link>
                .
              </span>
            </label>
          </section>

          {/* ── reCAPTCHA mock ── */}
          <div className="flex justify-center">
            <div className="border border-[#d1d5db] rounded w-[300px] px-4 py-3 flex items-center justify-between bg-[#fafafa]">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setRobot(!robot)}
                  className={`w-6 h-6 border-2 rounded cursor-pointer flex items-center justify-center transition ${robot ? 'border-[#2196f3] bg-[#2196f3]' : 'border-[#ccc]'}`}
                >
                  {robot && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path
                        d="M1 5l3.5 3.5L11 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#333]">
                    I am not a robot
                  </p>
                  <p className="text-[10px] text-[#888] mt-0.5">
                    reCAPTCHA is changing its terms of service.
                  </p>
                  <p className="text-[10px] text-[#2196f3] underline cursor-pointer">
                    Take action.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
                  <path
                    d="M32 4C16.536 4 4 16.536 4 32s12.536 28 28 28 28-12.536 28-28S47.464 4 32 4z"
                    fill="#4285F4"
                  />
                  <path
                    d="M32 14l4 12h12l-10 7 4 12-10-7-10 7 4-12-10-7h12z"
                    fill="white"
                  />
                </svg>
                <span className="text-[9px] text-[#888] font-semibold tracking-wide">
                  reCAPTCHA
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full max-w-[420px] bg-[#00a7a7] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[16px] py-3.5 rounded transition cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Submit'}
            </button>
            <p className="text-[13px] text-[#888]">
              New accounts are subject to approval.
            </p>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
          <p className="text-[14px] text-[#888]">Loading...</p>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  )
}

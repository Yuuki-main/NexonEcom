import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar />
      <main className="max-w-120 mx-auto px-6 py-20 text-center">
        <h1 className="text-[24px] font-bold text-[#111] mb-3">
          Reset Password
        </h1>
        <p className="text-[14px] text-[#666]">
          Password reset via email is coming soon. Please contact support at{' '}
          <a
            href="mailto:support@nexon.com"
            className="text-[#00a7a7] hover:underline"
          >
            support@nexon.com
          </a>
        </p>
      </main>
      <Footer />
    </div>
  )
}

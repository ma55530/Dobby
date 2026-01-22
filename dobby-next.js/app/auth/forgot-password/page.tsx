import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export default function Page() {
  return (
    <div className="relative min-h-svh w-full flex items-center justify-center px-6 py-10">
      <div className="absolute top-6 left-6 sm:left-8 z-10">
        <span className="text-3xl sm:text-4xl font-montserrat text-white drop-shadow-lg">Dobby</span>
      </div>
      <div className="w-full max-w-md p-6 md:p-10 rounded-2xl shadow-9xl">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}

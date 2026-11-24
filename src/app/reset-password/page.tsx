import { PublicFooter, PublicNavbar } from "@/components/layout/PublicChrome";
import { ResetPasswordForm } from "@/components/auth/AuthForms";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Set New Password
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#181A20]">
              Choose a new password
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter a strong password (minimum 8 characters) for your SakayNa
              account.
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

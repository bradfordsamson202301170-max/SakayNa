import { PublicFooter, PublicNavbar } from "@/components/layout/PublicChrome";
import { DriverRegisterForm } from "@/components/auth/AuthForms";

export default function DriverRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Driver Partner Application
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181A20]">
              Register as a SakayNa Driver
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Submit your account, license, and motorcycle details. Your account
              will remain pending until approved by an Administrator.
            </p>
          </div>

          <DriverRegisterForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

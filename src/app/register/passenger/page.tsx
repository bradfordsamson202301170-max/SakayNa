import { PublicFooter, PublicNavbar } from "@/components/layout/PublicChrome";
import { PassengerRegisterForm } from "@/components/auth/AuthForms";

export default function PassengerRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicNavbar />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Passenger Onboarding
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181A20]">
              Create your Passenger account
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Book verified motorcycle rides with upfront fare estimates.
            </p>
          </div>

          <PassengerRegisterForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

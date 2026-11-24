import Link from "next/link";
import { LoginForm } from "@/components/auth/AuthForms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="grid min-h-screen w-full overflow-x-hidden lg:grid-cols-2">
      {/* Left Brand & Illustration Panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0B0E11] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 42%, #F0B90B 0%, transparent 45%), radial-gradient(circle at 85% 15%, #F0B90B 0%, transparent 35%)",
          }}
        />
        <Link
          href="/"
          className="relative z-10 inline-flex w-fit items-center gap-2 text-xs font-semibold tracking-wide text-[#848E9C] transition hover:text-[#F0B90B]"
        >
          ← Back to Home
        </Link>

        <div className="relative z-10 space-y-7">
          {/* Floating Transparent SakayNa Logo — Zero Container */}
          <img
            src="/images/sakayna-logo.png"
            alt="SakayNa — Iligan City Motorcycle Ride-Hailing"
            className="h-28 w-auto max-w-sm object-contain drop-shadow-[0_12px_32px_rgba(240,185,11,0.22)] xl:h-32"
          />

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F0B90B]">
              Iligan City Motorcycle Ride-Hailing
            </p>
            <h1 className="text-3xl font-extrabold leading-tight xl:text-4xl">
              Reliable, safe, and quick rides with{" "}
              <span className="text-[#F0B90B]">SakayNa</span>.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#B7BDC6]">
              Verified motorcycle partners, upfront fixed fares, and live
              GPS ride tracking — all in one secure platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1 text-xs font-semibold text-[#EAECEF]">
            <span className="rounded-full bg-[#181A20] px-3 py-1.5 ring-1 ring-[#2B3139]">
              ✓ Admin-Verified Riders
            </span>
            <span className="rounded-full bg-[#181A20] px-3 py-1.5 ring-1 ring-[#2B3139]">
              ✓ Upfront Fixed Fares
            </span>
            <span className="rounded-full bg-[#181A20] px-3 py-1.5 ring-1 ring-[#2B3139]">
              ✓ Live Pickup Pin Map
            </span>
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#848E9C]">
          © {new Date().getFullYear()} SakayNa — Motorcycle Ride-Hailing &amp;
          Driver Management System
        </p>
      </div>

      {/* Right Auth Form */}
      <div className="flex min-w-0 flex-col justify-center bg-[#FAFAFA] px-4 py-8 sm:px-12 sm:py-10">
        <div className="mx-auto w-full max-w-md space-y-5">
          {/* Mobile dark header strip with floating transparent logo (no inner box) */}
          <div className="-mx-4 -mt-8 mb-2 bg-[#0B0E11] px-5 py-6 text-center sm:-mx-12 sm:-mt-10 lg:hidden">
            <Link href="/" className="inline-block">
              <img
                src="/images/sakayna-logo.png"
                alt="SakayNa"
                className="mx-auto h-16 w-auto object-contain"
              />
            </Link>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#F0B90B]">
              Iligan City MC Ride-Hailing
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#181A20]">
              Sign in to SakayNa
            </h2>
            <p className="mt-1 text-sm text-[#474D57]">
              Enter your email and password to access your portal.
            </p>
          </div>

          <LoginForm initialError={params.error} />
        </div>
      </div>
    </div>
  );
}

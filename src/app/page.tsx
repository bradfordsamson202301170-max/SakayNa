import Link from "next/link";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { MotoGoLogo } from "@/components/brand/MotoGoLogo";
import { PublicFooter, PublicNavbar } from "@/components/layout/PublicChrome";
import { LinkButton } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-[#FAFAFA]">
      <PublicNavbar />

      {/* HERO SECTION — Binance-Inspired Obsidian & Gold Identity + 3-Card Showcase */}
      <section className="relative w-full overflow-hidden bg-[#0B0E11] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 82% 18%, #F0B90B 0%, transparent 42%), radial-gradient(circle at 12% 85%, #2B3139 0%, transparent 50%)",
          }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-24">
          {/* Left Copy */}
          <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-6">
            <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Beat the traffic.{" "}
              <span className="text-[#F0B90B]">SakayNa!</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[#B7BDC6] sm:text-base lg:text-lg">
              Safe, verified, and quick motorcycle rides from{" "}
              <span className="font-semibold text-white">MSU-IIT Tibanga</span>{" "}
              to <span className="font-semibold text-white">Poblacion</span>,{" "}
              <span className="font-semibold text-white">Tubod</span>, and{" "}
              <span className="font-semibold text-white">Tambo</span> — with
              upfront fixed fares and real-time GPS ride tracking.
            </p>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <LinkButton
                href="/register/passenger"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Book a Ride Now
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                href="/register/driver"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Bike className="h-4 w-4 text-[#0B0E11]" />
                Become a SakayNa Rider
              </LinkButton>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-[#2B3139] pt-5 sm:gap-4 sm:pt-6">
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-[#F0B90B] sm:text-2xl">
                  100%
                </p>
                <p className="text-[11px] text-[#848E9C] sm:text-xs">
                  Admin-Verified Riders
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-white sm:text-2xl">
                  Upfront
                </p>
                <p className="text-[11px] text-[#848E9C] sm:text-xs">
                  Transparent Fixed Fares
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-[#0ECB81] sm:text-2xl">
                  Live GPS
                </p>
                <p className="text-[11px] text-[#848E9C] sm:text-xs">
                  Iligan City Map
                </p>
              </div>
            </div>
          </div>

          {/* Right: Unique SakayNa 3-Card Mobile App Showcase */}
          <div className="min-w-0 lg:col-span-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
              {/* Showcase Card 1 — Safety Rating & Verified Rider */}
              <div className="group flex min-w-0 cursor-pointer flex-col justify-between rounded-[24px] border border-[#2B3139] bg-[#181A20] p-4 shadow-2xl transition-all duration-300 ease-out hover:-translate-y-2.5 hover:scale-[1.02] hover:border-[#F0B90B] hover:shadow-[0_20px_50px_rgba(240,185,11,0.22)] sm:min-h-[360px] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#0ECB81]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0ECB81]">
                    Safety First
                  </span>
                  <ShieldCheck className="h-4 w-4 text-[#F0B90B] transition-transform duration-300 group-hover:scale-110" />
                </div>

                <div className="my-4 flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-[#F0B90B] bg-[#F0B90B]/10 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-[#F0B90B]/20 group-hover:shadow-[0_0_24px_rgba(240,185,11,0.35)]">
                    <ShieldCheck className="h-7 w-7 text-[#F0B90B]" />
                    <span className="mt-0.5 text-[10px] font-extrabold text-white">
                      VERIFIED
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-white">
                    Checked License &amp; OR/CR
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-[#848E9C]">
                    Every SakayNa driver passes admin document review before
                    going online.
                  </p>
                </div>

                <div className="rounded-xl bg-[#F0B90B] px-3 py-2 text-center text-[11px] font-extrabold text-[#0B0E11] transition-colors duration-300 group-hover:bg-[#FCD535]">
                  Reliable, safe &amp; quick rides
                </div>
              </div>

              {/* Showcase Card 2 — Center Main App Preview */}
              <div className="group flex min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-[24px] border-2 border-[#F0B90B] bg-white p-4 text-[#181A20] shadow-2xl transition-all duration-300 ease-out hover:-translate-y-3 hover:scale-[1.03] hover:shadow-[0_24px_60px_rgba(240,185,11,0.35)] sm:-mt-6 sm:min-h-[415px] sm:p-5">
                <div className="-mx-4 -mt-4 flex items-center justify-between bg-[#181A20] px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5">
                  <MotoGoLogo variant="light" size="sm" />
                  <span className="rounded-full bg-[#F0B90B]/20 px-2 py-0.5 text-[10px] font-bold text-[#FCD535]">
                    ILIGAN
                  </span>
                </div>

                <div className="my-3 space-y-2.5">
                  <p className="text-center text-xs font-black uppercase tracking-wide text-[#181A20]">
                    All Your City Rides in One Smart App
                  </p>

                  <div className="overflow-hidden rounded-xl border border-[#EAECEF]">
                    <img
                      src="/images/sakayna-city-rides.svg"
                      alt="SakayNa Iligan City route map illustration"
                      className="h-24 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>

                  <div className="space-y-2 rounded-2xl bg-[#FAFAFA] p-3 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F0B90B]" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-[#707A8A]">
                          Pickup
                        </p>
                        <p className="truncate font-bold text-[#181A20]">
                          MSU-IIT Tibanga
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 border-t border-[#EAECEF] pt-2">
                      <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0ECB81]" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase text-[#707A8A]">
                          Dropoff
                        </p>
                        <p className="truncate font-bold text-[#181A20]">
                          Robinsons Iligan
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#181A20] px-3.5 py-2.5 text-white">
                    <div>
                      <p className="text-[10px] text-[#848E9C]">Locked Fare</p>
                      <p className="text-base font-black text-[#F0B90B]">
                        ₱ 62.00
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-[#B7BDC6]">
                      <p>4.0 km</p>
                      <p>~10 mins</p>
                    </div>
                  </div>
                </div>

                <LinkButton href="/login" variant="primary" size="sm" fullWidth>
                  Book with SakayNa
                </LinkButton>
              </div>

              {/* Showcase Card 3 — Instant Dispatch & Driver Partner */}
              <div className="group flex min-w-0 cursor-pointer flex-col justify-between rounded-[24px] border border-[#F0B90B]/40 bg-gradient-to-b from-[#1E2329] to-[#0B0E11] p-4 text-white shadow-2xl transition-all duration-300 ease-out hover:-translate-y-2.5 hover:scale-[1.02] hover:border-[#F0B90B] hover:shadow-[0_20px_50px_rgba(240,185,11,0.25)] sm:min-h-[360px] sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#F0B90B]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#FCD535]">
                    Fast Match
                  </span>
                  <Zap className="h-4 w-4 text-[#F0B90B] transition-transform duration-300 group-hover:scale-125" />
                </div>

                <div className="my-3 space-y-2.5 text-center">
                  <img
                    src="/images/sakayna-logo.png"
                    alt="SakayNa verified motorcycle rider brand"
                    className="mx-auto h-20 w-auto object-contain drop-shadow-[0_6px_18px_rgba(240,185,11,0.25)] transition-transform duration-300 ease-out group-hover:scale-110"
                  />
                  <p className="text-base font-black tracking-tight">
                    SAKAY<span className="text-[#F0B90B]">NA</span> RIDER
                  </p>
                  <p className="text-[11px] leading-snug text-[#B7BDC6]">
                    See exact passenger pickup pins on the Iligan map &amp; keep
                    transparent net earnings per trip.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1 rounded-xl bg-[#2B3139] px-3 py-2 text-[11px] font-semibold text-[#EAECEF] transition-colors duration-300 group-hover:bg-[#F0B90B] group-hover:text-[#0B0E11]">
                  <Star className="h-3.5 w-3.5 fill-[#F0B90B] text-[#F0B90B] transition-colors duration-300 group-hover:fill-[#0B0E11] group-hover:text-[#0B0E11]" />
                  <span>Realtime Pickup Tracking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE RIBBON */}
      <section className="border-b border-[#EAECEF] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-[#181A20] sm:gap-x-8 sm:py-4 sm:text-xs sm:tracking-widest lg:px-8">
          <span className="text-[#9A7100]">MC Taxi</span>
          <span className="text-[#B7BDC6]">•</span>
          <span>Upfront Fixed Fares</span>
          <span className="text-[#B7BDC6]">•</span>
          <span>Verified Drivers</span>
          <span className="text-[#B7BDC6]">•</span>
          <span>Live Pickup Pin Map</span>
          <span className="text-[#B7BDC6]">•</span>
          <span className="text-[#9A7100]">Iligan City Ready</span>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9A7100]">
            Why Choose SakayNa
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#181A20] sm:text-3xl">
            Three simple steps from pin to destination
          </h2>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 md:grid-cols-3">
          {[
            {
              icon: <MapPin className="h-6 w-6 text-[#9A7100]" />,
              title: "1. Pin Pickup & Dropoff",
              body: "Tap directly on the Iligan City map or use GPS to see your exact route and upfront fixed fare before booking.",
            },
            {
              icon: <Clock className="h-6 w-6 text-[#9A7100]" />,
              title: "2. Instant Atomic Matching",
              body: "Approved online SakayNa drivers receive your request in real time, see your exact pickup pin, and claim the trip with zero double-booking.",
            },
            {
              icon: <ShieldCheck className="h-6 w-6 text-[#9A7100]" />,
              title: "3. Track, Arrive & Rate",
              body: "Verify your rider's name and plate number, follow live trip milestones, record your fare, and rate your ride in seconds.",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-[#EAECEF] bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF9E7]">
                {step.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#181A20]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#474D57]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PASSENGER VS DRIVER SPLIT CTA */}
      <section id="portals" className="border-t border-[#EAECEF] bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="flex flex-col justify-between rounded-3xl bg-[#181A20] p-6 text-white shadow-lg sm:p-8">
            <div>
              <span className="inline-flex rounded-full bg-[#F0B90B]/15 px-3 py-1 text-xs font-bold text-[#FCD535]">
                For Commuters
              </span>
              <h3 className="mt-4 text-xl font-extrabold sm:text-2xl">
                Need a quick ride around Iligan?
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#B7BDC6]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F0B90B]" />
                  <span>Transparent fare breakdown locked before pickup</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F0B90B]" />
                  <span>Real-time driver assignment &amp; live status timeline</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F0B90B]" />
                  <span>Mobile-first Passenger UI with ride history &amp; ratings</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <LinkButton href="/register/passenger" variant="primary">
                Register as Passenger
              </LinkButton>
              <Link
                href="/login"
                className="inline-flex items-center px-2 py-2 text-sm font-semibold text-[#FCD535] hover:underline"
              >
                Already have an account? Sign in →
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border-2 border-[#FCE28A] bg-[#FEF9E7]/70 p-6 text-[#181A20] sm:p-8">
            <div>
              <span className="inline-flex rounded-full bg-[#F0B90B] px-3 py-1 text-xs font-bold text-[#0B0E11]">
                For Motorcycle Riders
              </span>
              <h3 className="mt-4 text-xl font-extrabold sm:text-2xl">
                Earn on your own schedule with SakayNa
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#474D57]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7100]" />
                  <span>Simple online verification with private document storage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7100]" />
                  <span>See exact passenger pickup pins on the map before accepting</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7100]" />
                  <span>Automatic per-ride net earnings ledger &amp; rating history</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <LinkButton href="/register/driver" variant="navy">
                Apply as a SakayNa Driver
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

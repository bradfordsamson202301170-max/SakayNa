import { MotoGoLogo } from "@/components/brand/MotoGoLogo";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#181A20] px-6 text-center text-white">
      <MotoGoLogo variant="light" size="lg" />
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-orange-400">
        404 — Route Not Found
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        We couldn&apos;t find that SakayNa page
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-300">
        The page you requested does not exist or may have moved. Return to the
        SakayNa home page to continue.
      </p>
      <div className="mt-6">
        <LinkButton href="/" variant="primary">
          Back to Home
        </LinkButton>
      </div>
    </div>
  );
}

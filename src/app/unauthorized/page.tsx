import { ShieldAlert } from "lucide-react";
import { MotoGoLogo } from "@/components/brand/MotoGoLogo";
import { LinkButton } from "@/components/ui/Button";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; expected?: string; actual?: string }>;
}) {
  const params = await searchParams;
  const isSuspended = params.reason === "suspended";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#181A20] px-6 text-center text-white">
      <MotoGoLogo variant="light" size="lg" />
      <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        {isSuspended ? "Account Suspended" : "Access Restricted"}
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
        {isSuspended
          ? "Your SakayNa account has been suspended by an Administrator. Please contact platform support for assistance."
          : `You do not have permission to view this ${params.expected ?? "protected"} area${
              params.actual ? ` while signed in as a ${params.actual}` : ""
            }.`}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <LinkButton href="/" variant="primary">
          Return Home
        </LinkButton>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/passenger", "/driver", "/admin"] as const;
const AUTH_PAGES = ["/login", "/register/passenger", "/register/driver"] as const;

function roleHome(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  return "/passenger";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const matchedProtectedPrefix = PROTECTED_PREFIXES.find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.includes(
    pathname as (typeof AUTH_PAGES)[number]
  );

  // Skip remote Supabase auth round-trip on purely public routes (e.g. /, /api/route)
  if (!matchedProtectedPrefix && !isAuthPage) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Block unauthenticated access to protected routes
  if (matchedProtectedPrefix && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Enforce role boundaries & active account status for authenticated users
  if (user && (matchedProtectedPrefix || AUTH_PAGES.includes(pathname as (typeof AUTH_PAGES)[number]))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", user.id)
      .single();

    if (profile?.account_status === "suspended" && matchedProtectedPrefix) {
      return NextResponse.redirect(
        new URL("/unauthorized?reason=suspended", request.url)
      );
    }

    const userRole = profile?.role;

    // Redirect logged-in users away from auth screens to their own portal
    if (AUTH_PAGES.includes(pathname as (typeof AUTH_PAGES)[number]) && userRole) {
      return NextResponse.redirect(new URL(roleHome(userRole), request.url));
    }

    // Prevent cross-role route access (e.g. passenger visiting /admin or /driver)
    if (matchedProtectedPrefix && userRole) {
      const requiredRole = matchedProtectedPrefix.slice(1); // 'passenger' | 'driver' | 'admin'
      if (userRole !== requiredRole) {
        const denyUrl = new URL("/unauthorized", request.url);
        denyUrl.searchParams.set("reason", "forbidden");
        denyUrl.searchParams.set("expected", requiredRole);
        denyUrl.searchParams.set("actual", userRole);
        return NextResponse.redirect(denyUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

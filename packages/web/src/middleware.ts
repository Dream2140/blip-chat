import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/refresh"];

const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; connect-src 'self' wss://blip-chat-ws.fly.dev https://blip-chat-ws.fly.dev; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests";

const SECURITY_HEADERS: ReadonlyArray<[string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Content-Security-Policy", CSP],
  ...(process.env.NODE_ENV === "production"
    ? [["Strict-Transport-Security", "max-age=31536000; includeSubDomains"] as [string, string]]
    : []),
];

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  const isApi = pathname.startsWith("/api/");
  const hasAccessToken = request.cookies.has("access_token");
  const hasRefreshToken = request.cookies.has("refresh_token");

  // Allow public paths
  if (isPublic) {
    // Redirect authenticated users away from login/register
    if ((pathname === "/login" || pathname === "/register") && hasAccessToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  // For protected API routes, return 401
  if (isApi && !hasAccessToken) {
    // If we have a refresh token, let the client try refreshing
    if (hasRefreshToken) {
      return NextResponse.json(
        { error: "Token expired", code: "TOKEN_EXPIRED" },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // For pages, redirect to login
  if (!isApi && !hasAccessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

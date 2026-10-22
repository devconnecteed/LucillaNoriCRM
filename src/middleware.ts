import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Filtro grezzo per area; l'autorizzazione vera è server-side in ogni pagina/azione (requireUser).
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (pathname.startsWith("/docente") && session.role === "STUDENT")
    return NextResponse.redirect(new URL("/allieva", req.url));
  if (pathname.startsWith("/allieva") && session.role !== "STUDENT")
    return NextResponse.redirect(new URL("/docente", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/docente/:path*", "/allieva/:path*", "/api/attestati/:path*"] };

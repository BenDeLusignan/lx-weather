import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/auth/session";

/**
 * Sends a page load to where it belongs, with a real HTTP redirect (307)
 * before any of the page is sent:
 *   - /away, /away/<club> and /account need a login: visitors go to / (the log in);
 *   - /signup is for visitors: someone already logged in goes to /.
 *
 * Why here and not only in the pages: with Cache Components each page's
 * static shell is sent first, so a redirect() while rendering can only arrive
 * as a <meta> refresh inside a 200. That works, but a moment late and
 * not as a real redirect. This check runs before rendering starts.
 *
 * It's the quick check only: a signed, unexpired session cookie. It can't see
 * a deleted user (that needs the database), so each page still calls
 * getCurrentUser(), which is the real boundary, and redirects itself.
 *
 * Page loads only (GET/HEAD). A POST is a Server Action, which checks
 * getCurrentUser() itself; redirecting it would make the browser re-send its
 * form body to /.
 */
export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const loggedIn = (await readSession()) !== null;
  const wantsSignUp = request.nextUrl.pathname === "/signup";
  if (loggedIn === wantsSignUp) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/signup", "/away/:path*", "/account/:path*"],
};

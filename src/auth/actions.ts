"use server";

import { redirect } from "next/navigation";
import { clientIp } from "@/auth/client-ip";
import { getCurrentUser } from "@/auth/current-user";
import { endSession, startSession } from "@/auth/session";
import { setThemeCookie } from "@/preferences/theme-cookie";
import {
  submitHomeClubChange,
  submitLogin,
  submitPasswordChange,
  submitSignUp,
  type SubmitResult,
} from "@/auth/submit";

// Every action ends in redirect(), never by returning to render the page. A
// form posted before the page's JavaScript has loaded is a plain HTML POST:
// redirect() answers it with a 303 to a full page, whereas a render would
// answer with only the streamed part of the page, which shows as a blank
// screen.

// The clock and the client's address are read here and passed in, so the
// submit functions can be tested with a fixed time and address.
async function attemptContext() {
  return { now: Math.floor(Date.now() / 1000), ip: await clientIp() };
}

// The cookie can only be set from an action, so a submit function returns
// what to sign rather than signing it itself.
async function finish(result: SubmitResult): Promise<never> {
  if (result.session) {
    await startSession(result.session);
    // The device's theme follows whoever just logged in (see theme-cookie.ts).
    await setThemeCookie(result.session.theme);
  }
  redirect(result.redirect);
}

export async function logIn(formData: FormData): Promise<never> {
  return finish(await submitLogin(formData, await attemptContext()));
}

export async function signUp(formData: FormData): Promise<never> {
  return finish(await submitSignUp(formData, await attemptContext()));
}

// POST only (a Server Action), so a link or an <img> on another site can't
// log anyone out. Lands on the landing page, which is the log in.
export async function logOut(): Promise<never> {
  await endSession();
  redirect("/");
}

export async function changeHomeClub(formData: FormData): Promise<never> {
  return finish(await submitHomeClubChange(await getCurrentUser(), formData));
}

// A successful change returns a fresh session, which `finish` starts: the old
// cookie no longer matches the new hash, and so neither does any other
// device's, so this device stays in and the rest are logged out.
export async function changePassword(formData: FormData): Promise<never> {
  return finish(await submitPasswordChange(await getCurrentUser(), formData, await attemptContext()));
}

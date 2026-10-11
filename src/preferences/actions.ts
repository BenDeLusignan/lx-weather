"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/current-user";
import { submitDays, submitHours, submitTheme, type PreferenceResult } from "./submit";
import { setThemeCookie } from "./theme-cookie";

// Like the auth actions, each ends in redirect(): a form posted before
// JavaScript loads is a plain HTML POST and needs a 303 to a full page.
// getCurrentUser() is the real check; a visitor is sent to the landing page.

async function finish(result: PreferenceResult): Promise<never> {
  if (result.theme) await setThemeCookie(result.theme);
  redirect(result.redirect);
}

export async function saveTheme(formData: FormData): Promise<never> {
  return finish(await submitTheme(await getCurrentUser(), formData));
}

export async function saveDays(formData: FormData): Promise<never> {
  return finish(await submitDays(await getCurrentUser(), formData));
}

export async function saveHours(formData: FormData): Promise<never> {
  return finish(await submitHours(await getCurrentUser(), formData));
}

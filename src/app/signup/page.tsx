import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signUp } from "@/auth/actions";
import { getCurrentUser } from "@/auth/current-user";
import type { SignUpError } from "@/auth/submit";
import { SubmitButton } from "@/components/button";
import { ClubSelect } from "@/components/club-select";
import { Field, controlClassName } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { Main } from "@/components/main";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/data/limits";
import { lockoutMessage } from "@/forms/lockout-message";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sign up",
};

// The codes the signUp action redirects with, each with its own message.
// `failed` is deliberately vague: it's what an email that already has an
// account gets, and it must read the same as any other refusal that depends
// on the database.
const ERRORS: Record<SignUpError, string> = {
  email: "That doesn’t look like an email address. Nothing was saved.",
  password: `Use a password of at least ${PASSWORD_MIN_LENGTH} characters. Nothing was saved.`,
  club: "Choose your home club from the list. Nothing was saved.",
  failed:
    "We couldn’t create an account with those details. If you already have one, log in instead.",
};

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Main>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <SignUp searchParams={searchParams} />
      </Suspense>
    </Main>
  );
}

async function SignUp({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  // Someone already logged in has no use for this page. (The proxy does the
  // same with a real redirect; this is the check against the database.)
  if (await getCurrentUser()) redirect("/");

  const { error, locked } = await searchParams;
  const message =
    locked !== undefined
      ? lockoutMessage(locked)
      : typeof error === "string" && error in ERRORS
        ? ERRORS[error as SignUpError]
        : null;

  return (
    <>
      <h1>Sign up</h1>
      <p>Pick the club you play at. It’s your home club: its week is the first thing you see.</p>
      <form action={signUp} className={styles.form}>
        {message ? <FormMessage tone="error">{message}</FormMessage> : null}
        <Field id="email" label="Email">
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={EMAIL_MAX_LENGTH}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={controlClassName}
          />
        </Field>
        <Field id="password" label="Password" hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            aria-describedby="password-hint"
            className={controlClassName}
          />
        </Field>
        <Field id="homeClub" label="Home club">
          <ClubSelect id="homeClub" />
        </Field>
        <div>
          <SubmitButton>Sign up</SubmitButton>
        </div>
      </form>
      <p className={styles.alt}>
        Already have an account? <Link href="/">Log in</Link>
      </p>
    </>
  );
}

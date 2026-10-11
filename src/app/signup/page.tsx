import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signUp } from "@/auth/actions";
import { getCurrentUser } from "@/auth/current-user";
import type { SignUpError } from "@/auth/submit";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/button";
import { ClubSelect } from "@/components/club-select";
import { Field, controlClassName, describedBy, hintId } from "@/components/field";
import { Form } from "@/components/form";
import { FormMessage } from "@/components/form-message";
import { PageLoading } from "@/components/loading";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/data/limits";
import { lockoutMessage } from "@/forms/lockout-message";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create an account and choose your home tennis club.",
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

const ERROR_ID = "signup-error";

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <SignUp searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUp({ searchParams }: Pick<PageProps<"/signup">, "searchParams">) {
  // Someone already logged in has no use for this page. (The proxy does the
  // same with a real redirect; this is the check against the database.)
  if (await getCurrentUser()) redirect("/");

  const { error, locked } = await searchParams;
  const code = typeof error === "string" && error in ERRORS ? (error as SignUpError) : null;
  const message = locked !== undefined ? lockoutMessage(locked) : code ? ERRORS[code] : null;

  return (
    <AuthCard title="Sign up">
      <p>Pick the club you play at. It’s your home club: its week is the first thing you see.</p>
      <Form action={signUp}>
        {message ? (
          <FormMessage tone="error" id={ERROR_ID}>
            {message}
          </FormMessage>
        ) : null}
        <Field id="signup-email" label="Email">
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            maxLength={EMAIL_MAX_LENGTH}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={code === "email" || undefined}
            aria-describedby={describedBy(code === "email" && ERROR_ID)}
            className={controlClassName}
          />
        </Field>
        <Field
          id="signup-password"
          label="Password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        >
          <input
            id="signup-password"
            name="password"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            aria-invalid={code === "password" || undefined}
            aria-describedby={describedBy(hintId("signup-password"), code === "password" && ERROR_ID)}
            className={controlClassName}
          />
        </Field>
        <Field id="signup-club" label="Home club">
          <ClubSelect
            id="signup-club"
            invalid={code === "club"}
            describedBy={describedBy(code === "club" && ERROR_ID)}
          />
        </Field>
        <div>
          <SubmitButton>Sign up</SubmitButton>
        </div>
      </Form>
      <p>
        Already have an account? <Link href="/">Log in</Link>
      </p>
    </AuthCard>
  );
}

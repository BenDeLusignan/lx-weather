import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { changeHomeClub, changePassword, logOut } from "@/auth/actions";
import { getCurrentUser } from "@/auth/current-user";
import type { PasswordChangeError } from "@/auth/submit";
import { findClub } from "@/clubs/lookup";
import { SubmitButton } from "@/components/button";
import { DayHoursGroup } from "@/components/day-hours-group";
import { ClubSelect } from "@/components/club-select";
import { Field, controlClassName, describedBy, hintId } from "@/components/field";
import { Form } from "@/components/form";
import { FormMessage } from "@/components/form-message";
import { PageLoading } from "@/components/loading";
import { Narrow } from "@/components/narrow";
import { NewPasswordInput } from "@/components/new-password-input";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/data/limits";
import { lockoutMessage } from "@/forms/lockout-message";
import { PASSWORD_REQUIREMENT } from "@/forms/password-rules";
import { saveDays } from "@/preferences/actions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Account",
  description: "Your email, your home club, your password, the days and times you see, and log out.",
};

// The codes the changePassword action redirects with, each with its own message.
// A wrong current password only says it is wrong: nothing beyond what was typed.
const PASSWORD_ERRORS: Record<PasswordChangeError, string> = {
  "password-invalid": "Enter your current password. Nothing was changed.",
  "password-weak": `Use a new password of ${PASSWORD_REQUIREMENT}. Nothing was changed.`,
  "password-mismatch": "The new password and its confirmation don’t match. Nothing was changed.",
  "password-same": "Choose a new password that is different from your current one. Nothing was changed.",
  "password-wrong": "Your current password is wrong. Nothing was changed.",
  "password-stale": "Your password was changed a moment ago, so this change wasn’t applied.",
};

const PASSWORD_MESSAGE_ID = "password-message";

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}

async function Account({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  // The real check. The proxy only looks at the cookie.
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { saved, error, wait } = await searchParams;
  // A stored club id that's no longer in the list: say so, and let them choose again.
  const homeClub = findClub(user.homeClubId);
  // Change-password flags: `wait` is a limiter refusal (`lockoutMessage` copes with a hand-made value);
  // `error` is only believed when it is one of our codes.
  const passwordError = typeof error === "string" && Object.hasOwn(PASSWORD_ERRORS, error) ? (error as PasswordChangeError) : null;
  const currentInvalid = passwordError === "password-wrong" || passwordError === "password-invalid";
  const newInvalid = passwordError === "password-weak" || passwordError === "password-same";
  const confirmInvalid = passwordError === "password-mismatch";

  return (
    <Narrow>
      <h1 className={styles.title}>Account</h1>

      <section aria-labelledby="account-details" className={styles.section}>
        <h2 id="account-details">Your details</h2>
        <dl className={styles.details}>
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Home club</dt>
          <dd>{homeClub ? homeClub.name : "None chosen"}</dd>
        </dl>
      </section>

      <section aria-labelledby="account-club" className={styles.section}>
        <h2 id="account-club">Change home club</h2>
        <Form action={changeHomeClub}>
          {/* One message takes focus: with a refused save as well, that message wins and covers both. */}
          {!homeClub && error !== "club" ? (
            <FormMessage tone="error">
              Your home club isn’t on our list any more. Choose your club to carry on.
            </FormMessage>
          ) : null}
          {error === "club" ? (
            <FormMessage tone="error" id="account-club-error">
              Choose a club from the list. Nothing was changed.
            </FormMessage>
          ) : saved === "1" ? (
            <FormMessage tone="success">Home club saved.</FormMessage>
          ) : null}
          <Field id="account-club-select" label="Home club">
            <ClubSelect
              id="account-club-select"
              selectedId={user.homeClubId}
              invalid={error === "club"}
              describedBy={error === "club" ? "account-club-error" : undefined}
            />
          </Field>
          <div>
            <SubmitButton>Save home club</SubmitButton>
          </div>
        </Form>
      </section>

      <section aria-labelledby="account-password" className={styles.section}>
        <h2 id="account-password">Change password</h2>
        <Form action={changePassword}>
          {wait !== undefined ? (
            <FormMessage tone="error" id={PASSWORD_MESSAGE_ID}>
              {lockoutMessage(wait)}
            </FormMessage>
          ) : passwordError ? (
            <FormMessage tone="error" id={PASSWORD_MESSAGE_ID}>
              {PASSWORD_ERRORS[passwordError]}
            </FormMessage>
          ) : saved === "password" ? (
            <FormMessage tone="success">Password changed. Other devices have been logged out.</FormMessage>
          ) : null}
          <Field id="password-current" label="Current password">
            <input
              id="password-current"
              name="current"
              type="password"
              required
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="current-password"
              aria-invalid={currentInvalid || undefined}
              aria-describedby={describedBy(currentInvalid && PASSWORD_MESSAGE_ID)}
              className={controlClassName}
            />
          </Field>
          <Field
            id="password-new"
            label="New password"
            hint="Changing it logs you out of your other devices."
          >
            <NewPasswordInput
              id="password-new"
              name="new"
              invalid={newInvalid}
              describedBy={describedBy(hintId("password-new"), newInvalid && PASSWORD_MESSAGE_ID)}
            />
          </Field>
          <Field id="password-confirm" label="Confirm new password">
            <input
              id="password-confirm"
              name="confirm"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              aria-invalid={confirmInvalid || undefined}
              aria-describedby={describedBy(confirmInvalid && PASSWORD_MESSAGE_ID)}
              className={controlClassName}
            />
          </Field>
          <div>
            <SubmitButton>Change password</SubmitButton>
          </div>
        </Form>
      </section>

      <section aria-labelledby="account-days" className={styles.section}>
        <h2 id="account-days">Days and times you see</h2>
        <Form action={saveDays}>
          {/* One message takes focus: the refusal that matters, or the confirmation. */}
          {error === "days" ? (
            <FormMessage tone="error">Choose at least one day. Nothing was changed.</FormMessage>
          ) : error === "times" ? (
            <FormMessage tone="error">
              Those times can’t be saved: each day’s start must be no later than its end, from 08:00 to 22:00. Nothing
              was changed.
            </FormMessage>
          ) : saved === "days" ? (
            <FormMessage tone="success">Days and times saved.</FormMessage>
          ) : null}
          <DayHoursGroup days={user.preferences.days} />
          <div>
            <SubmitButton>Save days and times</SubmitButton>
          </div>
        </Form>
      </section>

      <Form action={logOut}>
        <div>
          <SubmitButton variant="secondary">Log out</SubmitButton>
        </div>
      </Form>
    </Narrow>
  );
}

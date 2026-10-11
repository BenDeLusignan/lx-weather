import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { changeHomeClub, logOut } from "@/auth/actions";
import { getCurrentUser } from "@/auth/current-user";
import { findClub } from "@/clubs/lookup";
import { SubmitButton } from "@/components/button";
import { ChoiceGroup } from "@/components/choice-group";
import { ClubSelect } from "@/components/club-select";
import { Field } from "@/components/field";
import { Form } from "@/components/form";
import { FormMessage } from "@/components/form-message";
import { PageLoading } from "@/components/loading";
import { Narrow } from "@/components/narrow";
import { BLOCK_HOURS, WEEKDAYS, type ThemeChoice } from "@/preferences/preferences";
import { saveDays, saveHours, saveTheme } from "@/preferences/actions";
import { hourLabel } from "@/weather/format";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Account",
  description: "Your email, your home club, how the site looks, the days and hours you see, and log out.",
};

const THEME_CHOICES: readonly { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

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

  const { saved, error } = await searchParams;
  // A stored club id that's no longer in the list: say so, and let them choose again.
  const homeClub = findClub(user.homeClubId);

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

      <section aria-labelledby="account-appearance" className={styles.section}>
        <h2 id="account-appearance">Appearance</h2>
        <Form action={saveTheme}>
          {error === "theme" ? (
            <FormMessage tone="error">Choose Match my device, Light or Dark. Nothing was changed.</FormMessage>
          ) : saved === "theme" ? (
            <FormMessage tone="success">Appearance saved.</FormMessage>
          ) : null}
          <ChoiceGroup
            legend="Light or dark"
            hint="Match my device follows your phone or computer’s own light or dark setting."
            hintId="account-theme-hint"
            type="radio"
            name="theme"
            choices={THEME_CHOICES.map((choice) => ({ ...choice, checked: choice.value === user.preferences.theme }))}
          />
          <div>
            <SubmitButton>Save appearance</SubmitButton>
          </div>
        </Form>
      </section>

      <section aria-labelledby="account-days" className={styles.section}>
        <h2 id="account-days">Days you see</h2>
        <Form action={saveDays}>
          {error === "days" ? (
            <FormMessage tone="error">Choose at least one day. Nothing was changed.</FormMessage>
          ) : saved === "days" ? (
            <FormMessage tone="success">Days saved.</FormMessage>
          ) : null}
          <ChoiceGroup
            legend="Show these days"
            hint="The week always starts today. A day you switch off isn’t shown at any club."
            hintId="account-days-hint"
            type="checkbox"
            name="days"
            choices={WEEKDAYS.map((day, index) => ({
              value: day.id,
              label: day.label,
              checked: user.preferences.days.includes(index),
            }))}
          />
          <div>
            <SubmitButton>Save days</SubmitButton>
          </div>
        </Form>
      </section>

      <section aria-labelledby="account-hours" className={styles.section}>
        <h2 id="account-hours">Times you see</h2>
        <Form action={saveHours}>
          {error === "hours" ? (
            <FormMessage tone="error">Choose at least one time. Nothing was changed.</FormMessage>
          ) : saved === "hours" ? (
            <FormMessage tone="success">Times saved.</FormMessage>
          ) : null}
          <ChoiceGroup
            legend="Show these times"
            hint="10:00 means 10:00 to 11:00. Applies to every club."
            hintId="account-hours-hint"
            type="checkbox"
            name="hours"
            wide
            choices={BLOCK_HOURS.map((hour) => ({
              value: String(hour),
              label: hourLabel(hour),
              checked: user.preferences.hours.includes(hour),
            }))}
          />
          <div>
            <SubmitButton>Save times</SubmitButton>
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

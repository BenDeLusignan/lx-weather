import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { changeHomeClub, logOut } from "@/auth/actions";
import { getCurrentUser } from "@/auth/current-user";
import { findClub } from "@/clubs/lookup";
import { SubmitButton } from "@/components/button";
import { ClubSelect } from "@/components/club-select";
import { Field } from "@/components/field";
import { Form } from "@/components/form";
import { FormMessage } from "@/components/form-message";
import { PageLoading } from "@/components/loading";
import { Narrow } from "@/components/narrow";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Account",
  description: "Your email, your home club, and log out.",
};

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

      <Form action={logOut}>
        <div>
          <SubmitButton variant="secondary">Log out</SubmitButton>
        </div>
      </Form>
    </Narrow>
  );
}

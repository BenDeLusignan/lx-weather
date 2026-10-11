import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { changeHomeClub, logOut } from "@/auth/actions";
import { getCurrentUser } from "@/auth/current-user";
import { findClub } from "@/clubs/lookup";
import { SubmitButton } from "@/components/button";
import { ClubSelect } from "@/components/club-select";
import { Field } from "@/components/field";
import { FormMessage } from "@/components/form-message";
import { Main } from "@/components/main";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Main>
      <Suspense fallback={<p role="status">Loading…</p>}>
        <Account searchParams={searchParams} />
      </Suspense>
    </Main>
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
    <>
      <h1>Account</h1>
      <dl className={styles.details}>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Home club</dt>
        <dd>{homeClub ? homeClub.name : "None chosen"}</dd>
      </dl>

      <h2>Change home club</h2>
      <form action={changeHomeClub} className={styles.form}>
        {!homeClub ? (
          <FormMessage tone="error">
            Your home club isn’t on our list any more. Choose your club to carry on.
          </FormMessage>
        ) : null}
        {error === "club" ? (
          <FormMessage tone="error">Choose a club from the list. Nothing was changed.</FormMessage>
        ) : saved === "1" ? (
          <FormMessage tone="success">Home club saved.</FormMessage>
        ) : null}
        <Field id="homeClub" label="Home club">
          <ClubSelect id="homeClub" selectedId={user.homeClubId} />
        </Field>
        <div>
          <SubmitButton>Save home club</SubmitButton>
        </div>
      </form>

      <form action={logOut} className={styles.logOut}>
        <SubmitButton>Log out</SubmitButton>
      </form>
    </>
  );
}

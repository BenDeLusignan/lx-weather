import Link from "next/link";
import { logIn } from "@/auth/actions";
import { AuthCard } from "@/components/auth-card";
import { SubmitButton } from "@/components/button";
import { Field, controlClassName } from "@/components/field";
import { Form } from "@/components/form";
import { FormMessage } from "@/components/form-message";
import { EMAIL_MAX_LENGTH } from "@/data/limits";
import { lockoutMessage } from "@/forms/lockout-message";

/**
 * The landing page for someone who isn't logged in (Core flow 1). `failed` and
 * `locked` are the URL flags the logIn action redirects with. Wrong details
 * always get the same message, whether or not the email has an account.
 */
export function LoginForm({ failed, locked }: { failed: boolean; locked: string | string[] | undefined }) {
  return (
    <AuthCard title="Log in">
      <p>One week of hour-by-hour playing conditions for your tennis club.</p>
      <Form action={logIn}>
        {locked !== undefined ? (
          <FormMessage tone="error">{lockoutMessage(locked)}</FormMessage>
        ) : failed ? (
          <FormMessage tone="error">
            That email address and password don’t match. Check both and try again.
          </FormMessage>
        ) : null}
        <Field id="login-email" label="Email">
          <input
            id="login-email"
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
        <Field id="login-password" label="Password">
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={controlClassName}
          />
        </Field>
        <div>
          <SubmitButton>Log in</SubmitButton>
        </div>
      </Form>
      <p>
        New here? <Link href="/signup">Sign up</Link>
      </p>
    </AuthCard>
  );
}

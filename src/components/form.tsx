import type { ReactNode } from "react";
import styles from "./form.module.css";

/**
 * A form whose fields stack with one gap between them. Server Actions are
 * passed as `action`, so it works as a plain POST before JavaScript loads.
 */
export function Form({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form action={action} className={styles.form}>
      {children}
    </form>
  );
}

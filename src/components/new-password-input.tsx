"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PASSWORD_MAX_LENGTH } from "@/data/limits";
import { PASSWORD_RULES } from "@/forms/password-rules";
import { controlClassName, describedBy } from "./field";
import styles from "./new-password-input.module.css";

/**
 * The input for choosing a password (sign-up, and the new password on
 * Account) with the live checklist of the rules beneath it. It is a client
 * component for one reason: the list has to react to each keystroke. The
 * rules themselves are the shared `PASSWORD_RULES`, the very ones the server
 * enforces, so the browser and the server can't disagree.
 *
 * It only helps. Nothing here blocks the submit: the server decides, so
 * there is deliberately no `minLength` (the browser's own "lengthen this
 * text" bubble would speak before the checklist and the server's message do),
 * and with JavaScript off the form posts as normal. The server renders the
 * list as the plain statement of the rules (every row "not met yet", no state
 * words), so it reads fine before JavaScript arrives or without it.
 *
 * Why the input is uncontrolled: the page can be typed into before it has
 * hydrated (a slow phone at the courts), and a controlled input would have
 * its text reset to "". Here the DOM keeps what was typed, and the effect
 * below picks it up. Never use it for log in or "current password": those
 * must not be checked against the rules (older accounts keep working).
 *
 * `describedBy` is the ids of the other things that describe the field (its
 * hint, the error message); the checklist's own id is added to them.
 */
export function NewPasswordInput({
  id,
  name,
  invalid,
  describedBy: otherIds,
}: {
  id: string;
  name: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // null until there is anything to judge: the "not checked yet" look, and no met / not met words.
  const [value, setValue] = useState<string | null>(null);
  // What the screen reader is told; changes only when a rule flips.
  const [announcement, setAnnouncement] = useState("");
  const listId = `${id}-rules`;

  // Text typed or autofilled before this component hydrated, and the form's
  // "reset": after a Server Action React clears an uncontrolled field with
  // form.reset(), which fires no "input" event, so without this the list would
  // keep ticking rows for a field that is now empty.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (input.value) setValue(input.value);
    const form = input.form;
    const reset = () => {
      setValue(null);
      setAnnouncement("");
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.currentTarget.value;
    const before = value ?? "";
    setValue(next);
    // Say what changed, not the whole list, and nothing when no rule flipped:
    // typing "x" after a long enough "Passw0rd!" says nothing at all.
    const flipped = PASSWORD_RULES.filter((rule) => rule.met(before) !== rule.met(next));
    if (flipped.length > 0) {
      setAnnouncement(flipped.map((rule) => `${rule.label}: ${rule.met(next) ? "met" : "not met"}.`).join(" "));
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="password"
        required
        maxLength={PASSWORD_MAX_LENGTH}
        autoComplete="new-password"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(otherIds, listId)}
        className={controlClassName}
        onChange={handleChange}
        // The announcement is stale once the user moves on; don't leave it for browse mode to find.
        onBlur={() => setAnnouncement("")}
      />
      <div id={listId} className={styles.rules}>
        <p className={styles.lead}>Your password needs:</p>
        {/* role="list" because Safari/VoiceOver drops the semantics of a list with no bullets. */}
        <ul role="list" className={styles.list}>
          {PASSWORD_RULES.map((rule) => {
            const met = value !== null && rule.met(value);
            return (
              <li key={rule.id} className={styles.rule}>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                  className={`${styles.icon} ${met ? styles.met : ""}`}
                >
                  <circle cx="12" cy="12" r="9.5" className={styles.ring} />
                  {met ? <path d="M7.5 12.5l3 3 6-6.5" className={styles.tick} /> : null}
                </svg>
                <span>
                  {rule.label}
                  {value !== null ? (
                    <span className="visually-hidden">: {met ? "met" : "not met"}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {/* Polite, and atomic: one short sentence per change. Empty until the first change. */}
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
    </>
  );
}

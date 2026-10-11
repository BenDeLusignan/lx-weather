import styles from "./choice-group.module.css";

export interface Choice {
  value: string;
  label: string;
  checked: boolean;
}

/**
 * A group of native radios (pick one) or checkboxes (pick any) with a legend
 * (for screen readers; the page's heading is what sighted users see) and an
 * optional hint, so it works with no JavaScript and a screen reader hears the
 * legend with each option. Every option shares `name`, which
 * is what the Server Action reads (`formData.get` for radios, `getAll` for
 * checkboxes). `checked` is only the starting state, from what is saved.
 *
 * The inputs sit inside their labels, so no ids are needed and none can clash
 * with another form on a page Next is keeping in the DOM (Team convention 8).
 * The hint's id, if given, is the fieldset's `aria-describedby`.
 */
export function ChoiceGroup({
  legend,
  hint,
  hintId,
  type,
  name,
  choices,
  wide = false,
}: {
  legend: string;
  hint?: string;
  hintId?: string;
  type: "radio" | "checkbox";
  name: string;
  choices: readonly Choice[];
  /** Lay the options out in a grid (the twelve hours) instead of one column. */
  wide?: boolean;
}) {
  return (
    <fieldset className={styles.group} aria-describedby={hint ? hintId : undefined}>
      {/* Visually hidden: the section heading above it already names the group; a screen reader still hears this with each option. */}
      <legend className="visually-hidden">{legend}</legend>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={wide ? `${styles.choices} ${styles.wide}` : styles.choices}>
        {choices.map((choice) => (
          <label key={choice.value} className={styles.choice}>
            <input type={type} name={name} value={choice.value} defaultChecked={choice.checked} />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

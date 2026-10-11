import { clubsByName } from "@/clubs/lookup";
import { controlClassName } from "@/components/field";

/**
 * The home club choice, shared by sign-up and Account: every club,
 * alphabetical by the name shown. `selectedId` is a stored home club id; one
 * that isn't in the list (a club since removed) selects nothing, so the
 * user has to choose again rather than being quietly given a club.
 */
export function ClubSelect({ id, selectedId }: { id: string; selectedId?: string }) {
  const clubs = clubsByName();
  const selected = clubs.find((club) => club.id === selectedId)?.id ?? "";
  return (
    <select id={id} name="homeClub" required defaultValue={selected} className={controlClassName}>
      <option value="" disabled>
        Choose your club
      </option>
      {clubs.map((club) => (
        <option key={club.id} value={club.id}>
          {club.name}
        </option>
      ))}
    </select>
  );
}

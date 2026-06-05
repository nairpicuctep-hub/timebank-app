/* -------------------------------------------------------------------------
   Skill slug helpers — keep slug shape consistent across the whole app and
   identical to the server-side `add_skill` RPC.

   Canonical slug rules (must match the DB):
     • lowercase
     • trim surrounding whitespace
     • spaces AND punctuation collapse to a single underscore (never a hyphen)
     • leading/trailing underscores stripped

   IMPORTANT: the client must NEVER invent a slug for a real skill. Slugs that
   get persisted (profiles.teach_skills / learn_skills, user_skills.skill_id)
   must come from an actual `skills` row — either one returned by search_skills()
   or one freshly created by add_skill(). This helper exists for:
     • generating a *candidate* slug to compare/preview before the row exists
     • the onboarding guard that filters out any slug with no matching skills row
   ------------------------------------------------------------------------- */

export function normalizeSkillSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // spaces + punctuation -> underscore
    .replace(/^_+|_+$/g, '')     // strip leading/trailing underscores
}

/** Given the slugs the user picked and the set of slugs that actually exist in
 *  the skills table, return only the canonical ones — so an orphan slug can
 *  never be written to a profile array. */
export function keepCanonicalSlugs(picked: string[], existingSlugs: Iterable<string>): string[] {
  const valid = new Set(existingSlugs)
  return picked.filter(slug => valid.has(slug))
}

/**
 * Faces for the workforce.
 *
 * There is no photo column on Employee and no upload flow, so the images in
 * public/avatars are dealt out to people instead. The deal has to be *stable*:
 * a face that changed between the employee list and the payslip would read as
 * two different people, and one that changed on every render would flicker. So
 * it is a hash of the person's name rather than a random draw — the same name
 * always lands on the same picture, on every screen and every reload.
 *
 * Keyed on the name because that is the one field present at every call site;
 * the employee id is not (the payslip and contract lists carry a code, the
 * sidebar carries only the signed-in user's name).
 */

export const AVATARS = [
  '/avatars/avatar-1.avif',
  '/avatars/avatar-2.jpeg',
  '/avatars/avatar-3.jpeg',
  '/avatars/avatar-4.webp',
  '/avatars/avatar-5.avif',
] as const;

/**
 * FNV-1a. Cheap, and it scatters near-identical inputs — "Priya Sharma" and
 * "Priya Singh" land on different pictures, which a simple character sum would
 * not manage.
 */
const hash = (value: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** The picture for a person, or undefined when there is no name to key on. */
export const avatarFor = (name?: string | null): string | undefined => {
  const key = name?.trim().toLowerCase();
  if (!key) return undefined;
  return AVATARS[hash(key) % AVATARS.length];
};

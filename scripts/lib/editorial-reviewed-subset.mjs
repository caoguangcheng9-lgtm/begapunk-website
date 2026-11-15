// Partial evidence capture does not approve the untouched pages. The existing
// release verifier still compares every configured artifact with its snapshot.
export function reviewedSubsetSnapshots(previous, current, reviewedPaths) {
  const prior = new Map(previous.map(a => [a.path, a]));
  const actual = new Map(current.map(a => [a.path, a]));
  if (!Array.isArray(reviewedPaths) || !reviewedPaths.length
      || new Set(reviewedPaths).size !== reviewedPaths.length) {
    throw new Error('Reviewed subset must be non-empty and contain no duplicates.');
  }
  if (prior.size !== previous.length || actual.size !== current.length
      || prior.size !== actual.size || [...prior.keys()].some(p => !actual.has(p))) {
    throw new Error('Reviewed subset cannot add or remove configured artifacts.');
  }
  for (const p of reviewedPaths) {
    if (!prior.has(p) || !actual.has(p)
        || prior.get(p).semanticSha256 === actual.get(p).semanticSha256) {
      throw new Error(`Reviewed subset path must have an actual semantic change: ${p}`);
    }
  }
  const selected = new Set(reviewedPaths);
  return current.map(a => selected.has(a.path) ? a : prior.get(a.path));
}

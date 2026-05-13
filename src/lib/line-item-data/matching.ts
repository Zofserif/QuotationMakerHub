export const defaultLineItemUnit = "Unit";

export function normalizeLineItemTitleKey(title: string) {
  return title.trim().toLowerCase();
}

export function dedupeLineItemDataDraftsByTitle<T extends { title: string }>(
  drafts: T[],
) {
  const draftsByTitle = new Map<string, T>();

  for (const draft of drafts) {
    const key = normalizeLineItemTitleKey(draft.title);

    if (draftsByTitle.has(key)) {
      draftsByTitle.delete(key);
    }

    draftsByTitle.set(key, draft);
  }

  return [...draftsByTitle.values()];
}

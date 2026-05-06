function normalizeTutorialUrl(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return "";
  }

  return /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
}

export const tutorialUrls = {
  dashboard: normalizeTutorialUrl(process.env.NEXT_PUBLIC_DASHBOARD_TUTORIAL_URL),
  lineItemData: normalizeTutorialUrl(
    process.env.NEXT_PUBLIC_LINE_ITEM_DATA_TUTORIAL_URL,
  ),
  newQuote: normalizeTutorialUrl(process.env.NEXT_PUBLIC_NEW_QUOTE_TUTORIAL_URL),
  quoteTemplate: normalizeTutorialUrl(
    process.env.NEXT_PUBLIC_QUOTE_TEMPLATE_TUTORIAL_URL,
  ),
};

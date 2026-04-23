export function getLineItemImageSrc(input: {
  descriptionImageUrl?: string;
  descriptionImageStoragePath?: string;
}) {
  if (input.descriptionImageUrl) {
    return input.descriptionImageUrl;
  }

  return input.descriptionImageStoragePath?.startsWith("data:")
    ? input.descriptionImageStoragePath
    : undefined;
}

export function basePlanStoragePath(
  planNumber: string,
  variant: string | null,
  fileName: string
) {
  const slug = variant
    ? variant.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : planNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `base-plans/${planNumber}/${slug}/${fileName}`;
}

export type CatalogAssetOption = {
  label: string;
  value: string;
};

export function optionFromRecord(record: Record<string, unknown>) {
  const title = String(record.title ?? record.name ?? record.id ?? "");
  const key = String(record["@key"] ?? record.key ?? record.title ?? record.id ?? record.number ?? "");
  const number = String(record.number ?? "");

  if (!key) {
    return null;
  }

  if (title) {
    const label = number ? `${title} - temporada ${number}` : title;
    return { label, value: key };
  }

  if (number) {
    return { label: `Temporada ${number}`, value: key };
  }

  return { label: key, value: key };
}

// Whitelisted, type-checked product fields accepted from the client.
// Anything else in the request body (organizationId, _id, timestamps…) is ignored.

const STRING_FIELDS = [
  "name", "sku", "barcode", "category", "unit", "batchNumber", "genericName",
  "serialNumber", "size", "color", "expiryTime", "flavour",
] as const;
const NUMBER_FIELDS = ["price", "costPrice", "warrantyMonths", "preparationTime", "weightGrams"] as const;
const DATE_FIELDS = ["expiryDate", "bakedDate"] as const;

export function sanitizeProductInput(body: any, { partial }: { partial: boolean }): { data: Record<string, any>; error?: string } {
  const data: Record<string, any> = {};

  for (const f of STRING_FIELDS) {
    if (body[f] === undefined) continue;
    data[f] = String(body[f] ?? "").trim().slice(0, 300);
  }
  for (const f of NUMBER_FIELDS) {
    if (body[f] === undefined || body[f] === "") continue;
    const n = Number(body[f]);
    if (!Number.isFinite(n) || n < 0) return { data, error: `Invalid value for ${f}` };
    data[f] = n;
  }
  for (const f of DATE_FIELDS) {
    if (body[f] === undefined) continue;
    if (!body[f]) {
      data[f] = undefined;
      continue;
    }
    const d = new Date(body[f]);
    if (Number.isNaN(d.getTime())) return { data, error: `Invalid date for ${f}` };
    data[f] = d;
  }
  if (body.isPerishable !== undefined) data.isPerishable = !!body.isPerishable;

  if (!partial) {
    if (!data.name) return { data, error: "Product name is required" };
    if (!data.sku) return { data, error: "SKU is required" };
    if (data.price === undefined || data.price <= 0) return { data, error: "Price must be greater than 0" };
  } else {
    if (data.name === "") return { data, error: "Product name cannot be empty" };
    if (data.sku === "") return { data, error: "SKU cannot be empty" };
    if (data.price !== undefined && data.price <= 0) return { data, error: "Price must be greater than 0" };
  }

  if (data.sku) data.sku = data.sku.toUpperCase();
  return { data };
}

/**
 * Single source of truth for who may open which page and call which action.
 * Pure data + helpers (no server imports) so the middleware, API guards and the sidebar all share it.
 *
 * Platform roles run the SaaS (tenants, billing, support) and never operate a store directly —
 * a super admin only acts inside a store through "View as Tenant" (impersonation), which issues a
 * separate short-lived session with the store admin role.
 */

export type Role = "super_admin" | "platform_support" | "admin" | "manager" | "cashier";

export const PLATFORM_ROLES: Role[] = ["super_admin", "platform_support"];
export const STORE_ROLES: Role[] = ["admin", "manager", "cashier"];
export const STORE_MANAGER_ROLES: Role[] = ["admin", "manager"];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  platform_support: "Platform Support",
  admin: "Store Admin",
  manager: "Manager",
  cashier: "Cashier",
};

export function isPlatformRole(role?: string): boolean {
  return PLATFORM_ROLES.includes(role as Role);
}

export function isStoreManagerRole(role?: string): boolean {
  return STORE_MANAGER_ROLES.includes(role as Role);
}

// ─── Platform actions ───────────────────────────────────────────────

export type PlatformAction =
  | "read_analytics"
  | "record_payment"
  | "manage_support"
  | "suspend_tenant"
  | "reset_user_pin"
  | "impersonate_tenant"
  | "terminate_tenant"
  | "manage_pricing"
  | "manage_integrations";

// Everything else is open to both platform roles
const SUPER_ADMIN_ONLY_ACTIONS: PlatformAction[] = [
  "impersonate_tenant",
  "terminate_tenant",
  "manage_pricing",
  "manage_integrations",
];

export function canPerformPlatformAction(role: string | undefined, action: PlatformAction): boolean {
  if (role === "super_admin") return true;
  if (role === "platform_support") return !SUPER_ADMIN_ONLY_ACTIONS.includes(action);
  return false;
}

// ─── Store pages ────────────────────────────────────────────────────

// First matching prefix wins; "/" only matches the dashboard itself.
const STORE_PAGE_ACCESS: { path: string; roles: Role[] }[] = [
  { path: "/pos", roles: STORE_ROLES },
  { path: "/orders", roles: STORE_ROLES },
  { path: "/kds", roles: STORE_ROLES },
  { path: "/consultations", roles: STORE_ROLES },
  { path: "/hr", roles: STORE_ROLES }, // attendance clock-in terminal; payroll inside is manager-only
  { path: "/products", roles: STORE_MANAGER_ROLES },
  { path: "/inventory", roles: STORE_MANAGER_ROLES },
  { path: "/doctors", roles: STORE_MANAGER_ROLES },
  { path: "/reports", roles: STORE_MANAGER_ROLES },
  { path: "/accounting", roles: STORE_MANAGER_ROLES },
  { path: "/settings", roles: STORE_MANAGER_ROLES },
  { path: "/support", roles: STORE_MANAGER_ROLES },
  { path: "/", roles: STORE_MANAGER_ROLES }, // sales dashboard
];

function matches(pathname: string, path: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Whether a store user may open a store page. Unknown pages are closed by default. */
export function canAccessStorePage(role: string | undefined, pathname: string): boolean {
  const rule = STORE_PAGE_ACCESS.find((r) => matches(pathname, r.path));
  return !!rule && rule.roles.includes(role as Role);
}

/** Landing page after login for each store role. */
export function storeHomeFor(role: string | undefined): string {
  return role === "cashier" ? "/pos" : "/";
}

// ─── Store APIs ─────────────────────────────────────────────────────

// Store-operation APIs. Platform staff get 403 here unless they are impersonating a store,
// so the platform HQ organisation can never be used as a working store.
const STORE_API_PREFIXES = [
  "/api/orders",
  "/api/kot",
  "/api/products",
  "/api/inventory",
  "/api/refunds",
  "/api/counter-session",
  "/api/tables",
  "/api/branches",
  "/api/users",
  "/api/hr",
  "/api/doctors",
  "/api/consultations",
  "/api/reports",
  "/api/accounting/ledger",
  "/api/auth/verify-pin",
];

export function isStoreApi(pathname: string): boolean {
  return STORE_API_PREFIXES.some((p) => matches(pathname, p));
}

/**
 * Single source of truth for who may open which page and call which action.
 * Pure data + helpers (no server imports) so the middleware, API guards and the sidebar all share it.
 *
 * Platform roles run the SaaS (tenants, billing, support) and never operate a store directly —
 * a super admin only acts inside a store through "View as Tenant" (impersonation), which issues a
 * separate short-lived session with the store admin role.
 */

export type Role =
  | "super_admin"
  | "platform_admin"
  | "platform_support"
  | "platform_agent"
  | "admin"
  | "manager"
  | "cashier";

export const PLATFORM_ROLES: Role[] = ["super_admin", "platform_admin", "platform_support", "platform_agent"];
// Super admin and platform admin have identical powers (the admin only cannot touch super admin accounts)
export const FULL_PLATFORM_ROLES: Role[] = ["super_admin", "platform_admin"];
// Roles a super admin / admin can give from the User Management screen
export const ASSIGNABLE_PLATFORM_ROLES: Role[] = ["platform_admin", "platform_agent", "platform_support"];
export const STORE_ROLES: Role[] = ["admin", "manager", "cashier"];
export const STORE_MANAGER_ROLES: Role[] = ["admin", "manager"];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  platform_admin: "Admin",
  platform_support: "Platform Support",
  platform_agent: "Sales Agent",
  admin: "Store Admin",
  manager: "Manager",
  cashier: "Cashier",
};

export function isPlatformRole(role?: string): boolean {
  return PLATFORM_ROLES.includes(role as Role);
}

/** Super admin or platform admin: full platform powers. */
export function isFullPlatformRole(role?: string): boolean {
  return FULL_PLATFORM_ROLES.includes(role as Role);
}

export function isStoreManagerRole(role?: string): boolean {
  return STORE_MANAGER_ROLES.includes(role as Role);
}

// ─── Platform actions ───────────────────────────────────────────────

export type PlatformAction =
  | "read_analytics"
  | "record_payment"
  | "manage_support"
  | "manage_leads"
  | "suspend_tenant"
  | "reset_user_pin"
  | "impersonate_tenant"
  | "terminate_tenant"
  | "manage_pricing"
  | "manage_integrations"
  | "manage_fbr"
  | "manage_platform_users"
  | "view_agents"
  | "run_demos";

// Platform support gets everything except these
const SUPER_ADMIN_ONLY_ACTIONS: PlatformAction[] = [
  "impersonate_tenant",
  "terminate_tenant",
  "manage_pricing",
  "manage_integrations",
  "manage_fbr", // tax credentials of a tenant
  "manage_platform_users",
  "view_agents",
  "run_demos",
];

// A sales agent only creates and reports on 24-hour demo stores
const AGENT_ACTIONS: PlatformAction[] = ["run_demos"];

export function canPerformPlatformAction(role: string | undefined, action: PlatformAction): boolean {
  if (isFullPlatformRole(role)) return true;
  if (role === "platform_support") return !SUPER_ADMIN_ONLY_ACTIONS.includes(action);
  if (role === "platform_agent") return AGENT_ACTIONS.includes(action);
  return false;
}

// ─── Platform pages ─────────────────────────────────────────────────

// First matching prefix wins; /super-admin itself (the dashboard) is checked last.
const PLATFORM_PAGE_ACCESS: { path: string; roles: Role[] }[] = [
  { path: "/super-admin/agent", roles: ["super_admin", "platform_admin", "platform_agent"] }, // demo desk
  { path: "/super-admin/agents", roles: FULL_PLATFORM_ROLES }, // agent progress
  { path: "/super-admin/users", roles: FULL_PLATFORM_ROLES },
  { path: "/super-admin/integrations", roles: FULL_PLATFORM_ROLES },
  { path: "/super-admin", roles: ["super_admin", "platform_admin", "platform_support"] },
];

/** Whether a platform user may open a /super-admin page. */
export function canAccessPlatformPage(role: string | undefined, pathname: string): boolean {
  // "/super-admin/agent" must not swallow "/super-admin/agents"
  const rule = PLATFORM_PAGE_ACCESS.find((r) => matches(pathname, r.path));
  return !!rule && rule.roles.includes(role as Role);
}

/** Landing page after login for each platform role. */
export function platformHomeFor(role: string | undefined): string {
  return role === "platform_agent" ? "/super-admin/agent" : "/super-admin";
}

// ─── Store pages ────────────────────────────────────────────────────

// First matching prefix wins.
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
  { path: "/dashboard", roles: STORE_MANAGER_ROLES }, // sales dashboard
];

function matches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Whether a store user may open a store page. Unknown pages are closed by default. */
export function canAccessStorePage(role: string | undefined, pathname: string): boolean {
  const rule = STORE_PAGE_ACCESS.find((r) => matches(pathname, r.path));
  return !!rule && rule.roles.includes(role as Role);
}

/** Landing page after login for each store role. */
export function storeHomeFor(role: string | undefined): string {
  return role === "cashier" ? "/pos" : "/dashboard";
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
  "/api/fbr",
  "/api/staff-reset-requests",
];

export function isStoreApi(pathname: string): boolean {
  return STORE_API_PREFIXES.some((p) => matches(pathname, p));
}

import { describe, it, expect } from "vitest";
import {
  canAccessPlatformPage,
  canAccessStorePage,
  canPerformPlatformAction,
  isFullPlatformRole,
  isPlatformRole,
  platformHomeFor,
  isStoreApi,
  storeHomeFor,
} from "@/lib/auth/permissions";

describe("store page access", () => {
  it("keeps cashiers on till screens", () => {
    for (const path of ["/pos", "/orders", "/kds", "/consultations", "/hr"]) {
      expect(canAccessStorePage("cashier", path)).toBe(true);
    }
    for (const path of ["/dashboard", "/products", "/inventory/stock", "/reports", "/reports/doctors", "/accounting/ledger", "/settings/team", "/settings/printers", "/support", "/doctors"]) {
      expect(canAccessStorePage("cashier", path)).toBe(false);
    }
  });

  it("lets managers and admins open every store page", () => {
    for (const role of ["admin", "manager"]) {
      for (const path of ["/dashboard", "/pos", "/products", "/reports", "/settings/team", "/support", "/accounting/ledger"]) {
        expect(canAccessStorePage(role, path)).toBe(true);
      }
    }
  });

  it("closes unknown pages and does not treat prefixes loosely", () => {
    expect(canAccessStorePage("admin", "/something-new")).toBe(false);
    expect(canAccessStorePage("cashier", "/posx")).toBe(false);
    expect(canAccessStorePage(undefined, "/pos")).toBe(false);
  });

  it("sends each role to its home page", () => {
    expect(storeHomeFor("cashier")).toBe("/pos");
    expect(storeHomeFor("manager")).toBe("/dashboard");
    expect(storeHomeFor("admin")).toBe("/dashboard");
  });
});

describe("platform actions", () => {
  it("gives super admin everything", () => {
    for (const action of ["read_analytics", "impersonate_tenant", "terminate_tenant", "manage_pricing", "manage_integrations"] as const) {
      expect(canPerformPlatformAction("super_admin", action)).toBe(true);
    }
  });

  it("keeps platform support out of super-admin-only actions", () => {
    expect(canPerformPlatformAction("platform_support", "read_analytics")).toBe(true);
    expect(canPerformPlatformAction("platform_support", "record_payment")).toBe(true);
    for (const action of ["impersonate_tenant", "terminate_tenant", "manage_pricing", "manage_integrations", "manage_fbr"] as const) {
      expect(canPerformPlatformAction("platform_support", action)).toBe(false);
    }
  });

  it("gives store roles no platform actions", () => {
    for (const role of ["admin", "manager", "cashier", undefined]) {
      expect(canPerformPlatformAction(role, "read_analytics")).toBe(false);
    }
  });
});

describe("store APIs", () => {
  it("recognises store-operation endpoints only", () => {
    expect(isStoreApi("/api/orders")).toBe(true);
    expect(isStoreApi("/api/products/abc")).toBe(true);
    expect(isStoreApi("/api/hr/payroll")).toBe(true);
    expect(isStoreApi("/api/auth/verify-pin")).toBe(true);
    expect(isStoreApi("/api/auth/me")).toBe(false);
    expect(isStoreApi("/api/support")).toBe(false);
    expect(isStoreApi("/api/super-admin/health")).toBe(false);
    expect(isStoreApi("/api/ordersx")).toBe(false);
  });
});

describe("platform admin and sales agent roles", () => {
  it("gives platform admin the same powers as super admin", () => {
    for (const action of ["impersonate_tenant", "terminate_tenant", "manage_pricing", "manage_platform_users", "view_agents", "run_demos"] as const) {
      expect(canPerformPlatformAction("platform_admin", action)).toBe(true);
    }
    expect(isFullPlatformRole("platform_admin")).toBe(true);
    expect(isPlatformRole("platform_admin")).toBe(true);
  });

  it("limits a sales agent to demos", () => {
    expect(canPerformPlatformAction("platform_agent", "run_demos")).toBe(true);
    for (const action of ["read_analytics", "record_payment", "manage_support", "manage_leads", "manage_platform_users", "view_agents", "impersonate_tenant"] as const) {
      expect(canPerformPlatformAction("platform_agent", action)).toBe(false);
    }
  });

  it("keeps support out of user management and demos", () => {
    for (const action of ["manage_platform_users", "view_agents", "run_demos"] as const) {
      expect(canPerformPlatformAction("platform_support", action)).toBe(false);
    }
  });

  it("routes each platform role to its own pages", () => {
    expect(platformHomeFor("platform_agent")).toBe("/super-admin/agent");
    expect(platformHomeFor("platform_admin")).toBe("/super-admin");
    expect(canAccessPlatformPage("platform_agent", "/super-admin/agent")).toBe(true);
    for (const path of ["/super-admin", "/super-admin/tenants", "/super-admin/agents", "/super-admin/users", "/super-admin/support"]) {
      expect(canAccessPlatformPage("platform_agent", path)).toBe(false);
    }
    for (const path of ["/super-admin", "/super-admin/users", "/super-admin/agents", "/super-admin/agent", "/super-admin/integrations"]) {
      expect(canAccessPlatformPage("platform_admin", path)).toBe(true);
    }
    expect(canAccessPlatformPage("platform_support", "/super-admin/tenants")).toBe(true);
    expect(canAccessPlatformPage("platform_support", "/super-admin/users")).toBe(false);
  });
});

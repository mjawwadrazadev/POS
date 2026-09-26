import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "platform-config-"));
process.env.PLATFORM_CONFIG_PATH = path.join(tmpDir, "platform-config.json");

const config = await import("@/lib/config/platformConfig");

describe("platform config", () => {
  beforeEach(() => {
    fs.rmSync(process.env.PLATFORM_CONFIG_PATH!, { force: true });
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("falls back to environment variables, and saved values override them", () => {
    expect(config.getConfigSource("resendApiKey")).toBe("unset");

    process.env.RESEND_API_KEY = "re_from_env";
    expect(config.getConfigValue("resendApiKey")).toBe("re_from_env");
    expect(config.getConfigSource("resendApiKey")).toBe("env");

    config.updateConfig({ resendApiKey: "re_saved" });
    expect(config.getConfigValue("resendApiKey")).toBe("re_saved");
    expect(config.getConfigSource("resendApiKey")).toBe("saved");

    config.updateConfig({ resendApiKey: null });
    expect(config.getConfigValue("resendApiKey")).toBe("re_from_env");
  });

  it("generates and persists a JWT secret when none exists", () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const secret = config.getJwtSecret();
      expect(secret).toHaveLength(96);
      expect(config.getJwtSecret()).toBe(secret);
      expect(JSON.parse(fs.readFileSync(process.env.PLATFORM_CONFIG_PATH!, "utf8")).jwtSecret).toBe(secret);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it("masks secrets and MongoDB passwords", () => {
    expect(config.maskSecret("re_1234567890abcdef")).toBe("re_1••••••••cdef");
    expect(config.maskMongoUri("mongodb+srv://pos:S3cret@cluster0.abc.mongodb.net/masterpos")).toBe(
      "mongodb+srv://pos:••••••••@cluster0.abc.mongodb.net/masterpos"
    );
  });

  it("validates MongoDB URLs", () => {
    expect(config.validateMongoUriFormat("mongodb+srv://u:p@c.mongodb.net/masterpos?retryWrites=true")).toBeNull();
    expect(config.validateMongoUriFormat("http://example.com/db")).toMatch(/must start/);
    expect(config.validateMongoUriFormat("mongodb+srv://u:<db_password>@c.mongodb.net/masterpos")).toMatch(/placeholder/);
    expect(config.validateMongoUriFormat("mongodb+srv://u:p@c.mongodb.net/?retryWrites=true")).toMatch(/database name/);
  });
});

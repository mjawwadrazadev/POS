import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { BusinessType } from "@/lib/config/verticals";

const JWT_SECRET = process.env.JWT_SECRET || "rst_pos_super_secret_key_2026";

export interface SessionPayload {
  userId: string;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "manager" | "cashier";
  organizationId: string;
  organizationName?: string;
  businessType?: BusinessType;
  branchId?: string;
  branchName?: string;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("rst_pos_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

#!/usr/bin/env node
/**
 * RST POS print bridge.
 *
 * Browsers cannot open raw TCP connections, so network (IP) thermal/label printers are reached through
 * this small service running on the counter computer:
 *
 *   browser  --POST http://127.0.0.1:9200/print?host=192.168.1.50&port=9100-->  bridge  --TCP-->  printer
 *
 * Run it with `npm run print-bridge` (or `node tools/print-bridge.mjs`) and keep it running while the till
 * is open. It only listens on 127.0.0.1 and only forwards to printers on the local network.
 *
 * Environment:
 *   PRINT_BRIDGE_PORT      listening port (default 9200)
 *   PRINT_BRIDGE_ORIGINS   comma-separated extra origins allowed to print, e.g. https://pos.example.com
 *                          (localhost origins are always allowed)
 */
import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.PRINT_BRIDGE_PORT || 9200);
const EXTRA_ORIGINS = (process.env.PRINT_BRIDGE_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;

function originAllowed(origin) {
  if (!origin) return true; // same-machine tools such as curl
  try {
    const { hostname } = new URL(origin);
    if (["localhost", "127.0.0.1", "[::1]"].includes(hostname) || hostname.endsWith(".localhost")) return true;
  } catch {
    return false;
  }
  return EXTRA_ORIGINS.includes(origin);
}

/** Only LAN addresses, so the bridge can't be used to reach the internet. */
function isPrivateHost(host) {
  if (net.isIPv4(host)) {
    const [a, b] = host.split(".").map(Number);
    return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
  }
  if (net.isIPv6(host)) return host === "::1" || /^f[cd]/i.test(host) || /^fe80/i.test(host);
  // Hostnames on the local network (e.g. "kitchen-printer.local")
  return /^[a-z0-9-]+(\.local|\.lan)?$/i.test(host);
}

function send(res, status, body, origin) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Chrome's Private Network Access preflight, needed when the POS is served from a public https origin
    "Access-Control-Allow-Private-Network": "true",
  };
  if (origin && originAllowed(origin)) headers["Access-Control-Allow-Origin"] = origin;
  res.writeHead(status, headers);
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function printTo(host, port, data) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(TIMEOUT_MS);
    socket.on("connect", () => socket.end(data));
    socket.on("close", (hadError) => (hadError ? null : resolve()));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`Printer ${host}:${port} did not respond`));
    });
    socket.on("error", (err) => reject(new Error(`Printer ${host}:${port}: ${err.message}`)));
  });
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (!originAllowed(origin)) return send(res, 403, { error: "Origin not allowed" }, origin);
  if (req.method === "OPTIONS") return send(res, 204, undefined, origin);
  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true, service: "rst-print-bridge" }, origin);

  if (req.method === "POST" && url.pathname === "/print") {
    const host = url.searchParams.get("host") || "";
    const port = Number(url.searchParams.get("port") || 9100);
    if (!isPrivateHost(host)) return send(res, 400, { error: "Printer must be on the local network" }, origin);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return send(res, 400, { error: "Invalid port" }, origin);

    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        send(res, 413, { error: "Print job too large" }, origin);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", async () => {
      if (res.writableEnded) return;
      try {
        await printTo(host, port, Buffer.concat(chunks));
        console.log(`${new Date().toLocaleTimeString()}  printed ${size} bytes -> ${host}:${port}`);
        send(res, 200, { ok: true }, origin);
      } catch (err) {
        console.error(`${new Date().toLocaleTimeString()}  ${err.message}`);
        send(res, 502, { error: err.message }, origin);
      }
    });
    return;
  }

  send(res, 404, { error: "Not found" }, origin);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`RST POS print bridge listening on http://127.0.0.1:${PORT}`);
  console.log("Keep this window open while printing to network printers.");
});

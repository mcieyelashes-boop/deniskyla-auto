// Email verification WITHOUT sending mail — pure Node (dns + net).
//
// Strategy (and an IMPORTANT serverless caveat):
//   1. Syntax check (regex). Bad syntax        -> 'invalid'.
//   2. MX lookup via dns.resolveMx. No MX        -> 'invalid'.
//   3. Best-effort SMTP handshake to MX:25:
//        RCPT 250 -> 'valid', 550 -> 'invalid', catch-all -> 'risky',
//        anything else / timeout -> 'unknown'.
//
// SERVERLESS LIMITATION: Vercel (and most serverless/PaaS) BLOCK outbound
// connections on port 25. So the SMTP step will usually fail to connect. We
// NEVER throw in that case — we fall back to MX-only verification, returning
// status 'valid' (an MX record exists for the domain) and recording in `meta`
// that SMTP was not actually checked. Treat 'valid' from MX-only as
// "deliverable domain" rather than "confirmed mailbox".

import dns from "node:dns/promises";
import net from "node:net";

const SYNTAX_RE =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/;

/**
 * @returns {Promise<{email, status:'valid'|'invalid'|'unknown'|'risky', mx?:string, meta:object}>}
 */
export async function verifyEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const meta = { syntax: false, mxFound: false, smtpChecked: false };

  if (!SYNTAX_RE.test(e)) {
    return { email: e, status: "invalid", meta: { ...meta, reason: "syntax" } };
  }
  meta.syntax = true;

  const domain = e.split("@")[1];
  let mxHost;
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      return {
        email: e,
        status: "invalid",
        meta: { ...meta, reason: "no-mx" },
      };
    }
    records.sort((a, b) => a.priority - b.priority);
    mxHost = records[0].exchange;
    meta.mxFound = true;
  } catch (err) {
    // Distinguish "domain truly has no mail" from a transient DNS failure.
    const code = err?.code || "";
    if (code === "ENOTFOUND" || code === "ENODATA") {
      // Domain doesn't exist / has no MX -> can't receive mail.
      return { email: e, status: "invalid", meta: { ...meta, reason: "no-mx" } };
    }
    // SERVFAIL / TIMEOUT / resolver blocked (common in restricted networks)
    // -> don't wrongly reject; report unknown.
    return { email: e, status: "unknown", meta: { ...meta, reason: "dns-error", code } };
  }

  // Best-effort SMTP. Will commonly fail from serverless (port 25 blocked).
  const smtp = await smtpProbe(mxHost, e).catch(() => null);
  if (smtp && smtp.status) {
    return {
      email: e,
      status: smtp.status,
      mx: mxHost,
      meta: { ...meta, smtpChecked: true, smtpCode: smtp.code },
    };
  }

  // MX-only fallback: domain accepts mail, mailbox unconfirmed.
  return {
    email: e,
    status: "valid",
    mx: mxHost,
    meta: {
      ...meta,
      smtpChecked: false,
      note: "MX-only verification (SMTP :25 unavailable in serverless)",
    },
  };
}

/**
 * Open an SMTP conversation and probe RCPT TO for the real address and a random
 * address (catch-all detection). Resolves to { status, code } or null on any
 * connection failure (so the caller can gracefully fall back).
 */
function smtpProbe(mxHost, email, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    const domain = email.split("@")[1];
    const sender = `verify@${domain}`;
    const random = `nx-${Date.now()}-${Math.floor(Math.random() * 1e6)}@${domain}`;

    let stage = 0; // 0 greet,1 helo,2 mailfrom,3 rcpt-real,4 rcpt-random
    let realCode = 0;
    let buf = "";
    let settled = false;

    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setEncoding("utf8");
    socket.setTimeout(timeoutMs);

    const done = (result) => {
      if (settled) return;
      settled = true;
      try {
        socket.write("QUIT\r\n");
        socket.end();
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const send = (line) => {
      try {
        socket.write(line + "\r\n");
      } catch {
        done(null);
      }
    };

    socket.on("data", (chunk) => {
      buf += chunk;
      if (!buf.endsWith("\n")) return; // wait for a full reply line
      const code = parseInt(buf.slice(0, 3), 10);
      buf = "";

      if (stage === 0) {
        if (code !== 220) return done(null);
        stage = 1;
        send(`HELO ${domain}`);
      } else if (stage === 1) {
        if (code >= 400) return done(null);
        stage = 2;
        send(`MAIL FROM:<${sender}>`);
      } else if (stage === 2) {
        if (code >= 400) return done(null);
        stage = 3;
        send(`RCPT TO:<${email}>`);
      } else if (stage === 3) {
        realCode = code;
        stage = 4;
        send(`RCPT TO:<${random}>`);
      } else if (stage === 4) {
        // Interpret results.
        if (realCode === 250 && code === 250) {
          // Accepts everything -> catch-all -> can't confirm mailbox.
          return done({ status: "risky", code: realCode });
        }
        if (realCode === 250) return done({ status: "valid", code: realCode });
        if (realCode === 550 || realCode === 551 || realCode === 553)
          return done({ status: "invalid", code: realCode });
        return done({ status: "unknown", code: realCode });
      }
    });

    socket.on("timeout", () => done(null));
    socket.on("error", () => done(null));
    socket.on("close", () => done(null));
  });
}

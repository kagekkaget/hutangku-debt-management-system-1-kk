import "server-only";
import { normalizePhone } from "./utils";

export type WaSendResult = {
  status: "sent" | "failed" | "simulated";
  response: string;
};

export function waGatewayConfig() {
  const url = process.env.WA_GATEWAY_URL?.trim();
  const token = process.env.WA_GATEWAY_TOKEN?.trim();
  const provider = (process.env.WA_GATEWAY_PROVIDER ?? "fonnte").toLowerCase();
  return {
    configured: Boolean(url && token),
    url: url ?? "",
    token: token ?? "",
    provider,
  };
}

/**
 * Sends a WhatsApp message through an HTTP API gateway.
 * Supports Fonnte-style (`Authorization: <token>`, form body: target/message),
 * Wablas-style (`Authorization: <token>`, JSON body: phone/message),
 * or a generic JSON POST (`Authorization: Bearer <token>`, JSON body: phone/message).
 *
 * If no gateway is configured, the message is "simulated" and only logged.
 */
export async function sendWhatsApp(phone: string, message: string): Promise<WaSendResult> {
  const cfg = waGatewayConfig();
  const target = normalizePhone(phone);

  if (!cfg.configured) {
    return {
      status: "simulated",
      response: "Gateway WA belum dikonfigurasi (WA_GATEWAY_URL / WA_GATEWAY_TOKEN). Pesan disimulasikan.",
    };
  }

  try {
    let res: Response;
    if (cfg.provider === "fonnte") {
      const body = new URLSearchParams({ target, message, countryCode: "62" });
      res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: cfg.token },
        body,
      });
    } else if (cfg.provider === "wablas") {
      res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: cfg.token, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: target, message }),
      });
    } else {
      res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: target, message }),
      });
    }
    const text = await res.text();
    return {
      status: res.ok ? "sent" : "failed",
      response: text.slice(0, 1000),
    };
  } catch (err) {
    return {
      status: "failed",
      response: err instanceof Error ? err.message : "Gagal menghubungi gateway",
    };
  }
}

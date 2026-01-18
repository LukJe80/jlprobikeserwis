// /api/sms/send.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const { to, message } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({ ok: false, error: "Missing 'to' or 'message'" });
    }

    const token = process.env.SMSAPI_TOKEN;
    const from = process.env.SMSAPI_FROM || "Test";

    // BEZPIECZNIK TESTOWY: wysyłka tylko na jeden numer
    const testMode = process.env.SMSAPI_TEST_MODE === "1";
    const testNumber = process.env.SMSAPI_TEST_NUMBER; // np. 48500877306

    if (!token) {
      return res.status(500).json({ ok: false, error: "SMSAPI_TOKEN not set" });
    }

    if (testMode) {
      if (!testNumber) {
        return res.status(500).json({ ok: false, error: "SMSAPI_TEST_NUMBER not set (test mode)" });
      }
      if (String(to) !== String(testNumber)) {
        return res.status(403).json({ ok: false, error: "Test mode: destination number not allowed" });
      }
    }

    const body = new URLSearchParams({
      from,
      to: String(to),
      message: String(message),
      format: "json",
      encoding: "utf-8",
    });

    const resp = await fetch("https://api.smsapi.pl/sms.do", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const raw = await resp.text();

    return res.status(resp.ok ? 200 : 502).json({
      ok: resp.ok,
      status: resp.status,
      smsapi_raw: raw,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}

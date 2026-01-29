// /api/order-photos.js
// GET /api/order-photos?id=ORDER_UUID
// GET /api/order-photos?code=PUBLIC_CODE   (opcjonalnie, jeśli kiedyś wrócisz do public_code)

const { createClient } = require("@supabase/supabase-js");

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  // CORS (żeby działało z SMS/telefonu, przeglądarek itd.)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 200, { ok: true });

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, OPTIONS");
      return json(res, 405, { error: "Method not allowed" });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(res, 500, {
        error: "Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const code = (req.query.code || "").toString().trim();
    const id = (req.query.id || "").toString().trim();

    if (!code && !id) {
      return json(res, 400, { error: "Provide ?id=ORDER_UUID (or ?code=...)" });
    }

    let q = supabase
      .from("order_photos")
      .select("id, order_id, path, created_at")
      .order("created_at", { ascending: false });

    // U Ciebie docelowo i tak id=order_id
    if (id) q = q.eq("order_id", id);
    else q = q.eq("public_code", code);

    const { data, error } = await q;
    if (error) return json(res, 500, { error: error.message });

    const rows = (data || []).map((r) => {
      const { data: pub } = supabase.storage
        .from("order-photos")
        .getPublicUrl(r.path);

      return {
        id: r.id,
        order_id: r.order_id,
        path: r.path,
        created_at: r.created_at,
        url: pub?.publicUrl || null,
      };
    });

    return json(res, 200, { count: rows.length, photos: rows });
  } catch (e) {
    return json(res, 500, { error: e?.message || String(e) });
  }
};

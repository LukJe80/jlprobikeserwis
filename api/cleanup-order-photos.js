// api/cleanup-order-photos.js
// Usuwa zdjęcia ze Storage + rekordy z order_photos dla zleceń zarchiwizowanych > 12 miesięcy.
// Wymaga ENV na Vercel:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// Opcjonalnie:
// - CLEANUP_SECRET  (żeby nikt z zewnątrz nie odpalał endpointu)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLEANUP_SECRET = process.env.CLEANUP_SECRET || "";

const BUCKET = "order-photos";
const MONTHS = 12;

function json(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

async function sb(path, { method = "GET", query = "", body = null } = {}) {
  const url = `${SUPABASE_URL}${path}${query ? `?${query}` : ""}`;
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!r.ok) {
    const err = new Error(typeof data === "string" ? data : (data?.message || "Supabase error"));
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  try {
    // Zabezpieczenie (opcjonalne, ale bardzo polecam)
    if (CLEANUP_SECRET) {
      const got = (req.headers["x-cleanup-secret"] || req.query?.secret || "").toString();
      if (got !== CLEANUP_SECRET) {
        return json(res, 401, { error: "unauthorized" });
      }
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(res, 500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    // 1) znajdź order_id dla zleceń zarchiwizowanych > 12 miesięcy
    // archived_at < now() - interval '12 months'
    // Supabase REST nie ma "interval", więc liczymy datę w JS:
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - MONTHS);
    const cutoffIso = cutoff.toISOString();

    // pobierz stare order_id
    const oldOrders = await sb(
      "/rest/v1/orders",
      {
        query: [
          "select=id,archived_at",
          "archived_at=lt." + encodeURIComponent(cutoffIso),
          "archived_at=is.not.null",
          "limit=10000",
        ].join("&"),
      }
    );

    const orderIds = (oldOrders || []).map(o => o.id).filter(Boolean);

    if (orderIds.length === 0) {
      return json(res, 200, { ok: true, message: "nothing to cleanup", cutoff: cutoffIso, deletedFiles: 0, deletedRows: 0 });
    }

    // 2) pobierz listę zdjęć z order_photos dla tych orderów
    // robimy w paczkach, żeby URL nie był za długi
    let allRows = [];
    const chunkSize = 200; // bezpiecznie
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);

      // query: order_id=in.(...)
      const inList = chunk.map(id => `"${id}"`).join(",");
      const rows = await sb(
        "/rest/v1/order_photos",
        {
          query: [
            "select=id,order_id,path",
            `order_id=in.(${encodeURIComponent(inList)})`,
            "limit=10000",
          ].join("&"),
        }
      );
      allRows = allRows.concat(rows || []);
    }

    if (allRows.length === 0) {
      return json(res, 200, { ok: true, message: "no photos for old orders", cutoff: cutoffIso, deletedFiles: 0, deletedRows: 0 });
    }

    // 3) usuń pliki ze Storage (Supabase Storage API)
    const paths = allRows.map(r => r.path).filter(Boolean);

    // Storage usuwa w batchu (lista ścieżek)
    // endpoint: POST /storage/v1/object/{bucket}  body: { prefixes: [...] }
    // UWAGA: w nowszych wersjach bywa: POST /storage/v1/object/{bucket}/remove
    // Najpewniejszy jest /remove:
    const removeChunkSize = 200;
    let deletedFiles = 0;

    for (let i = 0; i < paths.length; i += removeChunkSize) {
      const pchunk = paths.slice(i, i + removeChunkSize);

      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/remove`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: pchunk }),
      });

      const t = await r.text();
      if (!r.ok) {
        throw new Error(`Storage remove failed: ${t}`);
      }

      deletedFiles += pchunk.length;
    }

    // 4) usuń rekordy z order_photos dla tych orderów
    // kasujemy po order_id in (...)
    let deletedRows = 0;
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);
      const inList = chunk.map(id => `"${id}"`).join(",");

      // Prefer: DELETE ...?order_id=in.(...)
      await sb(
        "/rest/v1/order_photos",
        {
          method: "DELETE",
          query: `order_id=in.(${encodeURIComponent(inList)})`,
        }
      );

      // liczymy “w przybliżeniu” — dokładna liczba = rows w allRows
      // (jeśli chcesz 1:1, możemy policzyć po chunkach, ale to nie jest konieczne)
    }
    deletedRows = allRows.length;

    return json(res, 200, {
      ok: true,
      cutoff: cutoffIso,
      oldOrders: orderIds.length,
      deletedFiles,
      deletedRows,
    });

  } catch (e) {
    return json(res, 500, {
      error: e?.message || String(e),
      details: e?.data || null,
      status: e?.status || null,
    });
  }
}
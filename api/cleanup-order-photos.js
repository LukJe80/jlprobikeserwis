// /api/cleanup-order-photos.js
// Wariant B: usuwa zdjęcia dla ZARCHIWIZOWANYCH zleceń,
// gdy archived_at < (teraz - 12 miesięcy).
//
// Wymaga ENV na Vercel:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - CRON_SECRET  (dowolny sekret, żeby endpointu nie odpalał nikt obcy)
//
// Bucket: order-photos
// Tabela: order_photos (kolumny: id, order_id, path, created_at)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const BUCKET = "order-photos";
const MONTHS = 12;
const ORDERS_BATCH = 200; // ile zleceń na raz
const PHOTOS_BATCH = 500; // ile zdjęć na raz

function monthsAgoIso(m) {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toISOString();
}

export default async function handler(req, res) {
  try {
    // --- auth/secret ---
    const token =
      req.headers["x-cron-secret"] ||
      req.headers["x-vercel-cron-secret"] ||
      req.query.secret;

    if (!cronSecret || String(token || "") !== String(cronSecret)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: "missing_env" });
    }

    const cutoff = monthsAgoIso(MONTHS);

    // 1) Pobierz zarchiwizowane zlecenia starsze niż 12 miesięcy
    const { data: oldOrders, error: ordErr } = await supabase
      .from("orders")
      .select("id, archived_at")
      .not("archived_at", "is", null)
      .lt("archived_at", cutoff)
      .order("archived_at", { ascending: true })
      .limit(ORDERS_BATCH);

    if (ordErr) throw ordErr;

    if (!oldOrders || oldOrders.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "Brak zarchiwizowanych zleceń starszych niż 12 miesięcy.",
        cutoff,
        deleted_files: 0,
        deleted_rows: 0,
      });
    }

    const orderIds = oldOrders.map((o) => o.id).filter(Boolean);

    // 2) Pobierz zdjęcia dla tych order_id
    // Uwaga: Supabase .in() ma limit długości — dlatego małe batch'e.
    let photos = [];
    for (let i = 0; i < orderIds.length; i += 50) {
      const chunk = orderIds.slice(i, i + 50);
      const { data: p, error: pErr } = await supabase
        .from("order_photos")
        .select("id, order_id, path")
        .in("order_id", chunk)
        .limit(PHOTOS_BATCH);

      if (pErr) throw pErr;
      if (p && p.length) photos = photos.concat(p);
    }

    if (photos.length === 0) {
      return res.status(200).json({
        ok: true,
        message:
          "Zlecenia spełniają warunek, ale brak wpisów w order_photos dla tych order_id.",
        cutoff,
        orders_matched: orderIds.length,
        deleted_files: 0,
        deleted_rows: 0,
      });
    }

    // 3) Usuń pliki ze Storage (w paczkach)
    const paths = photos.map((r) => r.path).filter(Boolean);
    let deletedFiles = 0;

    for (let i = 0; i < paths.length; i += 200) {
      const chunk = paths.slice(i, i + 200);
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(chunk);
      // Jeśli pliku nie ma, Supabase potrafi zwrócić błąd — nie zatrzymujemy całego procesu.
      if (rmErr) console.warn("Storage remove warning:", rmErr);
      deletedFiles += chunk.length;
    }

    // 4) Usuń rekordy z order_photos (w paczkach)
    const ids = photos.map((r) => r.id).filter(Boolean);
    let deletedRows = 0;

    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error: delErr } = await supabase
        .from("order_photos")
        .delete()
        .in("id", chunk);

      if (delErr) throw delErr;
      deletedRows += chunk.length;
    }

    return res.status(200).json({
      ok: true,
      cutoff,
      orders_matched: orderIds.length,
      photos_matched: photos.length,
      deleted_files: deletedFiles,
      deleted_rows: deletedRows,
      note:
        oldOrders.length === ORDERS_BATCH
          ? "Zleceń było dużo — endpoint czyści partiami. Cron dojedzie resztę kolejnego dnia."
          : "Wyczyszczono wszystko z tej partii.",
    });
  } catch (e) {
    console.error("cleanup-order-photos error:", e);
    return res.status(500).json({ error: "server_error", detail: e?.message || String(e) });
  }
}

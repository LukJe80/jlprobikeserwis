// /api/order-photos.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const ACTIVE_STATUSES = ["oczekujące", "nowe", "w trakcie", "gotowe"];

export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code || String(code).trim().length < 4) {
      return res.status(400).json({ error: "missing_code" });
    }

    const publicCode = String(code).trim();

    // 1) Najpierw: znajdź AKTYWNE zlecenie dla tego public_code
    //    (po wznowieniu klient ma widzieć NOWE zdjęcia, więc bierzemy najnowsze aktywne)
    const { data: activeOrder, error: activeErr } = await supabase
      .from("orders")
      .select("id,status,archived_at,created_at")
      .eq("public_code", publicCode)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeErr) throw activeErr;

    // Jeśli nie ma aktywnego → uznaj link za wygaszony (archiwum)
    if (!activeOrder?.id) {
      return res.status(410).json({
        error: "expired",
        message: "Galeria dla tego zlecenia jest archiwalna i link wygasł.",
      });
    }

    const orderId = activeOrder.id;

    // 2) Pobierz zdjęcia TYLKO dla aktualnego (aktywnego) order_id
    const { data: photos, error: photosErr } = await supabase
      .from("order_photos")
      .select("id,order_id,path,created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (photosErr) throw photosErr;

    // 3) Zbuduj publiczne URL z bucketu (bucket jest public)
    const out = (photos || []).map((p) => {
      const { data } = supabase.storage.from("order-photos").getPublicUrl(p.path);
      return {
        id: p.id,
        order_id: p.order_id,
        path: p.path,
        created_at: p.created_at,
        url: data?.publicUrl || null,
      };
    });

    return res.status(200).json({ count: out.length, photos: out });
  } catch (e) {
    console.error("order-photos api error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}

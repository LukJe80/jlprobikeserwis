import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "missing code" });
    }

    // 1) znajdź zlecenie po public_code
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, archived_at, status")
      .eq("public_code", code)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: "order not found" });
    }

    // 2) WYGAŚNIĘCIE LINKU PO ARCHIWUM
    // Za archiwum uznajemy: archived_at != null (ustawiasz przy "wydano")
    if (order.archived_at) {
      // 410 Gone = "było, ale już nie ma" (idealne do wygasania)
      return res.status(410).json({
        error: "expired",
        message: "Galeria dla tego zlecenia jest archiwalna i link wygasł."
      });
    }

    // 3) pobierz zdjęcia po order_id
    const { data: photos, error: photoErr } = await supabase
      .from("order_photos")
      .select("id, path, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });

    if (photoErr) {
      return res.status(500).json({ error: photoErr.message });
    }

    // 4) wygeneruj publiczne URL-e
    const result = (photos || []).map(p => ({
      ...p,
      url: supabase.storage
        .from("order-photos")
        .getPublicUrl(p.path).data.publicUrl
    }));

    return res.status(200).json({
      count: result.length,
      photos: result
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "missing code" });

    // ✅ bierzemy NAJNOWSZE AKTYWNE zlecenie dla public_code
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, archived_at, status, created_at")
      .eq("public_code", code)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // jeśli brak aktywnego → link wygasł
    if (orderErr) return res.status(500).json({ error: orderErr.message });
    if (!order) {
      return res.status(410).json({
        error: "expired",
        message: "Galeria dla tego zlecenia jest archiwalna i link wygasł."
      });
    }

    // zdjęcia po order_id (aktywnego zlecenia)
    const { data: photos, error: photoErr } = await supabase
      .from("order_photos")
      .select("id, path, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });

    if (photoErr) return res.status(500).json({ error: photoErr.message });

    const result = (photos || []).map(p => ({
      ...p,
      url: supabase.storage.from("order-photos").getPublicUrl(p.path).data.publicUrl
    }));

    return res.status(200).json({ count: result.length, photos: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

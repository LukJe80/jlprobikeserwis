import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Missing code" });
    }

    // 🔎 1. Szukamy zamówienia po public_code LUB po id
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id")
      .or(`public_code.eq.${code},id.eq.${code}`)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 📸 2. Pobieramy zdjęcia
    const { data: photos, error: photoErr } = await supabase
      .from("order_photos")
      .select("id, path, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (photoErr) {
      return res.status(500).json({ error: photoErr.message });
    }

    // 🌍 3. Budujemy PUBLIC URL-e
    const result = photos.map(p => ({
      ...p,
      url: `${process.env.SUPABASE_URL}/storage/v1/object/public/order-photos/${p.path}`
    }));

    res.status(200).json({
      count: result.length,
      photos: result
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

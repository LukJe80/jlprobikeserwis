<script>
document.getElementById("test").addEventListener("click", async () => {
  const { data, error } = await supabase
    .from("zlecenia")
    .select("*")
    .order("id", { ascending: false });

  const tbody = document.getElementById("output");
  tbody.innerHTML = "";

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">❌ Błąd: ${error.message}</td></tr>`;
    return;
  }

  data.forEach(z => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${z.id}</td>
      <td>${z.imie ?? ""}</td>
      <td>${z.telefon ?? ""}</td>
      <td>${z.typ_roweru ?? ""}</td>
      <td>${z.opis ?? ""}</td>
      <td>${z.status ?? ""}</td>
    `;
    tbody.appendChild(row);
  });
});
</script>

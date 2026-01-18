import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://mzgvxlltlcrvzmtswzql.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_u6iZP_f82VIoPc450syj4A_fhWmi9Nr";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// LOGOWANIE
// ===============================
const loginBtn = document.getElementById("login");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("error");

    errorBox.textContent = "";

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorBox.textContent = "❌ Błędny email lub hasło";
      return;
    }

    window.location.href = "/panel/index.html";
  });
}

// ===============================
// OCHRONA PANELU
// ===============================
const protectPanel = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/panel/login.html";
  }
};

if (window.location.pathname.endsWith("/panel/index.html")) {
  protectPanel();
}

// ===============================
// WYLOGOWANIE
// ===============================
const logoutBtn = document.getElementById("logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/panel/login.html";
  });
}

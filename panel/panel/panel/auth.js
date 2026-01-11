// panel/auth.js

// 🔐 PIN do panelu (na razie na sztywno)
const CORRECT_PIN = "1234";

// Elementy
const pinInput = document.getElementById("pin");
const loginBtn = document.getElementById("login");
const msg = document.getElementById("msg");

loginBtn.addEventListener("click", () => {
  const pin = pinInput.value.trim();

  if (!pin) {
    msg.textContent = "❌ Wpisz PIN";
    msg.style.color = "red";
    return;
  }

  if (pin === CORRECT_PIN) {
    // zapis sesji
    localStorage.setItem("loggedIn", "true");

    msg.textContent = "✅ Zalogowano";
    msg.style.color = "green";

    // przejście do panelu
    setTimeout(() => {
      window.location.href = "/panel/index.html";
    }, 500);
  } else {
    msg.textContent = "❌ Błędny PIN";
    msg.style.color = "red";
  }
});

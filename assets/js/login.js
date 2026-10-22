/* login.js — учебная форма входа (имитация, без реальной авторизации) */
(function () {
  if (currentUser()) { location.replace("dashboard.html"); return; }

  const form = document.getElementById("loginForm");
  const err = document.getElementById("loginError");

  form.addEventListener("submit", e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Введите корректный email."; return; }
    if (password.length < 4) { err.textContent = "Пароль — минимум 4 символа."; return; }

    saveData(KEYS.user, { email, role, name: email.split("@")[0] });
    location.href = "dashboard.html";
  });
})();
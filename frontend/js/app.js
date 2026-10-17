// Main App Controller & Router
class App {
  constructor() {
    this.currentPage = "welcome";
  }

  init() {
    this.setupNavigation();
    this.setupAuthUI();
    this.setupWelcomeAuth();
    this.updateUserNav();

    // Check URL hash for direct routing (#welcome, #home, #cari, #admin, #database)
    const hash = window.location.hash.replace("#", "");
    if (hash && ["welcome", "home", "cari", "admin", "database"].includes(hash)) {
      this.navigatePage(hash);
    } else {
      // Default to welcome if not logged in, or home if logged in
      this.navigatePage(window.api.token ? "home" : "welcome");
    }

    // Initialize modules
    if (window.buyerPlatform) window.buyerPlatform.init();
    if (window.adminPlatform) window.adminPlatform.init();
    if (window.dbExplorer) window.dbExplorer.init();
  }

  setupNavigation() {
    document.querySelectorAll("[data-navigate]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const targetPage = el.getAttribute("data-navigate");
        this.navigatePage(targetPage);
      });
    });
  }

  navigatePage(pageId) {
    this.currentPage = pageId;
    window.location.hash = pageId;

    // Toggle pages
    document.querySelectorAll(".page-view").forEach(page => {
      page.style.display = "none";
    });

    const activePage = document.getElementById(`page-${pageId}`);
    if (activePage) {
      activePage.style.display = "block";
    }

    // Toggle nav active state
    document.querySelectorAll(".nav-link").forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("data-navigate") === pageId) {
        link.classList.add("active");
      }
    });

    // Refresh page data if needed
    if (pageId === "database" && window.dbExplorer) {
      window.dbExplorer.init();
    } else if (pageId === "admin") {
      if (!window.api.token || window.api.user?.role !== "admin") {
        this.openAuthModal("admin");
      } else if (window.adminPlatform) {
        window.adminPlatform.init();
      }
    } else if (pageId === "home" && window.buyerPlatform) {
      window.buyerPlatform.init();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  setupWelcomeAuth() {
    // Welcome card Tab switcher: Masuk vs Daftar
    const tabMasuk = document.getElementById("welcome-tab-masuk");
    const tabDaftar = document.getElementById("welcome-tab-daftar");
    const boxMasuk = document.getElementById("welcome-box-masuk");
    const boxDaftar = document.getElementById("welcome-box-daftar");

    if (tabMasuk && tabDaftar && boxMasuk && boxDaftar) {
      tabMasuk.addEventListener("click", () => {
        tabMasuk.classList.add("active");
        tabDaftar.classList.remove("active");
        boxMasuk.style.display = "block";
        boxDaftar.style.display = "none";
      });

      tabDaftar.addEventListener("click", () => {
        tabDaftar.classList.add("active");
        tabMasuk.classList.remove("active");
        boxDaftar.style.display = "block";
        boxMasuk.style.display = "none";
      });
    }

    // Welcome 1-Click Demo Login
    const welcomeDemoBuyer = document.getElementById("welcome-demo-buyer");
    if (welcomeDemoBuyer) {
      welcomeDemoBuyer.addEventListener("click", async () => {
        try {
          await window.api.login("buyer@cekgarasi.test", "buyersecretpassword123");
          this.showToast("Selamat datang, Pembeli Demo!", "success");
          this.updateUserNav();
          this.navigatePage("home");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    const welcomeDemoAdmin = document.getElementById("welcome-demo-admin");
    if (welcomeDemoAdmin) {
      welcomeDemoAdmin.addEventListener("click", async () => {
        try {
          await window.api.login("admin@cekgarasi.test", "adminsecretpassword123");
          this.showToast("Selamat datang, Admin Dealer!", "success");
          this.updateUserNav();
          this.navigatePage("admin");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    // Welcome Form Login Submit
    const welcomeLoginForm = document.getElementById("welcome-form-login");
    if (welcomeLoginForm) {
      welcomeLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("welcome-login-email").value.trim();
        const pass = document.getElementById("welcome-login-password").value;

        try {
          await window.api.login(email, pass);
          this.showToast("Berhasil masuk!", "success");
          this.updateUserNav();
          this.navigatePage("home");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    // Welcome Form Register Submit
    const welcomeRegisterForm = document.getElementById("welcome-form-register");
    if (welcomeRegisterForm) {
      welcomeRegisterForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nama = document.getElementById("welcome-reg-name").value.trim();
        const email = document.getElementById("welcome-reg-email").value.trim();
        const no_hp = document.getElementById("welcome-reg-phone").value.trim();
        const pass = document.getElementById("welcome-reg-pass").value;

        try {
          await window.api.register({
            nama,
            email,
            no_hp,
            password: pass
          });
          this.showToast("Pendaftaran berhasil! Selamat datang di CekGarasi.", "success");
          this.updateUserNav();
          this.navigatePage("home");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }
  }

  setupAuthUI() {
    const authModal = document.getElementById("auth-modal");
    const openAuthBtns = document.querySelectorAll(".btn-open-auth");
    const closeAuthBtn = document.getElementById("btn-close-auth");

    openAuthBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode") || "masuk";
        this.openAuthModal(mode);
      });
    });

    if (closeAuthBtn && authModal) {
      closeAuthBtn.addEventListener("click", () => {
        authModal.classList.remove("open");
      });
    }

    // Demo quick login buttons in modal
    const btnDemoBuyer = document.getElementById("btn-demo-login-buyer");
    if (btnDemoBuyer) {
      btnDemoBuyer.addEventListener("click", async () => {
        try {
          await window.api.login("buyer@cekgarasi.test", "buyersecretpassword123");
          this.showToast("Berhasil masuk sebagai Pembeli Demo!", "success");
          authModal.classList.remove("open");
          this.updateUserNav();
          this.navigatePage("home");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    const btnDemoAdmin = document.getElementById("btn-demo-login-admin");
    if (btnDemoAdmin) {
      btnDemoAdmin.addEventListener("click", async () => {
        try {
          await window.api.login("admin@cekgarasi.test", "adminsecretpassword123");
          this.showToast("Berhasil masuk sebagai Admin Dealer!", "success");
          authModal.classList.remove("open");
          this.updateUserNav();
          this.navigatePage("admin");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }

    // Modal login form
    const formLogin = document.getElementById("form-auth-login");
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("auth-login-email").value.trim();
        const pass = document.getElementById("auth-login-password").value;

        try {
          await window.api.login(email, pass);
          this.showToast("Login berhasil!", "success");
          authModal.classList.remove("open");
          this.updateUserNav();
          this.navigatePage(window.api.user?.role === "admin" ? "admin" : "home");
        } catch (err) {
          this.showToast(err.message, "error");
        }
      });
    }
  }

  openAuthModal(preferredMode = "masuk") {
    const authModal = document.getElementById("auth-modal");
    if (authModal) {
      authModal.classList.add("open");
    }
  }

  updateUserNav() {
    const authContainer = document.getElementById("nav-auth-container");
    if (!authContainer) return;

    if (window.api.token && window.api.user) {
      const user = window.api.user;
      authContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div style="font-size:0.85rem; text-align:right;">
            <div style="font-weight:700; color:var(--text-main);">${user.nama}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">
              ${user.role === 'admin' ? '🛡️ Admin Dealer' : '👤 Pembeli Terdaftar'}
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.app.logout()">
            Keluar
          </button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="window.app.navigatePage('welcome')">
          Masuk / Daftar
        </button>
      `;
    }
  }

  logout() {
    window.api.logout();
    this.updateUserNav();
    this.showToast("Anda telah keluar.", "info");
    this.navigatePage("welcome");
  }

  showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✓" : (type === "error" ? "⚠" : "ℹ");
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.app = new App();
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});

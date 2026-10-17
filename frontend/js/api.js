const API_BASE = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
  ? `${window.location.origin}/api`
  : "/api";

class ApiService {
  constructor() {
    this.token = localStorage.getItem("cekgarasi_token") || null;
    this.user = JSON.parse(localStorage.getItem("cekgarasi_user") || "null");
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    if (token) {
      localStorage.setItem("cekgarasi_token", token);
      localStorage.setItem("cekgarasi_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("cekgarasi_token");
      localStorage.removeItem("cekgarasi_user");
    }
  }

  logout() {
    this.setAuth(null, null);
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token expired or invalid
        if (this.token) {
          this.logout();
          window.dispatchEvent(new CustomEvent("auth-changed", { detail: null }));
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || data.message || `Terjadi kesalahan (Kode: ${response.status})`;
        throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // Auth Endpoints
  async login(email, password) {
    const data = await this.request("/auth/masuk", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    this.setAuth(data.access_token, data.user);
    return data;
  }

  async register(payload) {
    const data = await this.request("/auth/daftar", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    this.setAuth(data.access_token, data.user);
    return data;
  }

  async verifyOtp(no_hp, otp) {
    return this.request("/auth/verifikasi-otp", {
      method: "POST",
      body: JSON.stringify({ no_hp, otp })
    });
  }

  async getMe() {
    return this.request("/auth/saya");
  }

  // Buyer Endpoints
  async getSegments() {
    return this.request("/segmen");
  }

  async getFilterOptions() {
    return this.request("/filter-opsi");
  }

  async searchCars(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, v);
      }
    });
    return this.request(`/cari?${query.toString()}`);
  }

  async getCarDetail(carId) {
    return this.request(`/mobil/${carId}`);
  }

  async getHomepageRecommendations() {
    return this.request("/rekomendasi/beranda");
  }

  async bookTestDrive(payload) {
    return this.request("/test-drive", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getTestDrive(kode) {
    return this.request(`/test-drive/${kode}`);
  }

  // Admin Endpoints
  async getAdminSummary() {
    return this.request("/admin/ringkasan");
  }

  async getScatterData() {
    return this.request("/admin/scatter");
  }

  async getMlEvaluation() {
    return this.request("/admin/evaluasi");
  }

  async runKExperiment(k) {
    return this.request("/admin/eksperimen-k", {
      method: "POST",
      body: JSON.stringify({ k })
    });
  }

  async predictSegment(payload) {
    return this.request("/admin/prediksi-segmen", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async getAdminCars(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, v);
      }
    });
    return this.request(`/admin/mobil?${query.toString()}`);
  }

  async createCar(payload) {
    return this.request("/admin/mobil", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async updateCar(carId, payload) {
    return this.request(`/admin/mobil/${carId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async deleteCar(carId) {
    return this.request(`/admin/mobil/${carId}`, {
      method: "DELETE"
    });
  }

  async getLeads(status = null) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/admin/leads${query}`);
  }

  async updateLeadStatus(leadId, status) {
    return this.request(`/admin/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  // Database Explorer Endpoints
  async getDbInfo() {
    return this.request("/database/info");
  }

  async getDbTables() {
    return this.request("/database/tables");
  }

  async getTableData(tableName, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, v);
      }
    });
    return this.request(`/database/tables/${encodeURIComponent(tableName)}?${query.toString()}`);
  }

  async executeSqlQuery(queryStr, limit = 100) {
    return this.request("/database/query", {
      method: "POST",
      body: JSON.stringify({ query: queryStr, limit })
    });
  }
}

window.api = new ApiService();

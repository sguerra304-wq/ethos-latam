/* =========================================================
   ETH FOUNDERS — Auth (backend real: /api/auth)
   ========================================================= */
(function () {
  const api = (action, opts) => fetch("/api/auth?action=" + action, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, opts));
  let _userCache; // undefined = not fetched, null = anon, object = user

  const EthAuth = {
    DEMO: false,

    async getUser(force) {
      if (_userCache !== undefined && !force) return _userCache;
      try {
        const r = await api("me", { method: "GET" });
        const d = await r.json();
        _userCache = d.user || null;
      } catch (e) { _userCache = null; }
      return _userCache;
    },

    async requireAuth() {
      const u = await this.getUser();
      if (!u) { window.location.href = "login.html"; return null; }
      return u;
    },

    async signInPassword(email, password) {
      try {
        const r = await api("login", { method: "POST", body: JSON.stringify({ email, password }) });
        const d = await r.json();
        if (r.ok) { _userCache = d.user; return { ok: true }; }
        return { ok: false, error: d.error };
      } catch (e) { return { ok: false, error: "Error de conexión." }; }
    },

    async signUpPassword(email, password, name, profile) {
      try {
        const body = Object.assign({ email, password, name }, profile || {});
        const r = await api("signup", { method: "POST", body: JSON.stringify(body) });
        const d = await r.json();
        if (r.ok) {
          if (d.user) { _userCache = d.user; return { ok: true, pending: false }; }
          return { ok: true, pending: true };
        }
        return { ok: false, error: d.error };
      } catch (e) { return { ok: false, error: "Error de conexión." }; }
    },

    async signInMagic() { return { ok: false, error: "Por ahora entra con email y contraseña." }; },
    async signInGoogle() { return { ok: false, error: "Login con Google disponible próximamente. Usa email y contraseña." }; },

    async updateProfile(patch) {
      try {
        const r = await api("updateProfile", { method: "POST", body: JSON.stringify(patch) });
        const d = await r.json();
        if (r.ok) { _userCache = d.user; return { ok: true }; }
        return { ok: false, error: d.error };
      } catch (e) { return { ok: false, error: "Error de conexión." }; }
    },

    async uploadAvatar(dataUrl) {
      try {
        const r = await api("avatar", { method: "POST", body: JSON.stringify({ dataUrl }) });
        const d = await r.json();
        if (r.ok) { _userCache = d.user; return { ok: true, user: d.user }; }
        return { ok: false, error: d.error };
      } catch (e) { return { ok: false, error: "Error de conexión." }; }
    },

    async signOut() {
      try { await api("logout", { method: "POST" }); } catch (e) {}
      _userCache = null;
      window.location.href = "login.html";
    }
  };

  window.EthAuth = EthAuth;
})();

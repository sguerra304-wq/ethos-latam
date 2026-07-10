/* =========================================================
   ETH FOUNDERS — Datos (backend real: /api/db)
   Carga un snapshot compartido y aplica operaciones vía API.
   ========================================================= */
(function () {
  let snap = null;

  // ---- Cache de sesión (stale-while-revalidate): navegación entre páginas instantánea ----
  const CK = "eth_snap_v1";
  const saveCache = (s) => { try { if (s) sessionStorage.setItem(CK, JSON.stringify(s)); } catch (e) {} };
  const loadCache = () => { try { const r = sessionStorage.getItem(CK); return r ? JSON.parse(r) : null; } catch (e) { return null; } };

  const get = () => fetch("/api/db", { credentials: "same-origin" })
    .then((r) => r.json())
    .then((j) => { saveCache(j); return j; });
  const post = (op, payload) => fetch("/api/db", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ op }, payload))
  }).then((r) => r.json());

  async function ensure() { if (!snap) snap = loadCache(); if (!snap) snap = await get(); return snap; }
  async function refresh() { snap = await get(); return snap; }

  const EthData = {
    refresh,
    /* Snapshot en memoria/caché sin disparar fetch (para render inmediato). */
    peek() { if (!snap) snap = loadCache(); return snap; },
    /* Limpia el snapshot y la caché (al cerrar sesión). */
    clearCache() { snap = null; try { sessionStorage.removeItem(CK); } catch (e) {} },
    async channels() { return (await ensure()).channels || []; },
    async events() { return (await ensure()).events || []; },
    async members() { return (await ensure()).members || []; },
    async resources() { return (await ensure()).resources || []; },
    async perks() { return (await ensure()).perks || []; },
    async posts() { return (await ensure()).posts || []; },
    async applications() { return (await ensure()).applications || []; },
    async myRsvps() { return new Set((await ensure()).myRsvps || []); },

    likedSet() {
      const s = new Set();
      if (snap) (snap.posts || []).forEach((p) => { if (p.liked) s.add(p.id); });
      return s;
    },

    async toggleRsvp(eventId) {
      const d = await post("toggleRsvp", { eventId });
      if (snap) { snap.myRsvps = snap.myRsvps || []; const i = snap.myRsvps.indexOf(eventId);
        if (d.going && i < 0) snap.myRsvps.push(eventId); if (!d.going && i >= 0) snap.myRsvps.splice(i, 1); }
      return d.going;
    },
    async addPost(p, user) {
      const d = await post("addPost", { channel: p.channel, text: p.text });
      if (d.post && snap) snap.posts.unshift(d.post);
      return d.post;
    },
    async toggleLikePost(id) {
      const d = await post("toggleLike", { postId: id });
      if (snap) { const pp = snap.posts.find((x) => x.id === id); if (pp) { pp.likes = d.likes; pp.liked = d.liked; } }
      return { liked: d.liked, likes: d.likes };
    },
    async addComment(id, text) {
      const d = await post("addComment", { postId: id, text });
      if (snap && d.comments) { const pp = snap.posts.find((x) => x.id === id); if (pp) pp.comments = d.comments; }
      return d.comments || [];
    },
    async deletePost(id) {
      const d = await post("deletePost", { postId: id });
      if (snap && d.ok) snap.posts = (snap.posts || []).filter((x) => x.id !== id);
      return d;
    },
    async settings() { return (await ensure()).settings || {}; },
    async saveSettings(patch) {
      const d = await post("saveSettings", { patch });
      if (snap && d.settings) snap.settings = d.settings;
      return d;
    },

    /* ----- canje de beneficios + plan ----- */
    async redeemPerk(id) { return post("redeemPerk", { id }); },
    async setMyPlan(plan) { const d = await post("setMyPlan", { plan }); await refresh(); return d; },

    /* ----- gamificación + café + spotlight ----- */
    async leaderboard() { const s = await ensure(); return { list: s.leaderboard || [], myRank: s.myRank || 0, myPoints: s.myPoints || 0 }; },
    async coffee() { return (await ensure()).coffee || null; },
    async spotlight() { return (await ensure()).spotlight || null; },

    /* ----- captación web (admin) ----- */
    async leads() { return (await ensure()).leads || []; },
    async subscribers() { return (await ensure()).subscribers || []; },

    /* ----- core groups ----- */
    async myGroup() { return (await ensure()).myGroup || null; },
    async groups() { return (await ensure()).groups || []; },
    async saveGroup(item) { const d = await post("saveGroup", { item }); await refresh(); return d; },
    async deleteGroup(id) { const d = await post("deleteGroup", { id }); await refresh(); return d; },

    /* ----- mensajes + notificaciones ----- */
    async me() { return (await ensure()).me || {}; },
    meUid() { return snap && snap.me ? snap.me.uid : null; },
    async myDms() { return (await ensure()).myDms || []; },
    async notifications() { return (await ensure()).notifications || []; },
    async unreadNotifs() { return (await ensure()).unreadNotifs || 0; },
    unreadDmCount() { return snap ? (snap.myDms || []).reduce((a, c) => a + (c.unread || 0), 0) : 0; },
    async sendDM(toUid, text) { return post("sendDM", { toUid, text }); },
    async readDM(uid) {
      if (snap) { const c = (snap.myDms || []).find((x) => x.uid === uid); if (c) c.unread = 0; }
      return post("readDM", { uid });
    },
    async markNotifsRead() {
      const d = await post("markNotifsRead", {});
      if (snap) { (snap.notifications || []).forEach((n) => (n.read = true)); snap.unreadNotifs = 0; }
      return d;
    }
  };

  window.EthData = EthData;
})();

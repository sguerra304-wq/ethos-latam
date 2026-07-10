/* =========================================================
   ETH FOUNDERS — Admin (backend real: /api/db)
   ========================================================= */
(function () {
  const post = (op, payload) => fetch("/api/db", {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ op }, payload))
  }).then((r) => r.json());
  const after = async (r) => { await window.EthData.refresh(); return r; };

  window.EthAdmin = {
    async listEvents() { return window.EthData.events(); },
    async saveEvent(ev) { return after(await post("saveEvent", { item: ev })); },
    async deleteEvent(id) { return after(await post("deleteEvent", { id })); },

    async listResources() { return window.EthData.resources(); },
    async saveResource(x) { return after(await post("saveResource", { item: x })); },
    async deleteResource(id) { return after(await post("deleteResource", { id })); },

    async listPerks() { return window.EthData.perks(); },
    async savePerk(p) { return after(await post("savePerk", { item: p })); },
    async deletePerk(id) { return after(await post("deletePerk", { id })); },

    async listApplications() { return window.EthData.applications(); },
    async acceptApplication(id) { return after(await post("acceptApp", { id })); },
    async approveApplication(id) { return after(await post("approveApp", { id })); },
    async rejectApplication(id) { return after(await post("rejectApp", { id })); },

    async listMembers() { return window.EthData.members(); },
    async updateMember(email, patch) { return after(await post("updateMember", { email, patch })); },
    async removeMember(email) { return after(await post("removeMember", { email })); },

    async listGroups() { return window.EthData.groups(); },
    async saveGroup(item) { return after(await post("saveGroup", { item })); },
    async deleteGroup(id) { return after(await post("deleteGroup", { id })); },

    async listLeads() { return window.EthData.leads(); },
    async deleteLead(id) { return after(await post("deleteLead", { id })); },
    async setLeadStatus(id, status) { return after(await post("setLeadStatus", { id, status })); },
    async listSubscribers() { return window.EthData.subscribers(); },
    async deleteSubscriber(email) { return after(await post("deleteSubscriber", { email })); },

    async exportDB() { return post("exportDB", {}); }
  };
})();

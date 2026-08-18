const BASE = "/api";

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  dashboard: () => request("/dashboard"),

  bookings: {
    list: (params?: Record<string, string>) => {
      const qs = params
        ? "?" + new URLSearchParams(params).toString()
        : "";
      return request(`/bookings${qs}`);
    },
    get: (id: number) => request(`/bookings/${id}`),
    create: (data: Record<string, unknown>) =>
      request("/bookings", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) =>
      request(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    assign: (id: number, nurseId: number | null) =>
      request(`/bookings/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ nurseId }),
      }),
    edit: (id: number, data: Record<string, unknown>) =>
      request(`/bookings/${id}/edit`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      request(`/bookings/${id}`, { method: "DELETE" }),
    exportUrl: (params?: Record<string, string>) => {
      const qs = params && Object.keys(params).length
        ? "?" + new URLSearchParams(params).toString()
        : "";
      return `${BASE}/bookings/export${qs}`;
    },
  },

  nurses: {
    list: () => request("/nurses"),
    create: (data: Record<string, unknown>) =>
      request("/nurses", { method: "POST", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request(`/nurses?id=${id}`, { method: "DELETE" }),
    setActive: (id: number, isActive: boolean) =>
      request(`/nurses/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    resetPassword: (id: number, password: string) =>
      request(`/nurses/${id}`, { method: "PATCH", body: JSON.stringify({ password }) }),
  },

  push: {
    subscribe: (subscription: PushSubscriptionJSON) =>
      request("/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
    unsubscribe: (endpoint: string) =>
      request("/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
  },
};

const fetchAuditLogs = async () => {
  if (!window.assetTrackingApi?.getToken()) {
    return [];
  }

  try {
    const data = await window.assetTrackingApi.apiFetch("/api/audit");
    return data.logs || [];
  } catch (error) {
    return [];
  }
};

const clearAuditLogs = async () => {
  if (!window.assetTrackingApi?.getToken()) {
    return;
  }
  await window.assetTrackingApi.apiFetch("/api/audit", { method: "DELETE" });
};

window.auditLog = {
  fetchAuditLogs,
  clearAuditLogs,
};

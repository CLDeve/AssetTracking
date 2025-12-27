const AUDIT_LOG_KEY = "assetTrackingAuditLogs";
const AUDIT_LOG_LIMIT = 200;

const getAuditLogs = () => {
  const stored = localStorage.getItem(AUDIT_LOG_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    return [];
  }
};

const saveAuditLogs = (logs) => {
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
};

const logAudit = (action, details) => {
  const role = localStorage.getItem("assetTrackingRole") || "Admin";
  const entry = {
    time: new Date().toLocaleString(),
    role,
    action,
    details,
  };

  const logs = getAuditLogs();
  logs.unshift(entry);
  saveAuditLogs(logs.slice(0, AUDIT_LOG_LIMIT));
};

window.auditLog = {
  getAuditLogs,
  logAudit,
};

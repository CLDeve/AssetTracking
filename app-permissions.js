const ROLE_PERMISSIONS_DEFAULT = {
  Admin: [
    "store",
    "store_phone",
    "phone_register_device",
    "phone_location_list",
    "phone_returning",
    "phone_issuing",
    "store_tablet",
    "store_camera",
    "admin",
    "admin_user_management",
    "admin_audit_log",
  ],
  Supervisor: [
    "store",
    "store_phone",
    "phone_register_device",
    "phone_location_list",
    "phone_returning",
    "phone_issuing",
    "store_tablet",
    "store_camera",
  ],
  Operator: [
    "store",
    "store_phone",
    "phone_location_list",
    "phone_returning",
    "phone_issuing",
  ],
  Viewer: ["store"],
};

const getCurrentRole = () => {
  if (!window.assetTrackingApi) {
    return "Viewer";
  }
  const user = window.assetTrackingApi.getStoredUser();
  return user?.role || "Viewer";
};

const LEGACY_PERMISSION_MAP = {
  register_device: "phone_register_device",
  returning: "phone_returning",
  location_list: "phone_location_list",
  issuing_personal: "phone_issuing",
  issuing_shared: "phone_issuing",
  bulk_issuing: "phone_issuing",
  user_management: "admin_user_management",
  audit_log: "admin_audit_log",
};

const PARENT_MAP = {
  store_phone: ["store"],
  store_tablet: ["store"],
  store_camera: ["store"],
  phone_register_device: ["store", "store_phone"],
  phone_location_list: ["store", "store_phone"],
  phone_returning: ["store", "store_phone"],
  phone_issuing: ["store", "store_phone"],
  admin_user_management: ["admin"],
  admin_audit_log: ["admin"],
};

const migratePermissions = (permissions = []) => {
  const normalized = new Set();
  permissions.forEach((permission) => {
    const mapped = LEGACY_PERMISSION_MAP[permission] || permission;
    normalized.add(mapped);
  });
  Array.from(normalized).forEach((permission) => {
    const parents = PARENT_MAP[permission] || [];
    parents.forEach((parent) => normalized.add(parent));
  });
  return Array.from(normalized);
};

const normalizePermissions = (roles) => {
  const map = { ...ROLE_PERMISSIONS_DEFAULT };
  roles.forEach((roleEntry) => {
    if (!roleEntry?.role) return;
    map[roleEntry.role] = migratePermissions(roleEntry.permissions || []);
  });
  return map;
};

let cachedPermissions = null;

const getRolePermissions = async () => {
  if (cachedPermissions) {
    return cachedPermissions;
  }
  if (!window.assetTrackingApi) {
    cachedPermissions = ROLE_PERMISSIONS_DEFAULT;
    return cachedPermissions;
  }

  try {
    const data = await window.assetTrackingApi.apiFetch("/api/role-permissions");
    cachedPermissions = normalizePermissions(data.roles || []);
    return cachedPermissions;
  } catch (error) {
    cachedPermissions = ROLE_PERMISSIONS_DEFAULT;
    return cachedPermissions;
  }
};

const canAccess = async (role, permission) => {
  const rolePermissions = await getRolePermissions();
  const permissions = rolePermissions[role] || [];
  if (!permissions.includes(permission)) {
    return false;
  }
  const parents = PARENT_MAP[permission] || [];
  return parents.every((parent) => permissions.includes(parent));
};

window.assetTrackingPermissions = {
  defaults: ROLE_PERMISSIONS_DEFAULT,
  resolve: getRolePermissions,
};

const disableControls = (container) => {
  const controls = container.querySelectorAll(
    "input, select, textarea, button"
  );
  controls.forEach((control) => {
    control.disabled = true;
  });
};

const applyPermissions = async () => {
  const role = getCurrentRole();

  document.querySelectorAll("[data-role-display]").forEach((node) => {
    node.textContent = role;
  });

  const permissionNodes = Array.from(
    document.querySelectorAll("[data-permission]")
  );

  for (const node of permissionNodes) {
    const permission = node.getAttribute("data-permission");
    const allowed = await canAccess(role, permission);

    if (allowed) {
      continue;
    }

    node.classList.add("is-disabled");
    node.setAttribute("aria-disabled", "true");

    if (node.tagName === "A" || node.tagName === "BUTTON") {
      node.classList.add("is-disabled-link");
      node.setAttribute("tabindex", "-1");
    }

    disableControls(node);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  applyPermissions();
});

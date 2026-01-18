const ROLE_PERMISSIONS_DEFAULT = {
  Admin: [
    "store",
    "store_phone",
    "phone_register_device",
    "phone_location_list",
    "phone_returning",
    "phone_issuing",
    "phone_issuing_personal",
    "phone_issuing_shared",
    "phone_issuing_bulk",
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
    "phone_issuing_personal",
    "phone_issuing_shared",
    "phone_issuing_bulk",
    "store_tablet",
    "store_camera",
  ],
  Operator: [
    "store",
    "store_phone",
    "phone_location_list",
    "phone_returning",
    "phone_issuing",
    "phone_issuing_personal",
    "phone_issuing_shared",
    "phone_issuing_bulk",
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
  issuing_personal: "phone_issuing_personal",
  issuing_shared: "phone_issuing_shared",
  bulk_issuing: "phone_issuing_bulk",
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
  phone_issuing_personal: ["store", "store_phone", "phone_issuing"],
  phone_issuing_shared: ["store", "store_phone", "phone_issuing"],
  phone_issuing_bulk: ["store", "store_phone", "phone_issuing"],
  admin_user_management: ["admin"],
  admin_audit_log: ["admin"],
};

const migratePermissions = (permissions = []) => {
  const normalized = new Set();
  permissions.forEach((permission) => {
    const mapped = LEGACY_PERMISSION_MAP[permission] || permission;
    normalized.add(mapped);
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
  if (permissions.includes(permission)) {
    return true;
  }
  return permissions.some((granted) =>
    (PARENT_MAP[granted] || []).includes(permission)
  );
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

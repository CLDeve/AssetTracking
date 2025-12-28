const ROLE_PERMISSIONS_DEFAULT = {
  Admin: [
    "register_device",
    "issuing_personal",
    "issuing_shared",
    "bulk_issuing",
    "returning",
    "location_list",
    "user_management",
  ],
  Supervisor: [
    "register_device",
    "issuing_personal",
    "issuing_shared",
    "bulk_issuing",
    "returning",
    "location_list",
  ],
  Operator: [
    "issuing_personal",
    "issuing_shared",
    "returning",
    "location_list",
  ],
  Viewer: [],
};

const getCurrentRole = () => {
  if (!window.assetTrackingApi) {
    return "Viewer";
  }
  const user = window.assetTrackingApi.getStoredUser();
  return user?.role || "Viewer";
};

const normalizePermissions = (roles) => {
  const map = { ...ROLE_PERMISSIONS_DEFAULT };
  roles.forEach((roleEntry) => {
    if (!roleEntry?.role) return;
    map[roleEntry.role] = roleEntry.permissions || [];
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
  return (rolePermissions[role] || []).includes(permission);
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

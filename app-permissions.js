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

const ROLE_KEY = "assetTrackingRole";
const PERMISSIONS_KEY = "assetTrackingRolePermissions";

const resolveRoleFromUser = () => {
  const currentUser = localStorage.getItem("assetTrackingCurrentUser");
  if (!currentUser) {
    return null;
  }

  try {
    const storedUsers = localStorage.getItem("assetTrackingUsers");
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    const match = users.find((user) => user.username === currentUser);
    return match ? match.role : null;
  } catch (error) {
    return null;
  }
};

const getCurrentRole = () =>
  resolveRoleFromUser() || localStorage.getItem(ROLE_KEY) || "Admin";

const getRolePermissions = () => {
  const stored = localStorage.getItem(PERMISSIONS_KEY);
  if (!stored) {
    return ROLE_PERMISSIONS_DEFAULT;
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    return ROLE_PERMISSIONS_DEFAULT;
  }
};

const canAccess = (role, permission) => {
  const rolePermissions = getRolePermissions();
  return (rolePermissions[role] || []).includes(permission);
};

window.assetTrackingPermissions = {
  defaults: ROLE_PERMISSIONS_DEFAULT,
  storageKey: PERMISSIONS_KEY,
};

const disableControls = (container) => {
  const controls = container.querySelectorAll(
    "input, select, textarea, button"
  );
  controls.forEach((control) => {
    control.disabled = true;
  });
};

const applyPermissions = () => {
  const role = getCurrentRole();

  document.querySelectorAll("[data-role-display]").forEach((node) => {
    node.textContent = role;
  });

  document.querySelectorAll("[data-permission]").forEach((node) => {
    const permission = node.getAttribute("data-permission");
    const allowed = canAccess(role, permission);

    if (allowed) {
      return;
    }

    node.classList.add("is-disabled");
    node.setAttribute("aria-disabled", "true");

    if (node.tagName === "A" || node.tagName === "BUTTON") {
      node.classList.add("is-disabled-link");
      node.setAttribute("tabindex", "-1");
    }

    disableControls(node);
  });
};

document.addEventListener("DOMContentLoaded", applyPermissions);

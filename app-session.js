const updateSessionUI = (user) => {
  const name = user?.name || user?.username || "Guest";
  document.querySelectorAll("[data-current-user]").forEach((node) => {
    node.textContent = name;
  });

  document.querySelectorAll("[data-logout-link]").forEach((node) => {
    if (!user) {
      node.classList.add("is-hidden");
    } else {
      node.classList.remove("is-hidden");
    }
  });

  document.querySelectorAll("[data-user-menu-toggle]").forEach((button) => {
    if (!user) {
      button.setAttribute("aria-disabled", "true");
      button.classList.add("is-disabled");
    } else {
      button.removeAttribute("aria-disabled");
      button.classList.remove("is-disabled");
    }
  });
};

const loadSession = async () => {
  if (!window.assetTrackingApi) {
    updateSessionUI(null);
    return;
  }

  const token = window.assetTrackingApi.getToken();
  const storedUser = window.assetTrackingApi.getStoredUser();

  if (!token) {
    updateSessionUI(null);
    return;
  }

  if (storedUser) {
    updateSessionUI(storedUser);
    return;
  }

  try {
    const data = await window.assetTrackingApi.apiFetch("/api/me");
    window.assetTrackingApi.setStoredUser(data.user);
    updateSessionUI(data.user);
  } catch (error) {
    window.assetTrackingApi.setToken(null);
    window.assetTrackingApi.setStoredUser(null);
    updateSessionUI(null);
  }
};

loadSession();

const getSectionFromPath = (path) => {
  if (!path || path === "index.html") {
    return "store";
  }
  if (path.startsWith("phone")) {
    return "phones";
  }
  if (path === "location-list.html") {
    return "location-list";
  }
  if (path === "user-management.html") {
    return "user-management";
  }
  if (path === "audit-log.html") {
    return "audit-log";
  }
  if (path === "login.html") {
    return "login";
  }
  return "";
};

const highlightNav = () => {
  const current = window.location.pathname.split("/").pop() || "index.html";
  const section = getSectionFromPath(current);
  document.querySelectorAll(".topbar-nav a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    const navKey = link.getAttribute("data-nav") || "";
    const hide =
      href === current ||
      (section === "phones" && navKey === "phones") ||
      (section === "store" && navKey === "phones") ||
      (section === "store" && navKey === "store") ||
      (section === "location-list" && navKey === "location-list") ||
      (section === "user-management" && navKey === "user-management") ||
      (section === "audit-log" && navKey === "audit-log");
    link.classList.toggle("is-hidden", hide);
  });
};

const closeAllMenus = () => {
  document.querySelectorAll(".user-menu").forEach((menu) => {
    menu.classList.remove("open");
  });
};

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const toggle = target.closest("[data-user-menu-toggle]");
  if (toggle) {
    const menu = toggle.closest(".user-menu");
    if (!menu || toggle.getAttribute("aria-disabled") === "true") {
      return;
    }
    const isOpen = menu.classList.contains("open");
    closeAllMenus();
    if (!isOpen) {
      menu.classList.add("open");
    }
    return;
  }

  if (!target.closest(".user-menu")) {
    closeAllMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllMenus();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  highlightNav();
});

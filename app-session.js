const currentUser = localStorage.getItem("assetTrackingCurrentUser");

document.querySelectorAll("[data-current-user]").forEach((node) => {
  node.textContent = currentUser || "Guest";
});

document.querySelectorAll("[data-logout-link]").forEach((node) => {
  if (!currentUser) {
    node.classList.add("is-hidden");
  }
});

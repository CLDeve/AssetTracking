const cards = Array.from(document.querySelectorAll(".asset-card"));
const activeAssetName = document.getElementById("activeAssetName");
const dashboardTitle = document.getElementById("dashboardTitle");
const dashboardSubtitle = document.getElementById("dashboardSubtitle");
const dashboardStatus = document.getElementById("dashboardStatus");
const dashboardUpdated = document.getElementById("dashboardUpdated");
const metricsGrid = document.getElementById("metricsGrid");
const flowList = document.getElementById("flowList");
const actionList = document.getElementById("actionList");
const mapZone = document.getElementById("mapZone");
const mapPing = document.getElementById("mapPing");

const assetData = {
  Phone: {
    subtitle: "Field-issued smartphones with encrypted GPS tracking.",
    status: "Online",
    updated: "Updated now",
    zone: "Central Ops",
    ping: "12:47 PM",
    metrics: [
      { label: "Active units", value: "38", trend: "+4 today" },
      { label: "Battery avg.", value: "82%", trend: "Healthy" },
      { label: "Live alerts", value: "3", trend: "Priority" },
    ],
    flow: [
      { step: "Check-in complete", time: "08:00" },
      { step: "Patrol underway", time: "09:10" },
      { step: "Incident logged", time: "11:35" },
      { step: "Supervisor review", time: "12:05" },
    ],
    actions: ["Ping device", "Lock remotely", "Open incident log"],
  },
  Tablet: {
    subtitle: "Operations tablets used in control rooms.",
    status: "Stable",
    updated: "Updated 2 min ago",
    zone: "Command Hub",
    ping: "12:45 PM",
    metrics: [
      { label: "Active units", value: "16", trend: "No change" },
      { label: "Session load", value: "64%", trend: "Balanced" },
      { label: "Open tasks", value: "11", trend: "On track" },
    ],
    flow: [
      { step: "Briefing synced", time: "07:45" },
      { step: "Shift planning", time: "09:20" },
      { step: "Live dispatch", time: "10:55" },
      { step: "Report export", time: "12:15" },
    ],
    actions: ["Sync briefing", "Assign tasks", "Export report"],
  },
  "Body Worn Camera": {
    subtitle: "Wearable cameras streaming on duty.",
    status: "Recording",
    updated: "Updated 1 min ago",
    zone: "North Gate",
    ping: "12:46 PM",
    metrics: [
      { label: "Active units", value: "22", trend: "+2 today" },
      { label: "Storage left", value: "41%", trend: "Needs cleanup" },
      { label: "Upload queue", value: "5", trend: "In progress" },
    ],
    flow: [
      { step: "Dock check", time: "07:30" },
      { step: "Recording start", time: "08:10" },
      { step: "Evidence marked", time: "10:05" },
      { step: "Auto-upload", time: "11:50" },
    ],
    actions: ["Flag evidence", "Force upload", "Health check"],
  },
};

const renderMetrics = (metrics) => {
  metricsGrid.innerHTML = "";
  metrics.forEach((metric) => {
    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `
      <p class="metric-label">${metric.label}</p>
      <p class="metric-value">${metric.value}</p>
      <p class="metric-trend">${metric.trend}</p>
    `;
    metricsGrid.appendChild(card);
  });
};

const renderFlow = (flow) => {
  flowList.innerHTML = "";
  flow.forEach((item) => {
    const entry = document.createElement("li");
    entry.innerHTML = `
      <span class="flow-time">${item.time}</span>
      <span class="flow-step">${item.step}</span>
    `;
    flowList.appendChild(entry);
  });
};

const renderActions = (actions) => {
  actionList.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.textContent = action;
    actionList.appendChild(button);
  });
};

const setActiveAsset = (name) => {
  const data = assetData[name];
  if (!data) return;

  cards.forEach((card) => {
    const isActive = card.dataset.asset === name;
    card.classList.toggle("selected", isActive);
    card.querySelector(".cta").textContent = isActive ? "Viewing" : "View";
  });

  activeAssetName.textContent = name;
  dashboardTitle.textContent = name;
  dashboardSubtitle.textContent = data.subtitle;
  dashboardStatus.textContent = data.status;
  dashboardUpdated.textContent = data.updated;
  mapZone.textContent = data.zone;
  mapPing.textContent = data.ping;
  renderMetrics(data.metrics);
  renderFlow(data.flow);
  renderActions(data.actions);
};

cards.forEach((card) => {
  card.addEventListener("click", () => {
    if (card.dataset.asset === "Phone") {
      window.location.href = "phone.html";
      return;
    }

    setActiveAsset(card.dataset.asset);
  });
});

setActiveAsset("Phone");

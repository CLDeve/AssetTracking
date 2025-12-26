const cards = Array.from(document.querySelectorAll(".asset-card"));
const selectedCount = document.getElementById("selectedCount");
const selectionHint = document.getElementById("selectionHint");
const selectionTags = document.getElementById("selectionTags");

const selection = new Set();

const renderSelection = () => {
  selectedCount.textContent = selection.size;
  selectionTags.innerHTML = "";

  if (selection.size === 0) {
    selectionHint.textContent = "No assets selected yet.";
    return;
  }

  selectionHint.textContent = "Monitoring these assets right now:";

  selection.forEach((asset) => {
    const tag = document.createElement("span");
    tag.className = "selection-tag";
    tag.textContent = asset;
    selectionTags.appendChild(tag);
  });
};

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const name = card.dataset.asset;
    if (selection.has(name)) {
      selection.delete(name);
      card.classList.remove("selected");
      card.querySelector(".cta").textContent = "Select";
    } else {
      selection.add(name);
      card.classList.add("selected");
      card.querySelector(".cta").textContent = "Selected";
    }

    renderSelection();
  });
});

renderSelection();

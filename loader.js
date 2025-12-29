const loader = document.querySelector("[data-page-loader]");

if (loader) {
  const hideLoader = () => {
    loader.classList.add("is-hidden");
  };

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader, { once: true });
  }
}

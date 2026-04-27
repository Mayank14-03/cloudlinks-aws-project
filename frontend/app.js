const form = document.getElementById("shorten-form");
const input = document.getElementById("url-input");
const result = document.getElementById("result");
const shortUrlLink = document.getElementById("short-url");
const message = document.getElementById("message");
const submitButton = document.getElementById("submit-button");
const copyButton = document.getElementById("copy-button");

const config = window.APP_CONFIG || {};
const apiBaseUrl = config.API_BASE_URL || "";

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.remove("success", "error");
  message.classList.add(isError ? "error" : "success");
}

function setLoadingState(isLoading) {
  submitButton.classList.toggle("loading", isLoading);
  submitButton.disabled = isLoading;
  const textNode = submitButton.querySelector(".btn-text");
  textNode.textContent = isLoading ? "Creating..." : "Create Link";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.classList.add("hidden");
  setLoadingState(true);
  showMessage("Creating short link...");

  if (!apiBaseUrl) {
    setLoadingState(false);
    showMessage("Missing API URL. Update frontend/config.js first.", true);
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.value.trim() }),
    });

    const data = await response.json();
    if (!response.ok) {
      setLoadingState(false);
      showMessage(data.message || "Request failed", true);
      return;
    }

    shortUrlLink.href = data.shortUrl;
    shortUrlLink.textContent = data.shortUrl;
    result.classList.remove("hidden");
    showMessage("Short link created successfully.");
    setLoadingState(false);
  } catch (error) {
    showMessage("Network error. Please try again.", true);
    setLoadingState(false);
  }
});

copyButton.addEventListener("click", async () => {
  const urlToCopy = shortUrlLink.textContent.trim();
  if (!urlToCopy) {
    showMessage("No short link available to copy yet.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(urlToCopy);
    showMessage("Copied short URL to clipboard.");
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy URL";
    }, 1200);
  } catch (error) {
    showMessage("Copy failed. Please copy the URL manually.", true);
  }
});

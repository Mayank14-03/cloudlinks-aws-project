const totalClicksEl = document.getElementById("total-clicks");
const totalLinksEl = document.getElementById("total-links");
const tableBody = document.getElementById("top-links-table");
const statusMessage = document.getElementById("status-message");
const updatedAt = document.getElementById("updated-at");
const refreshButton = document.getElementById("refresh-button");
const logoutButton = document.getElementById("logout-button");
const sessionInfo = document.getElementById("session-info");

const config = window.APP_CONFIG || {};
const apiBaseUrl = config.API_BASE_URL || "";

let clickShareChart = null;
let topLinksChart = null;

const parsedFromHash = window.CloudLinksAuth.persistSessionFromUrlHash();
const session = parsedFromHash || window.CloudLinksAuth.getValidSession();

if (!session) {
  window.CloudLinksAuth.redirectToLogin();
}

window.CloudLinksAuth.registerActivityTracking();
if (session && session.email) {
  sessionInfo.textContent = `Signed in as ${session.email}`;
}

function setStatus(text, isError = false) {
  statusMessage.textContent = text;
  statusMessage.classList.toggle("error", isError);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function createOrUpdateCharts(topLinks) {
  const topFive = topLinks.slice(0, 5);
  const labelsFive = topFive.map((item) => item.shortCode || "-");
  const clicksFive = topFive.map((item) => item.clickCount || 0);

  const labelsTen = topLinks.map((item) => item.shortCode || "-");
  const clicksTen = topLinks.map((item) => item.clickCount || 0);

  const shareContext = document.getElementById("click-share-chart");
  const topLinksContext = document.getElementById("top-links-chart");

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#dbeaf7",
          font: { family: "Plus Jakarta Sans" },
        },
      },
    },
  };

  if (clickShareChart) {
    clickShareChart.destroy();
  }

  clickShareChart = new Chart(shareContext, {
    type: "doughnut",
    data: {
      labels: labelsFive,
      datasets: [
        {
          data: clicksFive,
          backgroundColor: ["#4fe0b5", "#5ad6ff", "#8da2ff", "#ffbb6e", "#ff8f8f"],
          borderColor: "#102133",
          borderWidth: 2,
        },
      ],
    },
    options: {
      ...baseOptions,
      cutout: "58%",
    },
  });

  if (topLinksChart) {
    topLinksChart.destroy();
  }

  topLinksChart = new Chart(topLinksContext, {
    type: "bar",
    data: {
      labels: labelsTen,
      datasets: [
        {
          label: "Clicks",
          data: clicksTen,
          borderRadius: 8,
          backgroundColor: "rgba(79, 224, 181, 0.7)",
        },
      ],
    },
    options: {
      ...baseOptions,
      scales: {
        x: {
          ticks: {
            color: "#cde4f8",
            font: { family: "Plus Jakarta Sans" },
          },
          grid: { color: "rgba(130, 164, 193, 0.16)" },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#cde4f8",
            font: { family: "Plus Jakarta Sans" },
            precision: 0,
          },
          grid: { color: "rgba(130, 164, 193, 0.16)" },
        },
      },
    },
  });
}

function renderTopLinksTable(topLinks) {
  tableBody.innerHTML = "";

  if (!topLinks.length) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='3'>No links yet. Create links first to see analytics.</td>";
    tableBody.appendChild(row);
    return;
  }

  for (const link of topLinks) {
    const row = document.createElement("tr");
    const shortUrl = `${apiBaseUrl}/${link.shortCode}`;
    row.innerHTML = `
      <td><a href="${shortUrl}" target="_blank" rel="noopener noreferrer">${link.shortCode}</a></td>
      <td class="url-cell" title="${link.originalUrl}">${link.originalUrl}</td>
      <td>${formatNumber(link.clickCount)}</td>
    `;
    tableBody.appendChild(row);
  }
}

async function loadAnalytics() {
  if (!apiBaseUrl) {
    setStatus("Missing API URL. Update frontend/config.js first.", true);
    return;
  }

  const validSession = window.CloudLinksAuth.getValidSession();
  if (!validSession) {
    setStatus("Session expired. Redirecting to login...", true);
    window.setTimeout(() => window.CloudLinksAuth.redirectToLogin(), 600);
    return;
  }

  refreshButton.disabled = true;
  setStatus("Loading analytics...");

  try {
    const response = await fetch(`${apiBaseUrl}/admin/analytics`, {
      headers: {
        Authorization: `Bearer ${validSession.accessToken}`,
      },
    });

    const data = await response.json();
    if (response.status === 401 || response.status === 403) {
      window.CloudLinksAuth.clearSession();
      throw new Error("Session invalid. Please sign in again.");
    }
    if (!response.ok) {
      throw new Error(data.message || "Analytics request failed");
    }

    const summary = data.summary || { totalClicks: 0, totalLinks: 0 };
    const topLinks = data.topLinks || [];

    totalClicksEl.textContent = formatNumber(summary.totalClicks || 0);
    totalLinksEl.textContent = formatNumber(summary.totalLinks || 0);

    renderTopLinksTable(topLinks);
    createOrUpdateCharts(topLinks);

    const now = new Date();
    updatedAt.textContent = `Last updated: ${now.toLocaleString()}`;
    setStatus("Analytics loaded.");
  } catch (error) {
    setStatus(error.message || "Failed to load analytics.", true);
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadAnalytics);

logoutButton.addEventListener("click", () => {
  window.CloudLinksAuth.clearSession();
  window.location.href = window.CloudLinksAuth.getLogoutUrl();
});

loadAnalytics();


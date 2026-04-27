const SESSION_STORAGE_KEY = "cloudlinks_admin_session_v1";

function getConfig() {
  return window.APP_CONFIG || {};
}

function decodeJwt(token) {
  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = atob(padded);
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
}

function getSessionIdleLimitMs() {
  const idleMinutes = Number(getConfig().ADMIN_SESSION_IDLE_MINUTES || 30);
  return Math.max(idleMinutes, 5) * 60 * 1000;
}

function readSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function hasSessionExpired(session) {
  const now = Date.now();
  const tokenExpired = now >= (session.expiresAtEpochMs || 0);
  const idleExpired = now - (session.lastActivityEpochMs || 0) > getSessionIdleLimitMs();
  return tokenExpired || idleExpired;
}

function touchSessionActivity() {
  const session = readSession();
  if (!session) {
    return;
  }
  session.lastActivityEpochMs = Date.now();
  saveSession(session);
}

function getValidSession() {
  const session = readSession();
  if (!session) {
    return null;
  }
  if (hasSessionExpired(session)) {
    clearSession();
    return null;
  }
  return session;
}

function parseTokenHash() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");
  const expiresIn = Number(params.get("expires_in") || 3600);

  if (!accessToken || !idToken) {
    return null;
  }

  const jwtPayload = decodeJwt(idToken) || {};
  const email = jwtPayload.email || jwtPayload["cognito:username"] || "admin";
  const now = Date.now();

  return {
    accessToken,
    idToken,
    email,
    expiresAtEpochMs: now + expiresIn * 1000,
    lastActivityEpochMs: now,
  };
}

function persistSessionFromUrlHash() {
  const parsed = parseTokenHash();
  if (!parsed) {
    return null;
  }
  saveSession(parsed);
  window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  return parsed;
}

function getAuthorizeUrl() {
  const config = getConfig();
  const domain = config.COGNITO_DOMAIN || "";
  const clientId = config.COGNITO_CLIENT_ID || "";
  const redirectUri = config.COGNITO_REDIRECT_URI || "";
  const scope = encodeURIComponent("openid email profile");
  return `${domain}/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function getLogoutUrl() {
  const config = getConfig();
  const domain = config.COGNITO_DOMAIN || "";
  const clientId = config.COGNITO_CLIENT_ID || "";
  const logoutUri = config.COGNITO_LOGOUT_URI || "";
  return `${domain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

function redirectToLogin() {
  window.location.href = "admin-login.html";
}

function registerActivityTracking() {
  const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];
  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, touchSessionActivity, { passive: true });
  });
}

window.CloudLinksAuth = {
  clearSession,
  getAuthorizeUrl,
  getLogoutUrl,
  getValidSession,
  persistSessionFromUrlHash,
  redirectToLogin,
  registerActivityTracking,
};

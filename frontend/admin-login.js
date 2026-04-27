const loginButton = document.getElementById("login-button");
const loginStatus = document.getElementById("login-status");

function setStatus(text) {
  loginStatus.textContent = text;
}

const activeSession = window.CloudLinksAuth.getValidSession();
if (activeSession) {
  setStatus("Session active. Redirecting to dashboard...");
  window.setTimeout(() => {
    window.location.href = "admin.html";
  }, 300);
}

loginButton.addEventListener("click", () => {
  const config = window.APP_CONFIG || {};

  if (!config.COGNITO_DOMAIN || !config.COGNITO_CLIENT_ID || !config.COGNITO_REDIRECT_URI) {
    setStatus("Missing Cognito config. Update frontend/config.js.");
    return;
  }

  setStatus("Redirecting to secure Cognito sign-in...");

  const url =
    config.COGNITO_DOMAIN +
    "/login?client_id=" + config.COGNITO_CLIENT_ID +
    "&response_type=code" +
    "&scope=email+openid+profile" +
    "&redirect_uri=" + encodeURIComponent(config.COGNITO_REDIRECT_URI);

  window.location.href = url;
});
});


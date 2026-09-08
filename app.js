/* Class Signup — vanilla JS frontend.
 * Talks only to the public class API over HTTPS using plain fetch. Nothing is
 * stored on the client and no credentials of any kind are sent. */

"use strict";

// Absolute HTTPS URL on purpose: the API lives on a different origin than this
// deployment, so a relative "/api/signups" would hit the wrong host.
const API_BASE = "https://class2-signups-fall26.vercel.app/api/";
const SIGNUPS_URL = new URL("signups", API_BASE).toString();

const els = {
  form: document.getElementById("signup-form"),
  input: document.getElementById("name"),
  submit: document.getElementById("submit-btn"),
  fieldError: document.getElementById("field-error"),
  status: document.getElementById("status"),
  list: document.getElementById("signups"),
  count: document.getElementById("count"),
  loading: document.getElementById("list-loading"),
  empty: document.getElementById("list-empty"),
  error: document.getElementById("list-error"),
  errorText: document.getElementById("list-error-text"),
  retry: document.getElementById("retry-btn"),
  refresh: document.getElementById("refresh-btn"),
};

let lastAddedName = null;

/* ---------- UI helpers ---------- */

function showStatus(message, kind) {
  els.status.textContent = message;
  els.status.className = "status status--" + kind;
  els.status.hidden = false;
}

function clearStatus() {
  els.status.hidden = true;
  els.status.textContent = "";
}

function setFieldError(message) {
  if (message) {
    els.fieldError.textContent = message;
    els.fieldError.hidden = false;
    els.input.setAttribute("aria-invalid", "true");
  } else {
    els.fieldError.hidden = true;
    els.fieldError.textContent = "";
    els.input.removeAttribute("aria-invalid");
  }
}

function setListState(state) {
  els.loading.hidden = state !== "loading";
  els.empty.hidden = state !== "empty";
  els.error.hidden = state !== "error";
}

function renderList(signups) {
  els.list.replaceChildren();

  if (!signups.length) {
    setListState("empty");
    els.count.hidden = true;
    return;
  }

  setListState("ready");
  els.count.textContent = "(" + signups.length + ")";
  els.count.hidden = false;

  for (const entry of signups) {
    const li = document.createElement("li");
    li.textContent = entry.name; // textContent — never innerHTML — so names can't inject markup
    if (lastAddedName && entry.name === lastAddedName) {
      li.classList.add("is-new");
    }
    els.list.appendChild(li);
  }
  lastAddedName = null;
}

/* ---------- API ---------- */

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function loadSignups() {
  setListState("loading");
  els.refresh.disabled = true;
  try {
    const res = await fetch(SIGNUPS_URL, { headers: { Accept: "application/json" } });
    const body = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error((body && body.error) || `Could not load the list (HTTP ${res.status}).`);
    }

    const signups = Array.isArray(body && body.signups) ? body.signups : [];
    renderList(signups); // API returns newest first; render as received
  } catch (err) {
    setListState("error");
    els.errorText.textContent = isNetworkError(err)
      ? "Can't reach the signup service. Check your connection and try again."
      : err.message;
  } finally {
    els.refresh.disabled = false;
  }
}

async function submitSignup(name) {
  const res = await fetch(SIGNUPS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = await parseJsonSafe(res);

  if (res.status === 201) return;
  if (res.status === 409) {
    throw new Error("That name is already signed up.");
  }
  if (res.status >= 500) {
    // 500 — unexpected server problem; the request is fine to send again.
    throw new Error(
      ((body && body.error) || "The signup service hit a problem.") + " Please try again in a moment.",
    );
  }
  // 400 and other 4xx: surface the API's own explanation (bad JSON, missing/empty/too-long name).
  throw new Error((body && body.error) || `Signup failed (HTTP ${res.status}).`);
}

function isNetworkError(err) {
  return err instanceof TypeError; // fetch throws TypeError on network/CORS failure
}

/* ---------- Events ---------- */

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();
  setFieldError("");

  const name = els.input.value.trim();
  if (!name) {
    setFieldError("Please enter your name.");
    els.input.focus();
    return;
  }

  els.submit.disabled = true;
  els.submit.textContent = "Signing up…";

  try {
    await submitSignup(name);
    lastAddedName = name;
    els.form.reset();
    setFieldError("");
    showStatus(`You're signed up as "${name}".`, "success");
    await loadSignups();
    els.input.focus();
  } catch (err) {
    showStatus(
      isNetworkError(err)
        ? "Can't reach the signup service. Check your connection and try again."
        : err.message,
      "error",
    );
  } finally {
    els.submit.disabled = false;
    els.submit.textContent = "Sign up";
  }
});

els.input.addEventListener("input", () => {
  if (els.input.value.trim()) setFieldError("");
});

els.retry.addEventListener("click", loadSignups);
els.refresh.addEventListener("click", loadSignups);

loadSignups();

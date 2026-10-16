const STORAGE_KEY = "outreach-dashboard-v1";

const today = new Date();
today.setHours(0, 0, 0, 0);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const seedProspects = [
  {
    id: crypto.randomUUID(),
    name: "Maya Patel",
    account: "Northstar",
    role: "VP, Product",
    linkedinUrl: "https://linkedin.com",
    email: "maya@northstar.example",
    linkedinLastTouch: addDays(today, -5),
    linkedinNextFollowUp: addDays(today, -1),
    emailLastTouch: addDays(today, -7),
    emailNextFollowUp: addDays(today, 1),
    status: "active",
    note: "Follow up on the platform engineering use case.",
  },
  {
    id: crypto.randomUUID(),
    name: "Daniel Kim",
    account: "Northstar",
    role: "Director of Engineering",
    linkedinUrl: "https://linkedin.com",
    email: "daniel@northstar.example",
    linkedinLastTouch: addDays(today, -6),
    linkedinNextFollowUp: addDays(today, 2),
    emailLastTouch: addDays(today, -3),
    emailNextFollowUp: addDays(today, 0),
    status: "active",
    note: "Send the short customer example.",
  },
  {
    id: crypto.randomUUID(),
    name: "Jordan Brooks",
    account: "Latticeworks",
    role: "Head of AI",
    linkedinUrl: "https://linkedin.com",
    email: "",
    linkedinLastTouch: addDays(today, -2),
    linkedinNextFollowUp: addDays(today, 2),
    emailLastTouch: "",
    emailNextFollowUp: "",
    status: "active",
    note: "Waiting for a response to the connection message.",
  },
];

let prospects = loadProspects();
let queueView = "priority";
let activePage = "today";
let toastTimer;

const elements = {
  pageTitle: document.querySelector("#pageTitle"),
  dateLabel: document.querySelector("#dateLabel"),
  todayPage: document.querySelector("#todayPage"),
  prospectsPage: document.querySelector("#prospectsPage"),
  queue: document.querySelector("#queue"),
  prospectList: document.querySelector("#prospectList"),
  todayCount: document.querySelector("#todayCount"),
  dueTodayMetric: document.querySelector("#dueTodayMetric"),
  overdueMetric: document.querySelector("#overdueMetric"),
  waitingMetric: document.querySelector("#waitingMetric"),
  addProspectButton: document.querySelector("#addProspectButton"),
  prospectDialog: document.querySelector("#prospectDialog"),
  prospectForm: document.querySelector("#prospectForm"),
  accountSelect: document.querySelector("#accountSelect"),
  newAccountLabel: document.querySelector("#newAccountLabel"),
  newAccountInput: document.querySelector("#newAccountInput"),
  saveProspectButton: document.querySelector("#saveProspectButton"),
  detailDialog: document.querySelector("#detailDialog"),
  detailContent: document.querySelector("#detailContent"),
  searchInput: document.querySelector("#searchInput"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast"),
};

function loadProspects() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return seedProspects;
    return JSON.parse(stored).map((prospect) => {
      if (prospect.linkedinNextFollowUp !== undefined) return prospect;
      return {
        ...prospect,
        email: "",
        linkedinLastTouch: prospect.channel === "Email" ? "" : prospect.lastTouch || "",
        linkedinNextFollowUp: prospect.channel === "Email" ? "" : prospect.nextFollowUp || "",
        emailLastTouch: prospect.channel === "Email" ? prospect.lastTouch || "" : "",
        emailNextFollowUp: prospect.channel === "Email" ? prospect.nextFollowUp || "" : "",
        status: ["replied", "complete"].includes(prospect.status) ? prospect.status : "active",
      };
    });
  } catch {
    return seedProspects;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects));
}

function parseDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
}

function dateLabel(value) {
  const date = parseDate(value);
  if (!date) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dueCopy(nextFollowUp) {
  const due = parseDate(nextFollowUp);
  if (!due) return { label: "No follow-up date", className: "" };
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: "overdue" };
  if (days === 0) return { label: "Due today", className: "" };
  if (days === 1) return { label: "Due tomorrow", className: "" };
  return { label: `Due ${dateLabel(nextFollowUp)}`, className: "" };
}

function allTasks() {
  return prospects.flatMap((prospect) =>
    [
      { channel: "LinkedIn", nextFollowUp: prospect.linkedinNextFollowUp },
      { channel: "Email", nextFollowUp: prospect.emailNextFollowUp },
    ]
      .filter((task) => task.nextFollowUp)
      .map((task) => ({ ...task, prospect })),
  );
}

function isQueueEligible(task) {
  const due = parseDate(task.nextFollowUp);
  return !["complete", "replied"].includes(task.prospect.status) && due && due.getTime() <= today.getTime();
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function queueItem(task) {
  const { prospect, channel, nextFollowUp } = task;
  const due = dueCopy(nextFollowUp);
  return `
    <article class="queue-item">
      <button class="row-button person-meta" data-detail="${prospect.id}">
        <span class="avatar">${initials(prospect.name)}</span>
        <span class="person-copy">
          <h3>${escapeHtml(prospect.name)}</h3>
          <p>${escapeHtml(prospect.account)}</p>
          <span class="due-label ${due.className}">${due.label} · ${channel}</span>
        </span>
      </button>
      <div class="queue-actions">
        ${
          prospect.linkedinUrl
            ? `<a class="quick-button" href="${escapeHtml(prospect.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn</a>`
            : ""
        }
        ${
          prospect.email
            ? `<a class="quick-button" href="mailto:${escapeHtml(prospect.email)}">Email</a>`
            : ""
        }
        <button class="quick-button emphasis" data-contacted="${prospect.id}" data-channel="${channel}">Contacted</button>
        <button class="quick-button" data-replied="${prospect.id}">Replied</button>
        <button class="quick-button" data-snooze="${prospect.id}" data-channel="${channel}">+3 days</button>
      </div>
    </article>
  `;
}

function unscheduledItem(prospect) {
  return `
    <article class="queue-item">
      <button class="row-button person-meta" data-detail="${prospect.id}">
        <span class="avatar">${initials(prospect.name)}</span>
        <span class="person-copy">
          <h3>${escapeHtml(prospect.name)}</h3>
          <p>${escapeHtml(prospect.account)}</p>
          <span class="due-label overdue">No follow-up set</span>
        </span>
      </button>
      <div class="queue-actions">
        ${
          prospect.linkedinUrl
            ? `<a class="quick-button" href="${escapeHtml(prospect.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn</a>`
            : ""
        }
        <button class="quick-button emphasis" data-snooze="${prospect.id}" data-channel="LinkedIn">LinkedIn in 3 days</button>
        <button class="quick-button" data-snooze="${prospect.id}" data-channel="Email">Email in 3 days</button>
      </div>
    </article>
  `;
}

function renderQueue() {
  renderDueQueue();
  const unscheduled = prospects.filter(
    (prospect) =>
      !["complete", "replied"].includes(prospect.status) &&
      !prospect.linkedinNextFollowUp &&
      !prospect.emailNextFollowUp,
  );
  if (!unscheduled.length) return;
  elements.queue.insertAdjacentHTML(
    "beforeend",
    `
      <section class="queue-group">
        <p class="group-label">No follow-up set · ${unscheduled.length}</p>
        <div class="queue-list">${unscheduled.map(unscheduledItem).join("")}</div>
      </section>
    `,
  );
}

function renderDueQueue() {
  const queue = allTasks()
    .filter(isQueueEligible)
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));

  if (!queue.length) {
    elements.queue.innerHTML = `
      <div class="empty-state">
        <h3>You are caught up</h3>
        <p>No follow-ups are due today.</p>
        <button class="primary-button" data-empty-add>Add prospect</button>
      </div>
    `;
    return;
  }

  if (queueView === "account") {
    const groups = queue.reduce((result, task) => {
      result[task.prospect.account] ||= [];
      result[task.prospect.account].push(task);
      return result;
    }, {});
    elements.queue.innerHTML = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([account, group]) => `
          <section class="queue-group">
            <p class="group-label">${escapeHtml(account)} · ${group.length}</p>
            <div class="queue-list">${group.map(queueItem).join("")}</div>
          </section>
        `,
      )
      .join("");
  } else {
    const overdue = queue.filter((task) => parseDate(task.nextFollowUp) < today);
    const dueToday = queue.filter((task) => parseDate(task.nextFollowUp).getTime() === today.getTime());
    const groups = [
      ["Overdue", overdue],
      ["Due today", dueToday],
    ].filter(([, group]) => group.length);
    elements.queue.innerHTML = groups
      .map(
        ([label, group]) => `
          <section class="queue-group">
            <p class="group-label">${label} · ${group.length}</p>
            <div class="queue-list">${group.map(queueItem).join("")}</div>
          </section>
        `,
      )
      .join("");
  }
}

function statusLabel(status) {
  return {
    active: "Active",
    replied: "Replied",
    complete: "Complete",
  }[status];
}

function renderProspects() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = prospects
    .filter((prospect) =>
      [prospect.name, prospect.account, prospect.role].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!filtered.length) {
    elements.prospectList.innerHTML = `
      <div class="empty-state">
        <h3>No prospects found</h3>
        <p>Try a different search or add someone new.</p>
      </div>
    `;
    return;
  }

  elements.prospectList.innerHTML = `
    <div class="prospect-table">
      ${filtered
        .map(
          (prospect) => `
            <article class="prospect-row">
              <button class="row-button person-meta" data-detail="${prospect.id}">
                <span class="avatar">${initials(prospect.name)}</span>
                <span class="person-copy">
                  <h3>${escapeHtml(prospect.name)}</h3>
                  <p>${escapeHtml(prospect.account)}</p>
                </span>
              </button>
              <span class="row-end">
                ${
                  prospect.linkedinUrl
                    ? `<a class="quick-button" href="${escapeHtml(prospect.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn</a>`
                    : ""
                }
                ${
                  prospect.email
                    ? `<a class="quick-button" href="mailto:${escapeHtml(prospect.email)}">Email</a>`
                    : ""
                }
                <span class="status ${prospect.status}">${statusLabel(prospect.status)}</span>
              </span>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderMetrics() {
  const activeTasks = allTasks().filter((task) => !["complete", "replied"].includes(task.prospect.status));
  const dueToday = activeTasks.filter(
    (task) => parseDate(task.nextFollowUp)?.getTime() === today.getTime(),
  ).length;
  const overdue = activeTasks.filter((task) => parseDate(task.nextFollowUp) < today).length;
  const waiting = activeTasks.filter((task) => parseDate(task.nextFollowUp) > today).length;
  const queueCount = activeTasks.filter(isQueueEligible).length;

  elements.dueTodayMetric.textContent = dueToday;
  elements.overdueMetric.textContent = overdue;
  elements.waitingMetric.textContent = waiting;
  elements.todayCount.textContent = queueCount;
}

function renderAccountOptions() {
  const current = elements.accountSelect.value;
  const accounts = [...new Set(prospects.map((prospect) => prospect.account).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
  elements.accountSelect.innerHTML = `
    <option value="" disabled ${current ? "" : "selected"}>Select an account</option>
    ${accounts.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join("")}
    <option value="__new__">+ Add new account</option>
  `;
  if (accounts.includes(current)) elements.accountSelect.value = current;
}

function render() {
  renderMetrics();
  renderQueue();
  renderProspects();
  renderAccountOptions();
}

function setPage(page) {
  activePage = page;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  elements.todayPage.hidden = page !== "today";
  elements.prospectsPage.hidden = page !== "prospects";
  elements.pageTitle.textContent = page === "today" ? "Today" : "Prospects";
}

function openDetail(id) {
  const prospect = prospects.find((item) => item.id === id);
  if (!prospect) return;

  elements.detailContent.innerHTML = `
    <div class="dialog-header">
      <div class="person-meta">
        <span class="avatar">${initials(prospect.name)}</span>
        <div>
          <h2>${escapeHtml(prospect.name)}</h2>
          <p>${escapeHtml(prospect.account)}</p>
        </div>
      </div>
      <button class="icon-button" data-close-detail aria-label="Close">×</button>
    </div>
    <dl class="detail-block">
      <dt>Status</dt>
      <dd>${statusLabel(prospect.status)}</dd>
      <dt>Last touch</dt>
      <dd>LinkedIn: ${dateLabel(prospect.linkedinLastTouch)}<br>Email: ${dateLabel(prospect.emailLastTouch)}</dd>
      <dt>Next follow-ups</dt>
      <dd>LinkedIn: ${dateLabel(prospect.linkedinNextFollowUp)}<br>Email: ${dateLabel(prospect.emailNextFollowUp)}</dd>
      <dt>Contact</dt>
      <dd>${escapeHtml(prospect.email || "No email address added.")}</dd>
      <dt>Note</dt>
      <dd>${escapeHtml(prospect.note || "No note added.")}</dd>
    </dl>
    <div class="detail-actions">
      ${
        prospect.linkedinUrl
          ? `<a class="secondary-button" href="${escapeHtml(prospect.linkedinUrl)}" target="_blank" rel="noreferrer">Open LinkedIn</a>`
          : ""
      }
      ${
        prospect.email
          ? `<a class="secondary-button" href="mailto:${escapeHtml(prospect.email)}">Open email</a>`
          : ""
      }
      <button class="quick-button emphasis" data-contacted="${prospect.id}" data-channel="LinkedIn">LinkedIn contacted</button>
      <button class="quick-button emphasis" data-contacted="${prospect.id}" data-channel="Email">Email contacted</button>
      <button class="quick-button" data-replied="${prospect.id}">Replied</button>
      <button class="danger-button" data-delete="${prospect.id}">Delete</button>
    </div>
  `;
  elements.detailDialog.showModal();
}

function updateProspect(id, updates, message) {
  prospects = prospects.map((prospect) => (prospect.id === id ? { ...prospect, ...updates } : prospect));
  persist();
  render();
  if (elements.detailDialog.open) elements.detailDialog.close();
  showToast(message);
}

function handleAction(target) {
  const detailId = target.closest("[data-detail]")?.dataset.detail;
  if (detailId) return openDetail(detailId);

  const contactedId = target.closest("[data-contacted]")?.dataset.contacted;
  if (contactedId) {
    const channel = target.closest("[data-contacted]").dataset.channel;
    const key = channel === "Email" ? "email" : "linkedin";
    return updateProspect(
      contactedId,
      {
        [`${key}LastTouch`]: addDays(today, 0),
        [`${key}NextFollowUp`]: addDays(today, 3),
        status: "active",
      },
      `${channel} contact logged. Follow-up set for 3 days.`,
    );
  }

  const repliedId = target.closest("[data-replied]")?.dataset.replied;
  if (repliedId) {
    return updateProspect(repliedId, { status: "replied" }, "Marked as replied.");
  }

  const snoozeId = target.closest("[data-snooze]")?.dataset.snooze;
  if (snoozeId) {
    const channel = target.closest("[data-snooze]").dataset.channel;
    const key = channel === "Email" ? "emailNextFollowUp" : "linkedinNextFollowUp";
    const prospect = prospects.find((item) => item.id === snoozeId);
    return updateProspect(
      snoozeId,
      { [key]: addDays(parseDate(prospect[key]) || today, 3) },
      "Follow-up moved 3 days.",
    );
  }

  const deleteId = target.closest("[data-delete]")?.dataset.delete;
  if (deleteId && confirm("Delete this prospect?")) {
    prospects = prospects.filter((prospect) => prospect.id !== deleteId);
    persist();
    elements.detailDialog.close();
    render();
    showToast("Prospect deleted.");
  }

  if (target.closest("[data-close-detail]")) elements.detailDialog.close();
  if (target.closest("[data-empty-add]")) elements.prospectDialog.showModal();
}

elements.dateLabel.textContent = today.toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

elements.addProspectButton.addEventListener("click", () => {
  elements.prospectForm.reset();
  renderAccountOptions();
  elements.newAccountLabel.hidden = true;
  elements.prospectDialog.showModal();
});

elements.accountSelect.addEventListener("change", () => {
  const isNew = elements.accountSelect.value === "__new__";
  elements.newAccountLabel.hidden = !isNew;
  elements.newAccountInput.required = isNew;
  if (isNew) elements.newAccountInput.focus();
});

elements.prospectForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!elements.prospectForm.reportValidity()) return;
  const data = Object.fromEntries(new FormData(elements.prospectForm));
  if (data.account === "__new__") {
    data.account = elements.newAccountInput.value.trim();
    if (!data.account) return;
  }
  prospects.unshift({ id: crypto.randomUUID(), ...data });
  persist();
  elements.prospectDialog.close();
  elements.prospectForm.reset();
  render();
  showToast("Prospect added.");
});

document.addEventListener("click", (event) => handleAction(event.target));

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setPage(button.dataset.page));
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    queueView = button.dataset.view;
    document.querySelectorAll("[data-view]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderQueue();
  });
});

elements.searchInput.addEventListener("input", renderProspects);

elements.exportButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ version: 1, prospects }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `outreach-backup-${addDays(today, 0)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Backup exported.");
});

elements.importInput.addEventListener("change", async () => {
  const file = elements.importInput.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.prospects)) throw new Error("Invalid backup");
    prospects = parsed.prospects;
    persist();
    render();
    showToast("Backup imported.");
  } catch {
    showToast("That backup file could not be imported.");
  } finally {
    elements.importInput.value = "";
  }
});

render();

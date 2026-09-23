/**
 * notification-center-card
 *
 * Drei Kategorien (Benachrichtigungen / Updates / Reparaturen) als Tabs
 * nebeneinander - im Look & Feel an die Schwester-Karten "FRITZ!Box Anrufe"
 * und "FRITZ!Box Netzwerk" angelehnt. Suche, Filterleiste, Detail-Popup,
 * einzeln ein-/ausblendbare Kategorien, ein-/ausblendbarer Titel und frei
 * wählbare Farben. Der grafische Editor ist in aufklappbare Abschnitte
 * gegliedert (Sensoren / Darstellung / Kategorien / Farben), ebenfalls wie
 * bei den anderen Integrationen.
 *
 * Erwartete Sensoren (siehe custom_components/notification_center/sensor.py):
 *   state              -> Anzahl offener Einträge
 *   attributes.items   -> Liste der Einzeleinträge
 *   attributes.summary -> ein fertiger Kurztext (fürs Android-Widget)
 */

const DEFAULT_TITLE = "Notification Center";
const DEFAULT_ICON = "mdi:bell-badge-outline";

const CATEGORY_DEFS = [
  {
    key: "notifications",
    label: "Benachrichtigungen",
    icon: "mdi:bell-outline",
    colorKey: "color_notification",
    colorFallback: "var(--info-color, #0288d1)",
  },
  {
    key: "updates",
    label: "Updates",
    icon: "mdi:package-up",
    colorKey: "color_update",
    colorFallback: "var(--warning-color, #fb8c00)",
  },
  {
    key: "repairs",
    label: "Reparaturen",
    icon: "mdi:wrench-outline",
    colorKey: "color_repair",
    colorFallback: "var(--error-color, #e53935)",
  },
];

const FILTER_DEFS = {
  notifications: [{ id: "all", label: "Alle", test: () => true }],
  updates: [
    { id: "all", label: "Alle", test: () => true },
    { id: "in_progress", label: "Läuft", test: (item) => !!item.in_progress },
  ],
  repairs: [
    { id: "all", label: "Alle", test: () => true },
    { id: "fixable", label: "Behebbar", test: (item) => !!item.is_fixable },
    {
      id: "critical",
      label: "Kritisch",
      test: (item) => item.severity === "critical" || item.severity === "error",
    },
  ],
};

const HEX_RE = /^#([0-9a-f]{6})$/i;

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return "Gerade eben";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Vor ${diffMinutes} Minute${diffMinutes === 1 ? "" : "n"}`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Vor ${diffHours} Stunde${diffHours === 1 ? "" : "n"}`;
  const diffDays = Math.floor(diffHours / 24);
  return `Vor ${diffDays} Tag${diffDays === 1 ? "" : "en"}`;
}

function navigate(path) {
  history.pushState(null, "", path);
  window.dispatchEvent(new Event("location-changed", { bubbles: true, composed: true }));
}

function isCategoryVisible(config, def) {
  return config[`show_${def.key}`] !== false;
}

// Verhindert, dass Home Assistants globale Tastenkürzel (Quick-Bar: "e",
// "c", "m", …) auslösen, während im Such- oder Textfeld der Karte/des
// Editors getippt wird. Home Assistants Quick-Bar-Listener hängt am
// document und prüft ev.target - liegt das Feld in unserem Shadow DOM,
// wird das Event beim Aufsteigen an der Shadow-Grenze auf das Karten-
// Element zurückgesetzt (Retargeting), sodass die Prüfung "ist das ein
// Eingabefeld?" fehlschlägt und die Quick-Bar trotzdem aufgeht. Deshalb
// stoppen wir die Weiterleitung hier explizit.
function stopKeyPropagation(el) {
  ["keydown", "keypress", "keyup"].forEach((type) => {
    el.addEventListener(type, (ev) => ev.stopPropagation());
  });
}

class NotificationCenterCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("notification-center-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:notification-center-card",
      title: DEFAULT_TITLE,
      icon: DEFAULT_ICON,
      show_title: true,
      show_search: true,
      show_notifications: true,
      show_updates: true,
      show_repairs: true,
      entities: {
        notifications: "sensor.notification_center_benachrichtigungen",
        updates: "sensor.notification_center_updates",
        repairs: "sensor.notification_center_reparaturen",
      },
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._activeTab = null;
    this._search = "";
    this._activeFilter = { notifications: "all", updates: "all", repairs: "all" };
    this._detailItem = null;
  }

  setConfig(config) {
    if (!config || !config.entities) {
      throw new Error("notification-center-card: 'entities' fehlt in der Konfiguration");
    }
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 5;
  }

  _visibleCategories() {
    return CATEGORY_DEFS.filter((def) => isCategoryVisible(this._config, def));
  }

  _entityIdFor(key) {
    return this._config.entities[key];
  }

  _stateFor(key) {
    const entityId = this._entityIdFor(key);
    return entityId ? this._hass.states[entityId] : undefined;
  }

  _itemsFor(key) {
    const state = this._stateFor(key);
    return (state && state.attributes && state.attributes.items) || [];
  }

  _colorFor(def) {
    const configured = this._config[def.colorKey];
    return configured && configured.trim() ? configured.trim() : def.colorFallback;
  }

  _callService(domain, service, data) {
    if (!this._hass) return;
    this._hass.callService(domain, service, data);
  }

  _handleAction(category, item, ev) {
    ev.stopPropagation();
    if (category === "notifications") {
      this._callService("persistent_notification", "dismiss", { notification_id: item.id });
    } else if (category === "updates") {
      if (!item.in_progress) {
        this._callService("update", "install", { entity_id: item.entity_id });
      }
    } else if (category === "repairs") {
      navigate("/config/repairs");
    }
  }

  _handleDismissAll() {
    this._callService("persistent_notification", "dismiss_all", {});
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;

    const visibleCategories = this._visibleCategories();
    const showTitle = this._config.show_title !== false;
    const title = this._config.title || DEFAULT_TITLE;
    const headerIcon = this._config.icon || DEFAULT_ICON;

    const headerHtml = showTitle
      ? `<div class="header"><ha-icon icon="${headerIcon}"></ha-icon><span>${escapeHtml(title)}</span></div>`
      : "";

    if (!visibleCategories.length) {
      this.shadowRoot.innerHTML = `
        <style>${this._css()}</style>
        <ha-card>
          ${headerHtml}
          <div class="empty">
            <ha-icon icon="mdi:eye-off-outline"></ha-icon>
            <span>Alle Kategorien sind ausgeblendet</span>
          </div>
        </ha-card>`;
      return;
    }

    if (!this._activeTab || !visibleCategories.some((def) => def.key === this._activeTab)) {
      this._activeTab = visibleCategories[0].key;
    }

    const tabsHtml = visibleCategories
      .map((def) => {
        const count = this._itemsFor(def.key).length;
        const active = this._activeTab === def.key ? "active" : "";
        const color = this._colorFor(def);
        return `
        <button class="tab ${active}" data-tab="${def.key}" style="--tab-color:${color}">
          <ha-icon icon="${def.icon}"></ha-icon>
          <span>${def.label}</span>
          ${count > 0 ? `<span class="badge">${count}</span>` : ""}
        </button>`;
      })
      .join("");

    const activeDef = visibleCategories.find((d) => d.key === this._activeTab);
    const allItems = this._itemsFor(this._activeTab);
    const filters = FILTER_DEFS[this._activeTab] || [];
    const activeFilterId = this._activeFilter[this._activeTab] || "all";
    const activeFilterDef = filters.find((f) => f.id === activeFilterId) || filters[0];

    const searchTerm = this._search.trim().toLowerCase();
    const items = allItems.filter((item) => {
      if (activeFilterDef && !activeFilterDef.test(item)) return false;
      if (!searchTerm) return true;
      const haystack = `${item.title || ""} ${item.message || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const showSearch = this._config.show_search !== false;
    const showDismissAll = this._activeTab === "notifications" && allItems.length > 0;

    const toolbarHtml =
      showSearch || showDismissAll
        ? `<div class="toolbar-row">
             ${
               showSearch
                 ? `<div class="toolbar">
                      <ha-icon icon="mdi:magnify"></ha-icon>
                      <input type="text" placeholder="Suchen …" value="${escapeHtml(this._search)}" />
                    </div>`
                 : ""
             }
             ${
               showDismissAll
                 ? `<button class="dismiss-all"><ha-icon icon="mdi:notification-clear-all"></ha-icon><span>Alle löschen</span></button>`
                 : ""
             }
           </div>`
        : "";

    const filterChipsHtml =
      filters.length > 1
        ? `<div class="filters">
            ${filters
              .map(
                (f) =>
                  `<button class="chip ${f.id === activeFilterId ? "active" : ""}" data-filter="${f.id}">${f.label}</button>`
              )
              .join("")}
          </div>`
        : "";

    const listHtml = items.length
      ? items.map((item) => this._renderRow(this._activeTab, activeDef, item)).join("")
      : `<div class="empty">
           <ha-icon icon="mdi:check-circle-outline"></ha-icon>
           <span>Keine offenen Einträge</span>
         </div>`;

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <ha-card>
        ${headerHtml}
        <div class="tabs">${tabsHtml}</div>
        ${toolbarHtml}
        ${filterChipsHtml}
        <div class="list">${listHtml}</div>
      </ha-card>
      ${this._detailItem ? this._renderPopup(activeDef, this._detailItem) : ""}
    `;

    this._attachListeners();
  }

  _renderRow(category, def, item) {
    const color = this._colorFor(def);
    const timeLabel = formatTimeAgo(item.created_at);
    let actionIcon = "mdi:close";
    let actionTitle = "Löschen";
    let actionDisabled = "";

    if (category === "updates") {
      actionIcon = item.in_progress ? "mdi:progress-clock" : "mdi:check";
      actionTitle = item.in_progress ? "Update läuft" : "Jetzt installieren";
      actionDisabled = item.in_progress ? "disabled" : "";
    } else if (category === "repairs") {
      actionIcon = "mdi:chevron-right";
      actionTitle = "Zu den Reparaturen";
    }

    return `
      <div class="row" data-item-id="${escapeHtml(item.id || item.entity_id || item.issue_id)}" data-category="${category}">
        <div class="row-dot" style="background:${color}"></div>
        <div class="row-body">
          <div class="row-title">${escapeHtml(item.title)}</div>
          ${item.message ? `<div class="row-message">${escapeHtml(item.message)}</div>` : ""}
          ${timeLabel ? `<div class="row-time">${timeLabel}</div>` : ""}
        </div>
        <button class="row-action" title="${actionTitle}" data-action="1" ${actionDisabled}>
          <ha-icon icon="${actionIcon}"></ha-icon>
        </button>
      </div>`;
  }

  _renderPopup(def, item) {
    const fields = Object.entries(item)
      .filter(([key]) => key !== "title")
      .map(
        ([key, value]) =>
          `<div class="detail-row"><span class="detail-key">${escapeHtml(key)}</span><span class="detail-value">${escapeHtml(value)}</span></div>`
      )
      .join("");

    const footerButtons = [];
    if (def.key === "notifications") {
      footerButtons.push(`<button class="popup-primary" data-popup-delete>Löschen</button>`);
    } else if (def.key === "updates") {
      if (item.in_progress) {
        footerButtons.push(`<button class="popup-primary" disabled>Update läuft …</button>`);
      } else {
        footerButtons.push(`<button class="popup-primary" data-popup-install>Jetzt installieren</button>`);
      }
      if (item.release_url) {
        footerButtons.push(
          `<button class="popup-secondary" data-popup-release-url="${escapeHtml(item.release_url)}">Update-Notizen öffnen</button>`
        );
      }
    } else if (def.key === "repairs") {
      footerButtons.push(`<button class="popup-primary" data-popup-goto-repairs>Zu den Reparaturen</button>`);
    }

    return `
      <div class="popup-overlay" data-popup-overlay>
        <div class="popup">
          <div class="popup-header">
            <ha-icon icon="${def.icon}" style="color:${this._colorFor(def)}"></ha-icon>
            <span>${escapeHtml(item.title)}</span>
            <button class="popup-close" data-popup-close><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="popup-body">${fields}</div>
          ${footerButtons.length ? `<div class="popup-footer">${footerButtons.join("")}</div>` : ""}
        </div>
      </div>`;
  }

  _attachListeners() {
    const root = this.shadowRoot;

    root.querySelectorAll("[data-tab]").forEach((el) => {
      el.addEventListener("click", () => {
        this._activeTab = el.getAttribute("data-tab");
        this._search = "";
        this._detailItem = null;
        this._render();
      });
    });

    root.querySelectorAll("[data-filter]").forEach((el) => {
      el.addEventListener("click", () => {
        this._activeFilter[this._activeTab] = el.getAttribute("data-filter");
        this._render();
      });
    });

    const searchInput = root.querySelector(".toolbar input");
    if (searchInput) {
      stopKeyPropagation(searchInput);
      searchInput.addEventListener("input", (ev) => {
        this._search = ev.target.value;
        this._render();
      });
    }

    const dismissAllBtn = root.querySelector(".dismiss-all");
    if (dismissAllBtn) {
      dismissAllBtn.addEventListener("click", () => this._handleDismissAll());
    }

    root.querySelectorAll(".row").forEach((rowEl) => {
      const category = rowEl.getAttribute("data-category");
      const itemId = rowEl.getAttribute("data-item-id");
      const item = this._itemsFor(category).find(
        (candidate) => (candidate.id || candidate.entity_id || candidate.issue_id) === itemId
      );
      if (!item) return;

      rowEl.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-action]")) return;
        this._detailItem = item;
        this._render();
      });

      const actionButton = rowEl.querySelector("[data-action]");
      if (actionButton) {
        actionButton.addEventListener("click", (ev) => this._handleAction(category, item, ev));
      }
    });

    const overlay = root.querySelector("[data-popup-overlay]");
    if (overlay) {
      const closePopup = () => {
        this._detailItem = null;
        this._render();
      };
      overlay.addEventListener("click", (ev) => {
        if (ev.target === overlay) closePopup();
      });
      const closeBtn = root.querySelector("[data-popup-close]");
      if (closeBtn) closeBtn.addEventListener("click", closePopup);
      const deleteBtn = root.querySelector("[data-popup-delete]");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          if (this._detailItem) {
            this._callService("persistent_notification", "dismiss", {
              notification_id: this._detailItem.id,
            });
          }
          closePopup();
        });
      }
      const repairsBtn = root.querySelector("[data-popup-goto-repairs]");
      if (repairsBtn) repairsBtn.addEventListener("click", () => navigate("/config/repairs"));
      const releaseBtn = root.querySelector("[data-popup-release-url]");
      if (releaseBtn) {
        releaseBtn.addEventListener("click", () => {
          window.open(releaseBtn.getAttribute("data-popup-release-url"), "_blank", "noopener");
        });
      }
      const installBtn = root.querySelector("[data-popup-install]");
      if (installBtn) {
        installBtn.addEventListener("click", () => {
          if (this._detailItem) {
            this._callService("update", "install", { entity_id: this._detailItem.entity_id });
          }
          closePopup();
        });
      }
    }
  }

  _css() {
    return `
      ha-card { padding: 8px 0 4px; }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1rem;
        font-weight: 500;
        padding: 8px 16px 4px;
      }
      .header ha-icon { --mdc-icon-size: 22px; color: var(--primary-color); }
      .tabs {
        display: flex;
        gap: 4px;
        padding: 4px 8px;
        overflow-x: auto;
      }
      .tab {
        display: flex;
        align-items: center;
        gap: 6px;
        border: none;
        background: none;
        font: inherit;
        color: var(--secondary-text-color);
        padding: 6px 10px;
        border-radius: 16px;
        cursor: pointer;
        white-space: nowrap;
      }
      .tab.active {
        color: var(--primary-text-color);
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12);
      }
      .tab ha-icon { color: var(--tab-color); --mdc-icon-size: 20px; }
      .badge {
        background: var(--tab-color);
        color: white;
        border-radius: 10px;
        font-size: 0.72rem;
        padding: 1px 6px;
        min-width: 16px;
        text-align: center;
      }
      .toolbar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 16px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        padding: 6px 10px;
        border-radius: 8px;
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
      }
      .toolbar ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 18px; }
      .toolbar input {
        border: none;
        background: none;
        outline: none;
        font: inherit;
        color: var(--primary-text-color);
        flex: 1;
      }
      .dismiss-all {
        display: flex;
        align-items: center;
        gap: 4px;
        border: none;
        background: none;
        color: var(--primary-color);
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 6px 8px;
        white-space: nowrap;
      }
      .dismiss-all ha-icon { --mdc-icon-size: 18px; }
      .filters {
        display: flex;
        gap: 6px;
        padding: 4px 16px 4px;
        flex-wrap: wrap;
      }
      .chip {
        border: 1px solid var(--divider-color, #e0e0e0);
        background: none;
        border-radius: 14px;
        padding: 3px 10px;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        cursor: pointer;
      }
      .chip.active {
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        border-color: var(--primary-color);
      }
      .list { padding: 4px 8px 8px; }
      .row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 8px;
        border-radius: 8px;
        cursor: pointer;
      }
      .row:hover { background: var(--secondary-background-color, rgba(0,0,0,0.04)); }
      .row-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
      }
      .row-body { flex: 1; min-width: 0; }
      .row-title { font-weight: 500; color: var(--primary-text-color); }
      .row-message {
        color: var(--secondary-text-color);
        font-size: 0.9rem;
        margin-top: 2px;
      }
      .row-time {
        color: var(--secondary-text-color);
        font-size: 0.78rem;
        margin-top: 4px;
      }
      .row-action {
        border: none;
        background: none;
        color: var(--secondary-text-color);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
      }
      .row-action:hover { background: rgba(0,0,0,0.06); }
      .row-action[disabled] { opacity: 0.4; cursor: default; }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 24px 0;
        color: var(--secondary-text-color);
      }
      .empty ha-icon { --mdc-icon-size: 32px; color: var(--success-color, #43a047); }
      .popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .popup {
        background: var(--card-background-color, white);
        border-radius: 12px;
        width: min(420px, 90vw);
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      .popup-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        font-weight: 500;
      }
      .popup-header span { flex: 1; }
      .popup-close { border: none; background: none; cursor: pointer; color: var(--secondary-text-color); }
      .popup-body { padding: 12px 16px; }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 0;
        border-bottom: 1px solid var(--divider-color, #f0f0f0);
        font-size: 0.9rem;
      }
      .detail-key { color: var(--secondary-text-color); }
      .detail-value { text-align: right; word-break: break-word; }
      .popup-footer {
        padding: 8px 16px 16px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .popup-primary {
        border: none;
        background: var(--primary-color);
        color: var(--text-primary-color, white);
        border-radius: 8px;
        padding: 8px 14px;
        cursor: pointer;
        font: inherit;
      }
      .popup-primary[disabled] { opacity: 0.5; cursor: default; }
      .popup-secondary {
        border: 1px solid var(--divider-color, #e0e0e0);
        background: none;
        color: var(--primary-color);
        border-radius: 8px;
        padding: 8px 14px;
        cursor: pointer;
        font: inherit;
      }
    `;
  }
}

/**
 * Editor: in aufklappbare Abschnitte (ha-expansion-panel) gegliedert -
 * Sensoren / Darstellung / Kategorien / Farben - wie bei den anderen
 * Integrationen. Innerhalb jedes Abschnitts ein ha-form-Block, bei Farben
 * eine handgebaute Sektion mit Swatch + Texteingabe + "Alle zurücksetzen".
 */
class NotificationCenterCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (!this._built) {
      this._buildEditor();
      this._built = true;
    }
    this._syncFromConfig();
  }

  set hass(hass) {
    this._hass = hass;
    this._forms.forEach((form) => (form.hass = hass));
  }

  _section(title, icon, expanded) {
    const panel = document.createElement("ha-expansion-panel");
    panel.setAttribute("outlined", "");
    if (expanded) panel.setAttribute("expanded", "");
    panel.innerHTML = `
      <div slot="header" class="section-header">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${title}</span>
      </div>
    `;
    return panel;
  }

  _buildEditor() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .editor-list { display: flex; flex-direction: column; gap: 6px; padding: 8px; }
        ha-expansion-panel { border-radius: 8px; }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          font-weight: 500;
        }
        .section-header ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); }
        .section-body { padding: 8px 12px 12px; }
        .color-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
        }
        .color-row label { flex: 1; color: var(--primary-text-color); font-size: 0.9rem; }
        .color-row input[type="color"] {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          padding: 0;
          background: none;
          cursor: pointer;
        }
        .color-row input[type="text"] {
          width: 140px;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #e0e0e0);
          font: inherit;
          background: var(--card-background-color, white);
          color: var(--primary-text-color);
        }
        .reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          border: none;
          background: none;
          color: var(--primary-color);
          cursor: pointer;
          font: inherit;
          padding: 4px 0;
        }
        .reset-btn ha-icon { --mdc-icon-size: 18px; }
      </style>
      <div class="editor-list" id="list"></div>
    `;
    const list = this.shadowRoot.getElementById("list");
    this._forms = [];

    // --- Sensoren ---
    const sensorsPanel = this._section("Sensoren", "mdi:database-outline", true);
    const sensorsBody = document.createElement("div");
    sensorsBody.className = "section-body";
    const sensorsForm = document.createElement("ha-form");
    sensorsForm.schema = [
      { name: "entity_notifications", selector: { entity: { domain: "sensor" } } },
      { name: "entity_updates", selector: { entity: { domain: "sensor" } } },
      { name: "entity_repairs", selector: { entity: { domain: "sensor" } } },
    ];
    sensorsForm.computeLabel = (schema) => this._labelFor(schema.name);
    sensorsForm.addEventListener("value-changed", (ev) => {
      this._config = this._unflatten(ev.detail.value, this._config);
      this._emit();
    });
    sensorsBody.appendChild(sensorsForm);
    sensorsPanel.appendChild(sensorsBody);
    list.appendChild(sensorsPanel);
    this._forms.push(sensorsForm);

    // --- Darstellung ---
    const displayPanel = this._section("Darstellung", "mdi:view-dashboard-outline", false);
    const displayBody = document.createElement("div");
    displayBody.className = "section-body";
    const displayForm = document.createElement("ha-form");
    displayForm.schema = [
      { name: "title", selector: { text: {} } },
      { name: "show_title", selector: { boolean: {} } },
      { name: "icon", selector: { icon: {} } },
      { name: "show_search", selector: { boolean: {} } },
    ];
    displayForm.computeLabel = (schema) => this._labelFor(schema.name);
    displayForm.addEventListener("value-changed", (ev) => {
      this._config = this._unflatten(ev.detail.value, this._config);
      this._emit();
    });
    displayBody.appendChild(displayForm);
    displayPanel.appendChild(displayBody);
    list.appendChild(displayPanel);
    this._forms.push(displayForm);

    // --- Kategorien ---
    const categoriesPanel = this._section("Kategorien", "mdi:eye-outline", false);
    const categoriesBody = document.createElement("div");
    categoriesBody.className = "section-body";
    const categoriesForm = document.createElement("ha-form");
    categoriesForm.schema = [
      { name: "show_notifications", selector: { boolean: {} } },
      { name: "show_updates", selector: { boolean: {} } },
      { name: "show_repairs", selector: { boolean: {} } },
    ];
    categoriesForm.computeLabel = (schema) => this._labelFor(schema.name);
    categoriesForm.addEventListener("value-changed", (ev) => {
      this._config = this._unflatten(ev.detail.value, this._config);
      this._emit();
    });
    categoriesBody.appendChild(categoriesForm);
    categoriesPanel.appendChild(categoriesBody);
    list.appendChild(categoriesPanel);
    this._forms.push(categoriesForm);

    // --- Farben ---
    const colorsPanel = this._section("Farben", "mdi:palette-outline", false);
    const colorsBody = document.createElement("div");
    colorsBody.className = "section-body";
    colorsBody.innerHTML = `
      <div class="color-row" data-key="color_notification">
        <label>Benachrichtigungen</label>
        <input type="color" />
        <input type="text" placeholder="Hex, rgb(), hsl(), var(--…)" />
      </div>
      <div class="color-row" data-key="color_update">
        <label>Updates</label>
        <input type="color" />
        <input type="text" placeholder="Hex, rgb(), hsl(), var(--…)" />
      </div>
      <div class="color-row" data-key="color_repair">
        <label>Reparaturen</label>
        <input type="color" />
        <input type="text" placeholder="Hex, rgb(), hsl(), var(--…)" />
      </div>
      <button class="reset-btn"><ha-icon icon="mdi:restore"></ha-icon><span>Alle Farben zurücksetzen</span></button>
    `;
    colorsPanel.appendChild(colorsBody);
    list.appendChild(colorsPanel);

    this._colorInputs = {};
    colorsBody.querySelectorAll(".color-row").forEach((row) => {
      const key = row.getAttribute("data-key");
      const swatch = row.querySelector('input[type="color"]');
      const text = row.querySelector('input[type="text"]');
      this._colorInputs[key] = { swatch, text };

      stopKeyPropagation(text);
      swatch.addEventListener("input", () => {
        text.value = swatch.value;
        this._config[key] = swatch.value;
        this._emit();
      });
      text.addEventListener("input", () => {
        this._config[key] = text.value;
        if (HEX_RE.test(text.value)) swatch.value = text.value;
        this._emit();
      });
    });

    colorsBody.querySelector(".reset-btn").addEventListener("click", () => {
      ["color_notification", "color_update", "color_repair"].forEach((key) => {
        this._config[key] = "";
        this._colorInputs[key].text.value = "";
        this._colorInputs[key].swatch.value = "#000000";
      });
      this._emit();
    });
  }

  _syncFromConfig() {
    const flat = this._flatten(this._config);
    this._forms.forEach((form) => (form.data = flat));
    ["color_notification", "color_update", "color_repair"].forEach((key) => {
      const value = this._config[key] || "";
      const pair = this._colorInputs[key];
      pair.text.value = value;
      pair.swatch.value = HEX_RE.test(value) ? value : "#000000";
    });
  }

  _emit() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
  }

  _labelFor(name) {
    const labels = {
      title: "Titel",
      show_title: "Titel anzeigen",
      icon: "Icon (Kartenkopf)",
      entity_notifications: "Sensor: Benachrichtigungen",
      entity_updates: "Sensor: Updates",
      entity_repairs: "Sensor: Reparaturen",
      show_search: "Suchfeld anzeigen",
      show_notifications: "Kategorie „Benachrichtigungen“ anzeigen",
      show_updates: "Kategorie „Updates“ anzeigen",
      show_repairs: "Kategorie „Reparaturen“ anzeigen",
    };
    return labels[name] || name;
  }

  _flatten(config) {
    const entities = config.entities || {};
    return {
      title: config.title || "",
      show_title: config.show_title !== false,
      icon: config.icon || DEFAULT_ICON,
      entity_notifications: entities.notifications || "",
      entity_updates: entities.updates || "",
      entity_repairs: entities.repairs || "",
      show_search: config.show_search !== false,
      show_notifications: config.show_notifications !== false,
      show_updates: config.show_updates !== false,
      show_repairs: config.show_repairs !== false,
    };
  }

  _unflatten(flat, previousConfig) {
    return {
      ...previousConfig,
      type: "custom:notification-center-card",
      title: flat.title,
      show_title: flat.show_title,
      icon: flat.icon,
      show_search: flat.show_search,
      show_notifications: flat.show_notifications,
      show_updates: flat.show_updates,
      show_repairs: flat.show_repairs,
      entities: {
        notifications: flat.entity_notifications,
        updates: flat.entity_updates,
        repairs: flat.entity_repairs,
      },
    };
  }
}

customElements.define("notification-center-card", NotificationCenterCard);
customElements.define("notification-center-card-editor", NotificationCenterCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "notification-center-card",
  name: "Notification Center",
  description:
    "Benachrichtigungen, Updates und Reparaturen als eine Karte mit Tabs, Suche, Filtern und ein-/ausblendbaren Kategorien.",
});

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
    // Tippt der Nutzer gerade im Suchfeld, darf das Feld NICHT neu aufgebaut
    // werden (Fokus/Tastatur gehen sonst verloren) - nur die Liste erneuern.
    if (this._isSearchFocused()) {
      this._updateList();
      return;
    }
    this._render();
  }

  _isSearchFocused() {
    const root = this.shadowRoot;
    const active = root && root.activeElement;
    return !!(active && active.getAttribute && active.getAttribute("data-role") === "search");
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
    const value = configured && String(configured).trim();
    return value && SAFE_COLOR_RE.test(value) ? value : def.colorFallback;
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

  _captureFocus() {
    const root = this.shadowRoot;
    const active = root && root.activeElement;
    if (!active || !active.hasAttribute("data-role")) return null;
    return {
      role: active.getAttribute("data-role"),
      selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : null,
      selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
    };
  }

  _restoreFocus(saved) {
    if (!saved) return;
    const el = this.shadowRoot.querySelector(`[data-role="${saved.role}"]`);
    if (!el) return;
    el.focus();
    if (saved.selectionStart !== null && typeof el.setSelectionRange === "function") {
      try {
        el.setSelectionRange(saved.selectionStart, saved.selectionEnd);
      } catch (err) {
        /* manche Input-Typen erlauben keine Selection-Range - ignorieren */
      }
    }
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;

    const savedFocus = this._captureFocus();

    const visibleCategories = this._visibleCategories();
    const showTitle = this._config.show_title !== false;
    const title = this._config.title || DEFAULT_TITLE;
    const headerIcon = typeof this._config.icon === "undefined" ? DEFAULT_ICON : this._config.icon;

    const headerHtml = showTitle
      ? `<div class="header">${headerIcon ? `<ha-icon icon="${headerIcon}"></ha-icon>` : ""}<span>${escapeHtml(title)}</span></div>`
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
      this._restoreFocus(savedFocus);
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

    const showSearch = this._config.show_search !== false;
    const showDismissAll = this._activeTab === "notifications" && allItems.length > 0;

    const toolbarHtml =
      showSearch || showDismissAll
        ? `<div class="toolbar-row">
             ${
               showSearch
                 ? `<div class="toolbar">
                      <ha-icon icon="mdi:magnify"></ha-icon>
                      <input type="text" data-role="search" autocomplete="off" placeholder="Suchen …" value="${escapeHtml(this._search)}" />
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

    const listHtml = this._listHtml(activeDef);

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
    this._restoreFocus(savedFocus);
  }

  _visibleItems() {
    const allItems = this._itemsFor(this._activeTab);
    const filters = FILTER_DEFS[this._activeTab] || [];
    const activeFilterId = this._activeFilter[this._activeTab] || "all";
    const activeFilterDef = filters.find((f) => f.id === activeFilterId) || filters[0];
    const searchTerm = this._search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeFilterDef && !activeFilterDef.test(item)) return false;
      if (!searchTerm) return true;
      const haystack = `${item.title || ""} ${item.message || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  _listHtml(activeDef) {
    const items = this._visibleItems();
    return items.length
      ? items.map((item) => this._renderRow(this._activeTab, activeDef, item)).join("")
      : `<div class="empty">
           <ha-icon icon="mdi:check-circle-outline"></ha-icon>
           <span>Keine offenen Einträge</span>
         </div>`;
  }

  // Erneuert NUR die Liste (Suche/hass-Update während des Tippens) - das
  // Suchfeld bleibt dadurch unangetastet und behält Fokus und Tastatur.
  _updateList() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const listEl = this.shadowRoot.querySelector(".list");
    const activeDef = CATEGORY_DEFS.find((d) => d.key === this._activeTab);
    if (!listEl || !activeDef) {
      this._render();
      return;
    }
    listEl.innerHTML = this._listHtml(activeDef);
    this._attachRowListeners();
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
        this._updateList();
      });
    }

    const dismissAllBtn = root.querySelector(".dismiss-all");
    if (dismissAllBtn) {
      dismissAllBtn.addEventListener("click", () => this._handleDismissAll());
    }

    this._attachRowListeners();
    this._attachPopupListeners();
  }

  _attachRowListeners() {
    const root = this.shadowRoot;
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

  }

  _attachPopupListeners() {
    const root = this.shadowRoot;
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
 * Editor (seit 0.0.2 nach dem Vorbild von FRITZ!Box Anrufe): kein eigener
 * Shadow-DOM, sondern direkt im Light-DOM des Editor-Elements, mit nativen
 * <details>-Abschnitten - Darstellung / Kategorien / Farben / Widgets
 * (Widgets zuletzt). Die Farben-Sektion hat je Kategorie ein grafisches
 * <input type="color">-Swatch plus ein Textfeld für beliebige CSS-Werte und
 * zeigt den aktuell wirksamen Wert an. Die Konfiguration wird immer
 * unveränderlich (neues Objekt) aktualisiert und per config-changed-Event mit
 * bubbles+composed gemeldet.
 */
const COLOR_EDITOR_FIELDS = [
  { key: "color_notification", label: "Benachrichtigungen", fallbackHex: "#0288d1" },
  { key: "color_update", label: "Updates", fallbackHex: "#fb8c00" },
  { key: "color_repair", label: "Reparaturen", fallbackHex: "#e53935" },
];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

// <input type="color"> akzeptiert nur #rrggbb - 3-stellige Kurzform aufweiten.
function normalizeHex(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length === 3) return "#" + h.split("").map((c) => c + c).join("");
  return "#" + h;
}

const SAFE_COLOR_RE = /^[a-zA-Z0-9#(),.%\-\s]+$/;

const EDITOR_STYLES = `
  .nc-editor { display: flex; flex-direction: column; gap: 8px; }
  .nc-section {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    padding: 0 12px;
  }
  .nc-section summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    cursor: pointer;
    font-weight: 500;
    list-style: none;
  }
  .nc-section summary::-webkit-details-marker { display: none; }
  .nc-section summary ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color, #727272); }
  .nc-section summary .nc-chevron { margin-left: auto; transition: transform 0.2s; }
  .nc-section[open] summary .nc-chevron { transform: rotate(180deg); }
  .nc-body { padding: 4px 0 12px; display: flex; flex-direction: column; gap: 12px; }
  .nc-reset-row { display: flex; justify-content: flex-end; }
  .nc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    padding: 6px 10px;
    background: none;
    color: var(--primary-text-color, #212121);
    font: inherit;
    font-size: 0.85em;
    cursor: pointer;
  }
  .nc-btn:hover { background: var(--secondary-background-color, rgba(0, 0, 0, 0.04)); }
  .nc-btn.primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color, #03a9f4);
  }
  .nc-btn ha-icon { --mdc-icon-size: 16px; }
  .nc-color-row { display: flex; flex-direction: column; gap: 4px; }
  .nc-color-label { font-size: 0.9em; color: var(--primary-text-color, #212121); }
  .nc-color-controls { display: flex; align-items: center; gap: 8px; }
  .nc-color-controls input[type="color"] {
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    background: none;
  }
  .nc-color-controls input[type="text"] {
    flex: 1 1 auto;
    min-width: 0;
    padding: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    font: inherit;
    color: var(--primary-text-color, #212121);
    background: var(--card-background-color, #fff);
    box-sizing: border-box;
  }
  .nc-color-helper { font-size: 0.75em; color: var(--secondary-text-color, #727272); }
  .nc-hint { margin: 0; font-size: 0.85rem; color: var(--secondary-text-color, #727272); }
  .nc-widget-block { display: flex; flex-direction: column; gap: 6px; }
  .nc-widget-title { font-size: 0.9em; font-weight: 500; }
  .nc-snippet {
    margin: 0;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    font-family: var(--code-font-family, monospace);
    font-size: 0.82rem;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--primary-text-color, #212121);
    -webkit-user-select: all;
    user-select: all;
  }
  .nc-copy-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nc-copy-status { font-size: 0.8em; color: var(--secondary-text-color, #727272); }
  .nc-copy-status.ok { color: var(--success-color, #43a047); }
  .nc-copy-status.fail { color: var(--error-color, #e53935); }
`;

// Android-Template-Widgets verstehen kein CSS, nur einfaches HTML
// (<b>, <font color>, <small>, <br>) - deshalb hier feste Hex-Farben. Die
// Kategorie-Farben aus dem Abschnitt "Farben" werden übernommen, sofern sie
// als Hex vorliegen (sonst Standardfarbe der Karte).
const WIDGET_SENSORS = [
  {
    key: "notifications",
    label: "Benachrichtigungen",
    singular: "Benachrichtigung",
    plural: "Benachrichtigungen",
    none: "Keine Benachrichtigungen",
    colorKey: "color_notification",
    fallbackHex: "#0288d1",
  },
  {
    key: "updates",
    label: "Updates",
    singular: "Update",
    plural: "Updates",
    none: "Keine Updates",
    colorKey: "color_update",
    fallbackHex: "#fb8c00",
  },
  {
    key: "repairs",
    label: "Reparaturen",
    singular: "Reparatur",
    plural: "Reparaturen",
    none: "Keine Reparaturen",
    colorKey: "color_repair",
    fallbackHex: "#e53935",
  },
];
const WIDGET_OK_HEX = "#43a047";
const WIDGET_MUTED_HEX = "#9e9e9e";
// Trennlinie: Android-Widgets kennen kein <hr>, deshalb eine Reihe von
// "─"-Zeichen in Hellgrau. Die Länge steht als Variable `line` am Anfang des
// Quelltexts und lässt sich dort einfach kürzen/verlängern, falls das Widget
// schmaler oder breiter ist.
const WIDGET_LINE_HEX = "#bdbdbd";
const WIDGET_LINE_TEXT = "─".repeat(24);
const WIDGET_LINE_SET = `{%- set line = '${WIDGET_LINE_TEXT}' -%}`;
const WIDGET_LINE_HTML = `<small><font color="${WIDGET_LINE_HEX}">{{ line }}</font></small><br>`;

class NotificationCenterCardEditor extends HTMLElement {
  constructor() {
    super();
    this._built = false;
    this._forms = [];
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
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
    const details = document.createElement("details");
    details.className = "nc-section";
    if (expanded) details.open = true;
    const summary = document.createElement("summary");
    summary.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span>${title}</span><ha-icon class="nc-chevron" icon="mdi:chevron-down"></ha-icon>`;
    details.appendChild(summary);
    const body = document.createElement("div");
    body.className = "nc-body";
    details.appendChild(body);
    return { details, body };
  }

  _makeForm(schema) {
    const form = document.createElement("ha-form");
    form.schema = schema;
    form.computeLabel = (item) => this._labelFor(item.name);
    if (this._hass) form.hass = this._hass;
    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = this._unflatten(ev.detail.value, this._config);
      this._emit();
    });
    this._forms.push(form);
    return form;
  }

  _buildEditor() {
    const style = document.createElement("style");
    style.textContent = EDITOR_STYLES;
    this.appendChild(style);

    const list = document.createElement("div");
    list.className = "nc-editor";
    this.appendChild(list);
    this._forms = [];

    // --- Darstellung ---
    const display = this._section("Darstellung", "mdi:view-dashboard-outline", true);
    display.body.appendChild(
      this._makeForm([
        { name: "title", selector: { text: {} } },
        { name: "show_title", selector: { boolean: {} } },
        { name: "icon", selector: { icon: {} } },
        { name: "show_search", selector: { boolean: {} } },
      ])
    );
    list.appendChild(display.details);

    // --- Kategorien ---
    const categories = this._section("Kategorien", "mdi:eye-outline", false);
    categories.body.appendChild(
      this._makeForm([
        { name: "show_notifications", selector: { boolean: {} } },
        { name: "show_updates", selector: { boolean: {} } },
        { name: "show_repairs", selector: { boolean: {} } },
      ])
    );
    list.appendChild(categories.details);

    // --- Farben ---
    const colors = this._section("Farben", "mdi:palette-outline", false);
    this._buildColorSection(colors.body);
    list.appendChild(colors.details);

    // --- Widgets (bewusst als letzter Abschnitt) ---
    const widgets = this._section("Widgets", "mdi:widgets-outline", false);
    this._buildWidgetSection(widgets.body);
    list.appendChild(widgets.details);
  }

  _buildColorSection(body) {
    const resetRow = document.createElement("div");
    resetRow.className = "nc-reset-row";
    resetRow.innerHTML = `<button type="button" class="nc-btn"><ha-icon icon="mdi:restore"></ha-icon><span>Alle Farben zurücksetzen</span></button>`;
    resetRow.querySelector("button").addEventListener("click", () => this._resetAllColors());
    body.appendChild(resetRow);

    this._colorInputs = {};
    this._focusedColorKey = null;

    COLOR_EDITOR_FIELDS.forEach((field) => {
      const row = document.createElement("div");
      row.className = "nc-color-row";
      row.innerHTML = `
        <div class="nc-color-label">${escapeHtml(field.label)}</div>
        <div class="nc-color-controls">
          <input type="color" aria-label="${escapeHtml(field.label)} (grafische Auswahl)" />
          <input type="text" placeholder="${escapeHtml(field.fallbackHex)}" />
        </div>
        <div class="nc-color-helper"></div>`;
      const swatch = row.querySelector('input[type="color"]');
      const text = row.querySelector('input[type="text"]');
      stopKeyPropagation(text);

      // Swatch liefert immer ein gültiges #rrggbb.
      swatch.addEventListener("input", () => {
        text.value = swatch.value;
        this._onColorChange(field.key, swatch.value);
      });
      swatch.addEventListener("change", () => {
        text.value = swatch.value;
        this._onColorChange(field.key, swatch.value);
      });
      // Textfeld: erst bei "change" (Verlassen/Enter), nicht pro Tastendruck.
      text.addEventListener("change", () => this._onColorChange(field.key, text.value));
      text.addEventListener("focus", () => (this._focusedColorKey = field.key));
      text.addEventListener("blur", () => {
        if (this._focusedColorKey === field.key) this._focusedColorKey = null;
      });

      body.appendChild(row);
      this._colorInputs[field.key] = { row, swatch, text };
    });
  }

  _onColorChange(key, rawValue) {
    const value = String(rawValue || "").trim();
    if (value && !SAFE_COLOR_RE.test(value)) return;
    this._config = { ...this._config, [key]: value };
    this._updateColorSection();
    this._emit();
  }

  _resetAllColors() {
    const cleared = {};
    COLOR_EDITOR_FIELDS.forEach((field) => (cleared[field.key] = ""));
    this._config = { ...this._config, ...cleared };
    this._focusedColorKey = null;
    this._updateColorSection();
    this._emit();
  }

  _updateColorSection() {
    if (!this._colorInputs) return;
    COLOR_EDITOR_FIELDS.forEach((field) => {
      const inputs = this._colorInputs[field.key];
      if (!inputs) return;
      const raw = String(this._config[field.key] || "").trim();
      inputs.swatch.value = HEX_COLOR_RE.test(raw) ? normalizeHex(raw) : field.fallbackHex;
      if (this._focusedColorKey !== field.key) inputs.text.value = raw;
      inputs.row.querySelector(".nc-color-helper").textContent = raw
        ? `Aktuell verwendet: ${raw}`
        : `Aktuell verwendet (Standard): ${field.fallbackHex}`;
    });
    this._refreshWidgetSnippets();
  }

  _refreshWidgetSnippets() {
    if (!this._widgetBlocks) return;
    Object.entries(this._widgetBlocks).forEach(([key, block]) => {
      block.pre.textContent = this._widgetSnippetText(key) || "Bitte zuerst den Sensor zuweisen.";
    });
  }

  _buildWidgetSection(body) {
    body.appendChild(
      this._makeForm([
        { name: "entity_notifications", selector: { entity: { domain: "sensor" } } },
        { name: "entity_updates", selector: { entity: { domain: "sensor" } } },
        { name: "entity_repairs", selector: { entity: { domain: "sensor" } } },
      ])
    );

    const hint = document.createElement("p");
    hint.className = "nc-hint";
    hint.textContent =
      "Für ein Android-Template-Widget der Home-Assistant-App: pro Sensor einzeln oder alle drei zusammen kopieren. Farben folgen dem Abschnitt „Farben“ (nur Hex-Werte).";
    body.appendChild(hint);

    this._widgetBlocks = {};
    [...WIDGET_SENSORS, { key: "all", label: "Alle drei zusammen" }].forEach((def) => {
      const block = document.createElement("div");
      block.className = "nc-widget-block";
      block.innerHTML = `
        <div class="nc-widget-title">${escapeHtml(def.label)}</div>
        <pre class="nc-snippet"></pre>
        <div class="nc-copy-row">
          <button type="button" class="nc-btn primary"><ha-icon icon="mdi:content-copy"></ha-icon><span>Quelltext kopieren</span></button>
          <span class="nc-copy-status"></span>
        </div>`;
      const pre = block.querySelector("pre");
      const status = block.querySelector(".nc-copy-status");
      block.querySelector("button").addEventListener("click", async () => {
        const text = this._widgetSnippetText(def.key);
        if (!text) {
          this._setCopyStatus(status, "Bitte zuerst den Sensor zuweisen.", "fail");
          return;
        }
        const ok = await this._copyText(text);
        if (ok) {
          this._setCopyStatus(status, "In die Zwischenablage kopiert", "ok");
        } else {
          // Letzter Ausweg: Text markieren, damit der Nutzer ihn von Hand
          // (lange drücken -> Kopieren) übernehmen kann.
          this._selectNode(pre);
          this._setCopyStatus(status, "Automatisch nicht möglich - Text ist markiert, bitte manuell kopieren", "fail");
        }
      });
      body.appendChild(block);
      this._widgetBlocks[def.key] = { pre, status };
    });
  }

  _setCopyStatus(el, message, kind) {
    el.textContent = message;
    el.className = `nc-copy-status ${kind}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.textContent = "";
      el.className = "nc-copy-status";
    }, 4000);
  }

  _selectNode(node) {
    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {
      /* Markieren nicht möglich - ignorieren */
    }
  }

  // Kopiert Text in die Zwischenablage. Die moderne Clipboard-API gibt es nur
  // in sicheren Kontexten (HTTPS) - in der Companion-App über http:// fehlt
  // sie, dann greift der execCommand-Weg. Das Hilfs-Textfeld wird bewusst im
  // Editor selbst (innerhalb des Dialogs) eingehängt: Ein Feld in document.body
  // scheitert im modalen HA-Dialog am Fokus-Trap.
  async _copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        /* weiter mit Fallback */
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;";
    this.appendChild(textarea);
    let ok = false;
    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    this.removeChild(textarea);
    return ok;
  }

  _widgetColor(def) {
    const raw = String((this._config && this._config[def.colorKey]) || "").trim();
    return HEX_COLOR_RE.test(raw) ? normalizeHex(raw).toLowerCase() : def.fallbackHex;
  }

  // Erzeugt den Template-Quelltext für das Android-Widget im Stil einer
  // Mail-Übersicht: Kopfzeile "Kategorie (Anzahl)" in der Kategorie-Farbe,
  // darunter die ersten Einträge - Titel fett, Nachricht klein und grau -
  // sowie "+ n weitere". Bei 0 Einträgen ein grünes "✓ Alles erledigt".
  // Android-Template-Widgets verstehen nur einfaches HTML (<b>, <big>,
  // <small>, <font color>, <br>), keine Karten, Icons oder Buttons. Die
  // Ausgabe nutzt <br> statt Zeilenumbrüchen und {%- -%}, damit keine
  // Leerzeilen entstehen; Texte werden mit | e maskiert.
  _widgetBlock(def, entityId, maxItems, withHeaderSize) {
    const color = this._widgetColor(def);
    const head = withHeaderSize
      ? `<big><b><font color="${color}">${def.label}</font> ({{ n }})</b></big>`
      : `<b><font color="${color}">${def.label}</font> ({{ n }})</b>`;
    return [
      WIDGET_LINE_SET,
      `{%- set n = states('${entityId}') | int(0) -%}`,
      `{%- set items = state_attr('${entityId}', 'items') or [] -%}`,
      `${head}<br>`,
      `{%- if n == 0 -%}`,
      `<font color="${WIDGET_OK_HEX}">✓ Alles erledigt</font>`,
      `{%- else -%}`,
      `{%- for i in items[:${maxItems}] -%}`,
      `<b>{{ i.title | e }}</b><br>`,
      `{%- if i.message -%}<small><font color="${WIDGET_MUTED_HEX}">{{ i.message | truncate(70) | e }}</font></small><br>{%- endif -%}`,
      `{%- if not loop.last -%}${WIDGET_LINE_HTML}{%- endif -%}`,
      `{%- endfor -%}`,
      `{%- if n > ${maxItems} -%}${WIDGET_LINE_HTML}<small><font color="${WIDGET_MUTED_HEX}">+ {{ n - ${maxItems} }} weitere</font></small>{%- endif -%}`,
      `{%- endif -%}`,
    ].join("\n");
  }

  _widgetSnippetText(which) {
    const entities = (this._config && this._config.entities) || {};

    if (which === "all") {
      const defs = WIDGET_SENSORS.filter((d) => entities[d.key]);
      if (!defs.length) return "";
      // Alle Kategorien untereinander: je Kategorie eine Kopfzeile mit den
      // ersten zwei Einträgen. {% macro %} vermeidet dreifach kopierten Code.
      const macro = [
        WIDGET_LINE_SET,
        `{%- macro block(label, color, n, items) -%}`,
        `<b><font color="{{ color if n else '${WIDGET_MUTED_HEX}' }}">{{ label }}</font> ({{ n }})</b><br>`,
        `{%- for i in items[:2] -%}<small>{{ i.title | e }}</small><br>{%- endfor -%}`,
        `{%- endmacro -%}`,
      ].join("\n");
      const sets = defs
        .map(
          (d, i) =>
            `{%- set n${i} = states('${entities[d.key]}') | int(0) -%}\n` +
            `{%- set i${i} = state_attr('${entities[d.key]}', 'items') or [] -%}`
        )
        .join("\n");
      const total = defs.map((_, i) => `n${i}`).join(" + ");
      const calls = defs
        .map(
          (d, i) =>
            `{{ block('${d.label}', '${this._widgetColor(d)}', n${i}, i${i}) }}` +
            (i < defs.length - 1 ? WIDGET_LINE_HTML : "")
        )
        .join("\n");
      return [
        macro,
        sets,
        `{%- if ${total} == 0 -%}`,
        `<big><b><font color="${WIDGET_OK_HEX}">✓ Alles erledigt</font></b></big>`,
        `{%- else -%}`,
        calls,
        `{%- endif -%}`,
      ].join("\n");
    }

    const def = WIDGET_SENSORS.find((d) => d.key === which);
    const entityId = def && entities[def.key];
    if (!entityId) return "";
    return this._widgetBlock(def, entityId, 3, true);
  }

  _syncFromConfig() {
    const flat = this._flatten(this._config);
    this._forms.forEach((form) => (form.data = flat));
    this._updateColorSection();
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
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
      icon: typeof config.icon === "undefined" ? DEFAULT_ICON : config.icon,
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

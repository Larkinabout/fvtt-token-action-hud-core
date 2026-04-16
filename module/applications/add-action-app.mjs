import { MODULE, TEMPLATE } from "../core/constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Popover to add a single action.
 */
export class AddActionApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: [`${MODULE.ID}-app`, "tah-add-popover-app"],
    id: "token-action-hud-popover",
    window: { frame: false }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: { template: TEMPLATE.addPopover }
  };

  /* -------------------------------------------- */

  constructor({ available, onSelect, anchorRect }) {
    super();
    this.available = available;
    this.onSelect = onSelect;
    this.anchorRect = anchorRect;
  }

  /* -------------------------------------------- */

  async _prepareContext() {
    return { available: this.available };
  }

  /* -------------------------------------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;

    const width = 260;
    const maxHeight = 300;
    const viewportW = document.documentElement.clientWidth;
    const viewportH = document.documentElement.clientHeight;
    const gap = 4;
    let left = Math.round(this.anchorRect?.left ?? 0);
    let top = Math.round((this.anchorRect?.bottom ?? 0) + gap);
    left = Math.max(4, Math.min(left, viewportW - width - 4));
    top = Math.max(4, Math.min(top, viewportH - maxHeight - 4));
    Object.assign(root.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`
    });

    const input = root.querySelector(".tah-add-popover-search");
    const items = root.querySelectorAll(".tah-add-popover-item:not(.tah-add-popover-custom):not(.tah-add-popover-empty)");
    const customRow = root.querySelector(".tah-add-popover-custom");
    const emptyRow = root.querySelector(".tah-add-popover-empty");

    if (customRow) customRow.remove();
    if (emptyRow) emptyRow.style.display = "none";

    let focusIndex = 0;
    let hasNavigated = false;

    const isHidden = li => li.style.display === "none";

    const visibleItems = () =>
      Array.from(root.querySelectorAll(".tah-add-popover-item"))
        .filter(li => !isHidden(li) && !li.classList.contains("tah-add-popover-empty"));

    const clearHighlight = () => {
      root.querySelectorAll(".tah-add-popover-item.focused").forEach(el => el.classList.remove("focused"));
    };

    const highlight = () => {
      clearHighlight();
      if (!hasNavigated) return;
      const vis = visibleItems();
      if (vis[focusIndex]) {
        vis[focusIndex].classList.add("focused");
        vis[focusIndex].scrollIntoView({ block: "nearest" });
      }
    };

    const applyFilter = () => {
      const query = input.value.trim().toLowerCase();
      let visibleCount = 0;

      items.forEach(li => {
        const name = (li.dataset.listName || li.dataset.name || "").toLowerCase();
        const match = !query || name.includes(query);
        li.style.display = match ? "" : "none";
        if (match) visibleCount++;
      });

      emptyRow.style.display = visibleCount > 0 ? "none" : "";
      focusIndex = 0;
      highlight();
    };

    const pick = li => {
      if (!li || li.classList.contains("tah-add-popover-empty")) return;
      this.onSelect({
        id: li.dataset.id,
        name: li.dataset.name,
        listName: li.dataset.listName,
        type: li.dataset.type
      });
      this.close();
    };

    input.addEventListener("input", applyFilter);
    input.addEventListener("keydown", ev => {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        focusIndex = hasNavigated ? Math.min(focusIndex + 1, visibleItems().length - 1) : 0;
        hasNavigated = true;
        highlight();
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        focusIndex = hasNavigated ? Math.max(focusIndex - 1, 0) : 0;
        hasNavigated = true;
        highlight();
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        const target = hasNavigated ? visibleItems()[focusIndex] : visibleItems()[0];
        pick(target);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        this.close();
      }
    });

    root.querySelectorAll(".tah-add-popover-item").forEach(li => {
      li.addEventListener("click", () => pick(li));
    });

    this._outsideHandler = ev => {
      if (!root.contains(ev.target)) this.close();
    };
    document.addEventListener("pointerdown", this._outsideHandler, true);

    applyFilter();
    setTimeout(() => input.focus(), 0);
  }

  /* -------------------------------------------- */

  async close(options = {}) {
    if (this._outsideHandler) {
      document.removeEventListener("pointerdown", this._outsideHandler, true);
      this._outsideHandler = null;
    }
    this.element?.remove();
    foundry.applications.instances.delete(this.id);
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Open the popover.
   * @param {object} options
   * @param {object} options.groupHandler
   * @param {object} options.actionHandler
   * @param {string} options.parentNestId
   * @param {number} options.parentLevel
   * @param {HTMLElement} options.anchorElement
   */
  static async open({ groupHandler, actionHandler, parentNestId, parentLevel, anchorElement }) {
    const groupData = { nestId: parentNestId, level: parentLevel };
    const allTags = actionHandler.getAvailableActionsAsTags();
    const selected = actionHandler.getSelectedActionsAsTags(groupData) ?? [];
    const selectedIds = new Set(selected.map(t => t.id));
    // Show only actions not already in the group.
    const available = allTags.filter(t => !selectedIds.has(t.id));

    const onSelect = async chosen => {
      const newEntry = {
        id: chosen.id,
        listName: chosen.listName ?? chosen.name,
        name: chosen.name,
        type: chosen.type ?? "system"
      };
      const combined = [...selected, newEntry];
      await actionHandler.updateActions(combined, groupData);
      await groupHandler.saveGroups({ saveActor: true, saveUser: true });
      Hooks.callAll("forceUpdateTokenActionHud");
    };

    const rect = anchorElement.getBoundingClientRect();
    const app = new AddActionApp({ available, onSelect, anchorRect: rect });
    await app.render({ force: true });
  }
}

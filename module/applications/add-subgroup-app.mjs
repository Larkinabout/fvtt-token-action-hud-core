import { MODULE, TEMPLATE } from "../core/constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Popover to add a single subgroup.
 */
export class AddSubgroupApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: [`${MODULE.ID}-app`, "tah-add-popover-app"],
    id: "token-action-hud-popover",
    window: { frame: false }
  };

  static PARTS = {
    form: { template: TEMPLATE.addPopover }
  };

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
    const customName = root.querySelector(".tah-add-popover-custom-name");
    const emptyRow = root.querySelector(".tah-add-popover-empty");

    if (customRow) customRow.style.display = "none";
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
      let exactMatch = false;

      items.forEach(li => {
        const name = (li.dataset.listName || li.dataset.name || "").toLowerCase();
        const match = !query || name.includes(query);
        li.style.display = match ? "" : "none";
        if (match) visibleCount++;
        if (name === query) exactMatch = true;
      });

      if (query && !exactMatch) {
        customName.textContent = `"${input.value.trim()}"`;
        customRow.style.display = "";
        visibleCount++;
      } else {
        customRow.style.display = "none";
      }

      emptyRow.style.display = visibleCount > 0 ? "none" : "";
      focusIndex = 0;
      highlight();
    };

    const pick = li => {
      if (!li || li.classList.contains("tah-add-popover-empty")) return;
      if (li.dataset.custom === "true") {
        const name = input.value.trim();
        if (!name) return;
        this.onSelect({ id: null, name, listName: name, type: "custom" });
      } else {
        this.onSelect({
          id: li.dataset.id,
          name: li.dataset.name,
          listName: li.dataset.listName,
          type: li.dataset.type
        });
      }
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
   * @param {GroupHandler} options.groupHandler
   * @param {string} options.parentNestId
   * @param {number} options.parentLevel
   * @param {number} options.position
   * @param {HTMLElement} options.anchorElement
   */
  static async open({ groupHandler, parentNestId, parentLevel, position, anchorElement }) {
    const available = await groupHandler.getAvailableGroups({ nestId: parentNestId, level: parentLevel });

    const onSelect = async chosen => {
      const allChildren = Object.values(groupHandler.groups)
        .filter(g => g.nestId.startsWith(`${parentNestId}_`) && g.level === parentLevel + 1 && g.selected)
        .sort((a, b) => a.order - b.order);

      const lists = allChildren
        .filter(g => g.settings?.style !== "tab")
        .map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      const tabs = allChildren
        .filter(g => g.settings?.style === "tab")
        .map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));

      const newTag = {
        id: chosen.id ?? chosen.name.slugify({ replacement: "-", strict: true }) ?? "subgroup",
        listName: chosen.listName ?? chosen.name,
        name: chosen.name,
        type: chosen.type ?? "custom"
      };

      const used = new Set([...lists, ...tabs].map(g => g.id));
      if (used.has(newTag.id)) {
        const base = newTag.id;
        let suffix = 2;
        while (used.has(`${base}-${suffix}`)) suffix++;
        newTag.id = `${base}-${suffix}`;
      }

      const insertAt = Math.max(0, Math.min(position, lists.length));
      lists.splice(insertAt, 0, newTag);

      const parentGroupData = groupHandler.getGroup({ nestId: parentNestId });
      if (!parentGroupData) return;

      await groupHandler.updateGroups([...lists, ...tabs], parentGroupData);
      await groupHandler.saveGroups({ saveActor: true, saveUser: true });
      Hooks.callAll("forceUpdateTokenActionHud");
    };

    const rect = anchorElement.getBoundingClientRect();
    const app = new AddSubgroupApp({ available, onSelect, anchorRect: rect });
    await app.render({ force: true });
  }
}

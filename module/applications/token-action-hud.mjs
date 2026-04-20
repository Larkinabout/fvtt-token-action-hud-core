import { HudManager } from "../managers/hud-manager.mjs";
import { FormAppHelper } from "./form-app-helper.mjs";
import { AddSubgroupApp } from "./add-subgroup-app.mjs";
import { AddActionApp } from "./add-action-app.mjs";
import { GroupResizer } from "../handlers/group-resizer.mjs";
import { HUD, MODULE, SETTING, TEMPLATE } from "../core/constants.mjs";
import { Logger, Timer, Utils } from "../core/utils.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Token Action HUD application.
 */
export class TokenActionHud extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(systemManager, dataHandler, socket) {
    super();
    this.systemManager = systemManager;
    this.dataHandler = dataHandler;
    this.hudManager = new HudManager(this, systemManager, dataHandler, socket);
    this.socket = socket;
    this.openGroups = new Set();
    this.updatePendingTimer = new Timer(10);
    this.updateTimer = new Timer(10);
    this.closeTimer = null;
    this.renderTimer = null;
    this.setting = {};
  }

  /* -------------------------------------------- */

  /**
   * Merge Token Action Hud's default options with ApplicationV2.
   * @override
   */
  static DEFAULT_OPTIONS = {
    actions: {
      clickGroup: {
        buttons: [0, 2],
        handler: TokenActionHud.clickGroup
      },
      clickSubgroup: {
        buttons: [0, 2],
        handler: TokenActionHud.clickSubgroup
      },
      clickAction: {
        buttons: [0, 2],
        handler: TokenActionHud.clickAction
      },
      collapseHud: TokenActionHud.collapseHud,
      expandHud: TokenActionHud.expandHud,
      lockHud: TokenActionHud.lockHud,
      unlockHud: TokenActionHud.unlockHud,
      editHud: TokenActionHud.editHud,
      addGroup: TokenActionHud.addGroup,
      addSubgroup: TokenActionHud.addSubgroup,
      addAction: TokenActionHud.addAction
    },
    background: "none",
    classes: ["faded-ui"],
    id: "token-action-hud-app",
    position: {
      width: HUD.DEFAULT_WIDTH,
      height: HUD.DEFAULT_HEIGHT,
      left: HUD.DEFAULT_LEFT_POS,
      top: HUD.DEFAULT_TOP_POS,
      scale: HUD.DEFAULT_SCALE,
      zIndex: HUD.DEFAULT_ZINDEX
    },
    window: {
      frame: false,
      title: "token-action-hud"
    }
  };

  /* -------------------------------------------- */

  /**
   * Define template parts.
   */
  static PARTS = {
    form: {
      template: TEMPLATE.hud
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare context.
   * @override
   */
  async _prepareContext() {
    let styleKey = this.setting.style ?? Utils.getSetting("style") ?? "foundryVTT";
    let styleData = this.systemManager.styles[styleKey];
    if (!styleData) {
      styleKey = "foundryVTT";
      styleData = this.systemManager.styles.foundryVTT;
    }
    const styleClass = foundry.utils.isNewerVersion(game.version, "12.999") && ["dockedLeft", "dockedCenterRight", "dockedRight"].includes(styleKey)
      ? `${styleData.class}-v13`
      : styleData.class;
    const context = {
      hud: this.hudManager.hud,
      id: "token-action-hud",
      style: styleClass ?? "",
      scale: this.scale,
      background: "#00000000",
      collapseIcon: styleData.collapseIcon ?? "fa-caret-left",
      expandIcon: styleData.expandIcon ?? "fa-caret-right",
      collapsibleSubgroups: Utils.getSetting("collapsibleSubgroups")
    };

    Logger.debug("Application context", { context });
    return context;
  }

  /* -------------------------------------------- */
  /* SETTINGS                                     */
  /* -------------------------------------------- */

  /**
   * Initialise the HUD.
   * @public
   */
  async init() {
    this.#cacheSettings();
  }

  /* -------------------------------------------- */

  /**
   * Cache settings for slightly faster retrieval.
   */
  #cacheSettings() {
    Object.entries(SETTING).forEach(([key, value]) => {
      if (value.cache) {
        this.setting[key] = Utils.getSetting(key);
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Update cached settings following changes.
   * @param {string} key Setting key
   * @param {*|null} value Setting value
   * @public
   */
  async updateCachedSettings(key, value = null) {
    if (!this.updateSettingsPending) {
      this.updateSettingsPending = true;
      Logger.debug("Updating settings...");
    }

    if (!SETTING[key]) return;
    if (!SETTING[key].cache) return;

    this.setting[key] = value;

    switch (key) {
      case "customLayout":
      case "userCustomLayout":
        this.hudManager.layoutHandler.customLayout = null;
        break;
      case "rollHandler":
        this.hudManager.rollHandler = this.systemManager.getRollHandlerCore(this.hudManager.actionHandler);
        break;
      case "style":
        this.setPosition();
        break;
      case "drag":
        this.#updateDragButtonVisibility();
        break;
    }
  }

  /* -------------------------------------------- */
  /* RENDER                                       */
  /* -------------------------------------------- */

  /**
   * On render.
   * @param {options} context
   * @param {options} options
   */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.classList.remove("tah-closed");
    Utils.switchCSS(this.setting.style);
    clearTimeout(this.closeTimer);
    clearTimeout(this.renderTimer);
    this.#cacheElements();
    this.#setInitialHudState();
    this.#addHoverEvents(this.elements);

    if (!this._rootListenersAttached) {
      this.#attachRootListeners();
      this._rootListenersAttached = true;
    }
    this.#setupContextMenus();
    this.#updateDragButtonVisibility();
    this.#updateDraggableState();
  }

  /* -------------------------------------------- */

  /**
   * Show or hide the drag icon based on the Drag setting and lock state.
   * @private
   * @param {boolean} [isUnlockedOverride]
   */
  #updateDragButtonVisibility(isUnlockedOverride) {
    const button = this.elements?.dragButton;
    if (!button) return;
    const isUnlocked = isUnlockedOverride ?? this.isUnlocked;
    const drag = Utils.getSetting("drag");
    const isDraggable = (drag === "always") || (drag === "whenUnlocked" && isUnlocked);
    const show = !this.isDocked && isDraggable;
    button.classList.toggle("tah-hidden", !show);
  }

  /* -------------------------------------------- */

  /**
   * Cache HUD elements
   */
  #cacheElements() {
    this.elements = {
      characterName: this.element.querySelector("[data-part=\"characterName\"]"),
      actionArr: this.element.querySelectorAll("[data-part=\"action\"]"),
      buttons: this.element.querySelector("[data-part=\"buttons\"]"),
      tabSubgroupArr: this.element.querySelectorAll("[data-group-type=\"tab\"]"),
      groups: this.element.querySelector("[data-part=\"groups\"]"),
      editHudButton: this.element.querySelector("[data-part=\"editHudButton\"]"),
      listSubgroupsArr: this.element.querySelectorAll("[data-part=\"listSubgroups\"]"),
      subgroupsContainerArr: this.element.querySelectorAll("[data-part=\"subgroupsContainer\"]"),
      groupArr: this.element.querySelectorAll("[data-part=\"group\"]"),
      subgroupArr: this.element.querySelectorAll("[data-part=\"subgroup\"]"),
      listSubgroupTitleArr: this.element.querySelectorAll("[data-part=\"listSubgroupTitle\"]"),
      groupButtonArr: this.element.querySelectorAll("[data-part=\"groupButton\"]"),
      addGroupButtonArr: this.element.querySelectorAll("[data-part=\"addGroupButton\"]"),
      addSubgroupButtonArr: this.element.querySelectorAll("[data-part=\"addSubgroupButton\"]"),
      addActionButtonArr: this.element.querySelectorAll("[data-part=\"addActionButton\"]"),
      dragButton: this.element.querySelector("[data-part=\"dragHudButton\"]"),
      collapseExpandContainer: this.element.querySelector("[data-part=\"collapseExpandContainer\"]"),
      collapseHudButton: this.element.querySelector("[data-part=\"collapseHudButton\"]"),
      expandHudButton: this.element.querySelector("[data-part=\"expandHudButton\"]"),
      unlockButton: this.element.querySelector("[data-part=\"unlockHudButton\"]"),
      lockButton: this.element.querySelector("[data-part=\"lockHudButton\"]")
    };
  }

  /* -------------------------------------------- */

  /**
   * Set the initial state of the HUD (collapsed or expanded, locked or unlocked).
   * @private
   */
  #setInitialHudState() {
    if (this.isCollapsed) { TokenActionHud.collapseHud.call(this); }

    if (Utils.getSetting("enableCustomization")) {
      if (this.isUnlocked) {
        TokenActionHud.unlockHud.call(this);
      } else {
        TokenActionHud.lockHud.call(this);
      }
    } else {
      TokenActionHud.lockHud.call(this);
      this.elements.unlockButton.classList.add("tah-hidden");
    }
  }

  /* -------------------------------------------- */

  /**
   * Add hover events.
   * @param {object} elements HUD elements
   */
  #addHoverEvents(elements) {
    if (!Utils.getSetting("clickOpenCategory")) {
      // When a category button is hovered over...
      const hoverToggle = ev => {
        if (this.isUnlocked && ev.type !== "pointerenter") return;
        this.toggleGroup(ev);
      };
      elements.tabSubgroupArr.forEach(element => {
        element.addEventListener("touchstart", hoverToggle, { passive: true });
        element.addEventListener("pointerenter", hoverToggle);
        element.addEventListener("pointerleave", hoverToggle);
      });
    }

    // When the drag icon is clicked and held...
    if (!this.isDocked && elements.dragButton) {
      elements.dragButton.addEventListener("mousedown", this.#dragEvent.bind(this));
      elements.dragButton.addEventListener("touchstart", this.#dragEvent.bind(this), { passive: true });
    }

    // When an action is hovered...
    elements.actionArr.forEach(element => {
      element.addEventListener("pointerenter", this.handleActionHover.bind(this));
      element.addEventListener("pointerleave", this.handleActionHover.bind(this));
    });
  }

  /* -------------------------------------------- */

  /**
   * Attach root listeners.
   * @private
   */
  #attachRootListeners() {
    this.element.addEventListener("contextmenu", ev => {
      const actionButton = ev.target.closest("[data-part=\"actionButton\"]");
      if (actionButton) {
        const isEditing = this.isUnlocked && Utils.getSetting("enableCustomization");
        const actionOptsIn = actionButton.dataset.hasContextMenu === "true";
        if (isEditing || actionOptsIn) {
          this._actionContextMenu?._onActivate(ev);
        }
        return;
      }

      if (!this.isUnlocked) return;
      if (!Utils.getSetting("enableCustomization")) return;

      if (ev.target.closest("[data-part=\"groupButton\"], [data-part=\"listSubgroupTitle\"], [data-part=\"subgroup\"]")) {
        this._groupContextMenu?._onActivate(ev);
      }
    });

    this.element.addEventListener("dragstart", this.#onDragStart.bind(this));
    this.element.addEventListener("dragenter", this.#onDragEnter.bind(this));
    this.element.addEventListener("dragover", this.#onDragOver.bind(this));
    this.element.addEventListener("dragleave", this.#onDragLeave.bind(this));
    this.element.addEventListener("drop", this.#onDrop.bind(this));
    this.element.addEventListener("dragend", this.#onDragEnd.bind(this));
  }

  /* -------------------------------------------- */
  /* POST-RENDER                                  */
  /* -------------------------------------------- */

  /**
   * Functions to execute after the application is rendered.
   */
  postRender() {
    this.rendering = false;
    this.#applyDirection();
    this.#reopenGroups();
    if (!this.isCollapsed) {
      this.renderTimer = setTimeout(() => {
        requestAnimationFrame(() => {
          this.element?.classList?.add("tah-expanded");
        });
      }, 25);
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply classes for HUD direction.
   * @private
   */
  #applyDirection() {
    if (this.isDocked) return;

    const { characterName, subgroupsContainerArr } = this.elements;

    if (this.direction === "up") {
      characterName?.classList?.add("tah-hidden");

      subgroupsContainerArr.forEach(element => {
        element.classList.remove("expand-down");
        element.classList.add("expand-up");
      });
    } else {
      if (!this.isCollapsed) {
        characterName?.classList?.remove("tah-hidden");
      }

      subgroupsContainerArr.forEach(element => {
        element.classList.add("expand-down");
        element.classList.remove("expand-up");
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Reopen groups following a re-render of the HUD.
   * @private
   */
  #reopenGroups() {
    if (!this.openGroups.size) return;

    this.openGroups.forEach(groupId => {
      const group = this.element.querySelector(`#${groupId}`);
      if (group) {
        this.toggleGroup(null, group);
      }
    });
  }

  /* -------------------------------------------- */
  /* HUD ACTIONS                                  */
  /* -------------------------------------------- */

  /**
   * When the 'Edit HUD' button is clicked, open the Edit HUD app.
   */
  static editHud() {
    FormAppHelper.openEditHudApp(this.hudManager.groupHandler);
  }

  /* -------------------------------------------- */

  /**
   * When a "+" button between groups is clicked, open the Add Group app.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static addGroup(event, target) {
    const button = target ?? event.target.closest("[data-action=\"addGroup\"]");
    const position = parseInt(button?.dataset.position, 10);
    FormAppHelper.openAddGroupApp(this.hudManager.groupHandler, Number.isNaN(position) ? 0 : position);
  }

  /* -------------------------------------------- */

  /**
   * When a "+" button between subgroups is clicked, open the popover.
   * @param {Event} event
   * @param {HTMLElement} target
   */
  static addSubgroup(event, target) {
    const button = target ?? event.target.closest("[data-action=\"addSubgroup\"]");
    if (!button) return;
    const parentNestId = button.dataset.parentNestId;
    const parentLevel = parseInt(button.dataset.parentLevel, 10) || 1;
    const position = parseInt(button.dataset.position, 10);
    AddSubgroupApp.open({
      groupHandler: this.hudManager.groupHandler,
      parentNestId,
      parentLevel,
      position: Number.isNaN(position) ? 0 : position,
      anchorElement: button
    });
  }

  /* -------------------------------------------- */

  /**
   * When a "+" button at the end of a subgroup's action list is clicked,
   * open the popover.
   * @param {Event} event
   * @param {HTMLElement} target The clicked "+" button
   */
  static addAction(event, target) {
    const button = target ?? event.target.closest("[data-action=\"addAction\"]");
    if (!button) return;
    const parentNestId = button.dataset.parentNestId;
    const parentLevel = parseInt(button.dataset.parentLevel, 10) || 1;
    AddActionApp.open({
      groupHandler: this.hudManager.groupHandler,
      actionHandler: this.hudManager.actionHandler,
      parentNestId,
      parentLevel,
      anchorElement: button
    });
  }

  /* -------------------------------------------- */
  /* ENABLE/DISABLE HUD                           */
  /* -------------------------------------------- */

  /**
   * Toggle the HUD enabled state.
   */
  async toggleHudEnable() {
    const binding = Utils.humanizeBinding("enableDisableHud");
    const state = (this.isEnabled) ? "disabled" : "enabled";
    if (this.isEnabled) {
      this.#close();
    } else {
      Hooks.callAll("forceUpdateTokenActionHud");
    }
    await Utils.setSetting("enable", !this.isEnabled);
    Logger.info(game.i18n.format(`tokenActionHud.keybinding.toggleHud.${state}`, { binding }), true);
  }

  /* -------------------------------------------- */
  /* COLLAPSE/EXPAND HUD                          */
  /* -------------------------------------------- */

  /**
   * When the 'Collapse HUD' button is clicked, collapse the HUD.
   */
  static collapseHud() {
    this.toggleHudCollapse("collapse");
  }

  /* -------------------------------------------- */

  /**
   * When the 'Expand HUD' button is clicked, expand the HUD.
   */
  static expandHud() {
    this.toggleHudCollapse("expand");
  }

  /* -------------------------------------------- */

  /**
   * Toggle the HUD between collapse and expand states.
   * @param {string} state "collapse" or "expand"
   */
  toggleHudCollapse(state) {
    state = state ?? ((this.isCollapsed) ? "expand" : "collapse");
    const isCollapsing = state === "collapse";
    const { characterName, collapseHudButton, expandHudButton, groups, buttons } = this.elements;

    collapseHudButton.classList.toggle("tah-hidden", isCollapsing);
    expandHudButton.classList.toggle("tah-hidden", !isCollapsing);

    if (this.isDocked) {
      this.element.classList.toggle("tah-expanded", !isCollapsing);
    } else {
      if (this.direction === "down") { characterName.classList.toggle("tah-hidden", isCollapsing); }
      groups.classList.toggle("tah-hidden", isCollapsing);
      buttons.classList.toggle("tah-hidden", isCollapsing);
    }

    this.isCollapsed = isCollapsing;
  }

  /* -------------------------------------------- */
  /* LOCK/UNLOCK HUD                              */
  /* -------------------------------------------- */

  /**
   * When the 'Unlock HUD' button is clicked, unlock the HUD.
   * @param {Event|null} event
   */
  static async unlockHud(event = null) {
    this.toggleHudLock("unlock", event);
  }

  /* -------------------------------------------- */

  /**
   * When the 'Lock HUD' button is clicked, lock the HUD.
   * @param {Event|null} event
   */
  static async lockHud(event = null) {
    this.toggleHudLock("lock", event);
  }

  /* -------------------------------------------- */

  /**
   * Toggle HUD lock state.
   * @param {string} state "lock" or "unlock"
   * @param {Event|null} event
   */
  toggleHudLock(state, event = null) {
    if (event) event.preventDefault();

    const isUnlocking = state === "unlock";
    const { unlockButton, lockButton, editHudButton, subgroupArr, groupButtonArr,
      addGroupButtonArr, addSubgroupButtonArr, addActionButtonArr, groups, listSubgroupsArr,
      tabSubgroupArr, listSubgroupTitleArr } = this.elements;

    // Toggle button visibiltiy
    unlockButton.classList.toggle("tah-hidden", isUnlocking);
    lockButton.classList.toggle("tah-hidden", !isUnlocking);
    editHudButton.classList.toggle("tah-hidden", !isUnlocking);

    // Toggle class for styling when unlocked/locked
    groups.classList.toggle("tah-unlocked", isUnlocking);

    // Helper function to toggle classes
    const toggleElements = (elements, className, toggle) => {
      elements.forEach(element => element.classList.toggle(className, toggle));
    };

    // Show "+" buttons only when unlocked and customization is enabled
    const showAddGroup = isUnlocking && Utils.getSetting("enableCustomization");
    toggleElements(addGroupButtonArr, "tah-hidden", !showAddGroup);
    toggleElements(addSubgroupButtonArr, "tah-hidden", !showAddGroup);
    toggleElements(addActionButtonArr, "tah-hidden", !showAddGroup);

    toggleElements(groupButtonArr, "disable-edit", !isUnlocking);
    toggleElements(listSubgroupTitleArr, "disable-edit", !isUnlocking);

    if (isUnlocking) {
      // When the HUD is unlocked, unhide elements
      toggleElements(subgroupArr, "tah-hidden", !isUnlocking);
      toggleElements(listSubgroupsArr, "tah-hidden", !isUnlocking);
      toggleElements(tabSubgroupArr, "tah-hidden", !isUnlocking);
      toggleElements(listSubgroupTitleArr, "tah-hidden", !isUnlocking);
    } else {
      // When the HUD is locked, hide elements that have no underlying actions
      const hideIfEmpty = elements => {
        elements.forEach(element => {
          const hasActions = element.querySelectorAll(".tah-action").length > 0;
          if (!hasActions) element.classList.add("tah-hidden");
        });
      };

      hideIfEmpty(tabSubgroupArr);
      hideIfEmpty(subgroupArr);
      hideIfEmpty(listSubgroupsArr);

      listSubgroupTitleArr.forEach(element => {
        const groupElement = element.closest(".tah-subgroup");
        if (groupElement.dataset?.showTitle === "false") {
          element.classList.add("tah-hidden");
        }
      });
    }

    this.isUnlocked = isUnlocking;
    this.#updateDragButtonVisibility(isUnlocking);
    this.#updateDraggableState(isUnlocking);
    this.#updateTooltipsState(isUnlocking);

    Hooks.callAll("tokenActionHudCoreLockChanged", isUnlocking, this.hudManager);
  }

  /* -------------------------------------------- */

  /**
   * Disable tooltips while the HUD is unlocked.
   * @private
   * @param {boolean} [isUnlockedOverride]
   */
  #updateTooltipsState(isUnlockedOverride) {
    const isUnlocked = isUnlockedOverride ?? this.isUnlocked;
    const keepSelector = "[data-part=\"addGroupButton\"], [data-part=\"addSubgroupButton\"], [data-part=\"addActionButton\"]";
    if (isUnlocked) {
      this.element.querySelectorAll("[data-tooltip]").forEach(el => {
        if (el.matches(keepSelector)) return;
        el.setAttribute("data-tooltip-disabled", el.getAttribute("data-tooltip"));
        el.removeAttribute("data-tooltip");
      });
    } else {
      this.element.querySelectorAll("[data-tooltip-disabled]").forEach(el => {
        el.setAttribute("data-tooltip", el.getAttribute("data-tooltip-disabled"));
        el.removeAttribute("data-tooltip-disabled");
      });
    }
  }

  /* -------------------------------------------- */
  /* GROUP EVENTS                                 */
  /* -------------------------------------------- */

  /**
   * When a group is clicked.
   * @param {Event} event
   */
  static clickGroup(event) {
    this.bringToFront();

    // Remove focus to allow core ESC interactions
    event.currentTarget.blur();

    if (event.button === 2) {
      if (!this.isUnlocked) this.handleGroupClick(event);
      return;
    }

    if (Utils.getSetting("clickOpenCategory")) {
      this.toggleGroup(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * When a subgroup is clicked.
   * @param {Event} event
   */
  static clickSubgroup(event) {
    if (event.button === 2) {
      if (!this.isUnlocked) this.handleGroupClick(event);
      return;
    }

    if (this.isUnlocked) return;

    const group = Utils.getClosestGroupElement(event);
    if (group.dataset?.groupType === "tab") {
      this.toggleGroup(event, group);
    } else {
      this.collapseExpandSubgroup(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * Toggle the visibility of the group.
   * @param {Event} event
   * @param {object} group
   */
  toggleGroup(event = null, group = null) {
    group = group || Utils.getClosestGroupElement(event);
    const isOpen = group.classList.contains("hover");
    const shouldOpen = !isOpen;
    if ((isOpen && event?.type === "pointerenter") || (!isOpen && event?.type === "pointerleave")) return;
    group.classList.toggle("hover", shouldOpen);
    if (shouldOpen) {
      this.#toggleOtherGroups(group);
      const groupResizer = new GroupResizer(this, this.hudManager);
      groupResizer.resizeGroup(group);

      this.openGroups.add(group.id);
    } else {
      this.openGroups.delete(group.id);
    }
    // Remove focus to allow core ESC interactions
    if (event) event.currentTarget.blur();
  }

  /* -------------------------------------------- */

  /**
   * Toggle visibility of other groups.
   * @private
   * @param {string} groupToIgnore
   */
  #toggleOtherGroups(groupToIgnore) {
    if (!this.openGroups.size) return;

    this.openGroups.forEach(groupId => {
      if (groupId === groupToIgnore.id) return;
      const group = this.element.querySelector(`#${groupId}`);
      // If group no longer exists on the HUD, delete it
      if (!group) {
        this.openGroups.delete(groupId);
        return;
      }
      const isParentToIgnore = group.querySelector(`#${groupToIgnore.id}`);
      if (!isParentToIgnore) this.toggleGroup(null, group);
    });
  }

  /* -------------------------------------------- */

  /**
   * Collapse/expand a subgroup.
   * @param {Event} event
   */
  collapseExpandSubgroup(event) {
    if (!Utils.getSetting("collapsibleSubgroups")) return;

    const target = event.target.closest('[data-part="listSubgroupTitle"]');

    const groupElement = Utils.getClosestGroupElement(event);
    const nestId = groupElement?.dataset?.nestId;
    const resizeTarget = target.closest(".tah-tab-subgroup.hover") || target.closest("[data-part=\"group\"]");
    const groupsElement = groupElement?.querySelector("[data-part=\"subgroups\"]");
    const collapseIcon = target.querySelector(".tah-collapse-icon");
    const expandIcon = target.querySelector(".tah-expand-icon");
    const imageElement = groupElement.querySelector(".tah-list-image");

    const toggleGroupVisibility = () => {
      groupsElement?.classList.toggle("tah-hidden");
      collapseIcon?.classList.toggle("tah-hidden");
      expandIcon?.classList.toggle("tah-hidden");
      imageElement?.classList.toggle("tah-hidden");
    };

    const saveGroupSettings = collapse => {
      if (Utils.getSetting("enableCustomization")) {
        this.hudManager.groupHandler.saveGroupSettings({ nestId, settings: { collapse } });
      }
    };

    if (groupsElement?.classList.contains("tah-hidden")) {
      toggleGroupVisibility();
      saveGroupSettings(false);
      const groupResizer = new GroupResizer(this, this.hudManager);
      groupResizer.resizeGroup(resizeTarget);
    } else {
      toggleGroupVisibility();
      saveGroupSettings(true);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle when a group is clicked.
   * @param {Event} event
   */
  handleGroupClick(event) {
    this.hudManager.handleHudEvent("groupClick", event);
  }

  /* -------------------------------------------- */

  /**
   * Open the 'Edit Group' or 'Edit Subgroup' app.
   * @param {HTMLElement} triggerElement
   */
  openEditGroupApp(triggerElement) {
    const group = triggerElement?.closest("[data-part=\"subgroup\"]")
      || triggerElement?.closest("[data-part=\"group\"]");
    if (!group) return;
    const { nestId, level, type } = group.dataset;
    if (!nestId) return;
    const name = this.hudManager.groupHandler.groups[nestId]?.name;
    const parsedLevel = parseInt(level, 10) || null;

    if (parsedLevel === 1) {
      FormAppHelper.openEditGroupApp(
        this.hudManager.groupHandler,
        { nestId, name, level: parsedLevel, type }
      );
    } else {
      FormAppHelper.openEditSubgroupApp(
        this.hudManager.groupHandler,
        this.hudManager.actionHandler,
        { nestId, name, level: parsedLevel, type }
      );
    }
  }

  /* -------------------------------------------- */
  /* CONTEXT MENU                                 */
  /* -------------------------------------------- */

  /**
   * Build the context menu items for groups and subgroups.
   * @private
   * @returns {Array} List of context menu items
   */
  #buildGroupContextMenuItems() {
    return [
      {
        label: "tokenActionHud.contextMenu.collapse",
        icon: "<i class=\"fa-solid fa-angle-up\"></i>",
        visible: target => this.#isContextSubgroupExpanded(target) === true,
        onClick: (event, target) => this.#toggleContextSubgroup(target)
      },
      {
        label: "tokenActionHud.contextMenu.expand",
        icon: "<i class=\"fa-solid fa-angle-down\"></i>",
        visible: target => this.#isContextSubgroupExpanded(target) === false,
        onClick: (event, target) => this.#toggleContextSubgroup(target)
      },
      {
        label: "tokenActionHud.contextMenu.edit",
        icon: "<i class=\"fa-solid fa-pen-to-square\"></i>",
        onClick: (event, target) => this.openEditGroupApp(target)
      },
      {
        label: "tokenActionHud.contextMenu.delete",
        icon: "<i class=\"fa-solid fa-trash\"></i>",
        classes: "tah-context-delete",
        onClick: (event, target) => this.#confirmDeleteGroup(target)
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Find the subgroup wrapper element nearest to a context-menu target.
   * @private
   * @param {HTMLElement} target
   * @returns {HTMLElement|null} Closest subgroup
   */
  #getContextSubgroupElement(target) {
    return target?.closest?.("[data-part=\"subgroup\"]") ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Whether the subgroup is currently expanded.
   * @private
   * @param {HTMLElement} target
   * @returns {boolean|null}
   */
  #isContextSubgroupExpanded(target) {
    const sg = this.#getContextSubgroupElement(target);
    if (!sg) return null;
    if (sg.dataset.groupType === "tab") {
      return sg.classList.contains("hover");
    }

    const inner = sg.querySelector(":scope > .tah-list-subgroup > [data-part=\"subgroups\"]");
    if (!inner) return null;
    return !inner.classList.contains("tah-hidden");
  }

  /* -------------------------------------------- */

  /**
   * Toggle the expand/collapse state of the subgroup.
   * @private
   * @param {HTMLElement} target
   */
  #toggleContextSubgroup(target) {
    const sg = this.#getContextSubgroupElement(target);
    if (!sg) return;
    if (sg.dataset.groupType === "tab") {
      this.toggleGroup(null, sg);
      return;
    }
    const title = sg.querySelector(":scope > .tah-list-subgroup > [data-part=\"listSubgroupTitle\"]");
    if (title) this.collapseExpandSubgroup({ target: title });
  }

  /* -------------------------------------------- */

  #buildActionContextMenuItems() {
    return [
      {
        label: "tokenActionHud.contextMenu.delete",
        icon: "<i class=\"fa-solid fa-trash\"></i>",
        classes: "tah-context-delete",
        visible: () => this.isUnlocked,
        onClick: (event, target) => this.#confirmDeleteAction(target)
      }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Setup context menus.
   * @private
   */
  #setupContextMenus() {
    const ContextMenu = foundry.applications.ux.ContextMenu.implementation;
    const sharedOptions = { fixed: true, eventName: "tah-never", jQuery: false };

    const groupItems = this.#buildGroupContextMenuItems();
    Hooks.callAll("tokenActionHudCoreGroupContextMenu", groupItems, this.hudManager);

    const actionItems = this.#buildActionContextMenuItems();
    Hooks.callAll("tokenActionHudCoreActionContextMenu", actionItems, this.hudManager);

    this._groupContextMenu = new ContextMenu(
      this.element,
      "[data-part=\"groupButton\"], [data-part=\"listSubgroupTitle\"], [data-part=\"subgroup\"]",
      this.#prepareContextMenuItems(groupItems),
      sharedOptions
    );

    this._actionContextMenu = new ContextMenu(
      this.element,
      "[data-part=\"actionButton\"]",
      this.#prepareContextMenuItems(actionItems),
      sharedOptions
    );
  }

  /* -------------------------------------------- */

  /**
   * Prepare context menu items.
   * @private
   * @param {Array} items
   * @returns {Array} Context menu items
   */
  #prepareContextMenuItems(items) {
    if (foundry.utils.isNewerVersion(game.version, "13.999")) return items;

    // V13 ContextMenu uses `name`, `callback`, `condition`
    return items.map(item => {
      const out = { ...item };
      if (item.label && !item.name) out.name = item.label;
      if (item.onClick && !item.callback) {
        out.callback = (target, event) => item.onClick(event, target);
      }
      if (item.visible !== undefined && item.condition === undefined) {
        out.condition = typeof item.visible === "function"
          ? target => item.visible(target)
          : item.visible;
      }
      return out;
    });
  }

  /* -------------------------------------------- */

  /**
   * Confirm and delete a group or subgroup.
   * @private
   * @param {HTMLElement} triggerElement
   */
  async #confirmDeleteGroup(triggerElement) {
    const groupEl = triggerElement?.closest("[data-part=\"subgroup\"]")
      || triggerElement?.closest("[data-part=\"group\"]");
    if (!groupEl) return;
    const nestId = groupEl.dataset.nestId;
    const parsedLevel = parseInt(groupEl.dataset.level, 10) || 1;
    const name = this.hudManager.groupHandler.groups[nestId]?.name ?? "";
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("tokenActionHud.delete.confirm.title") },
      content: `<p>${game.i18n.format("tokenActionHud.delete.confirm.content", { name })}</p>`,
      modal: true
    });
    if (!confirmed) return;
    await FormAppHelper.deleteGroup(this.hudManager.groupHandler, { nestId, level: parsedLevel });
  }

  /* -------------------------------------------- */

  /**
   * Confirm and delete an action.
   * @private
   * @param {HTMLElement} triggerElement
   */
  async #confirmDeleteAction(triggerElement) {
    const button = triggerElement?.closest("[data-part=\"actionButton\"]");
    const subgroupEl = triggerElement?.closest("[data-part=\"subgroup\"]");
    if (!button || !subgroupEl) return;
    const actionId = button.dataset.actionId;
    const nestId = subgroupEl.dataset.nestId;
    const name = button.querySelector(".tah-button-text")?.textContent?.trim() ?? "";
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("tokenActionHud.delete.confirm.title") },
      content: `<p>${game.i18n.format("tokenActionHud.delete.confirm.content", { name })}</p>`,
      modal: true
    });
    if (!confirmed) return;
    await FormAppHelper.deleteAction(
      this.hudManager.groupHandler,
      this.hudManager.actionHandler,
      { nestId, actionId }
    );
  }

  /* -------------------------------------------- */
  /* DRAG-AND-DROP REORDER                        */
  /* -------------------------------------------- */

  /**
   * Set the draggable attribute on group/subgroup wrappers based on
   * whether the HUD is unlocked and customization is enabled.
   * @private
   * @param {boolean} [isUnlockedOverride] Use this value instead of the async-backed getter.
   */
  #updateDraggableState(isUnlockedOverride) {
    const isUnlocked = isUnlockedOverride ?? this.isUnlocked;
    const canDrag = isUnlocked && Utils.getSetting("enableCustomization");
    const apply = el => {
      if (canDrag) el.setAttribute("draggable", "true");
      else el.removeAttribute("draggable");
    };
    this.elements?.groupArr?.forEach(apply);
    this.elements?.subgroupArr?.forEach(apply);
    this.elements?.actionArr?.forEach(apply);
  }

  /* -------------------------------------------- */

  /**
   * Resolve the nearest draggable group/subgroup element from an event.
   * @private
   * @param {Event} ev
   * @returns {HTMLElement|null}
   */
  #resolveDraggable(ev) {
    const node = ev.target.closest?.("[data-part=\"action\"], [data-part=\"subgroup\"], [data-part=\"group\"]");
    if (!node) return null;
    if (!node.hasAttribute("draggable")) return null;
    return node;
  }

  /* -------------------------------------------- */

  /**
   * Get an action's siblings.
   * @private
   * @param {HTMLElement} source
   * @returns {HTMLElement[]}
   */
  #getActionSiblings(source) {
    const parent = source?.parentElement;
    if (!parent) return [];
    return Array.from(parent.children)
      .filter(el => el.dataset?.part === "action" && el !== source);
  }

  /* -------------------------------------------- */

  /**
   * Find the sibling action nearest to the cursor.
   * @private
   * @param {HTMLElement} source
   * @param {number} clientX
   * @param {number} clientY
   * @returns {HTMLElement|null}
   */
  #findNearestActionSibling(source, clientX, clientY) {
    const siblings = this.#getActionSiblings(source);
    let nearest = null;
    let minDist = Infinity;
    for (const sibling of siblings) {
      const rect = sibling.getBoundingClientRect();
      const cx = rect.left + (rect.width / 2);
      const cy = rect.top + (rect.height / 2);
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (d < minDist) { minDist = d; nearest = sibling; }
    }
    return nearest;
  }

  /* -------------------------------------------- */

  /**
   * Get "+" drop targets for source.
   * @private
   * @param {HTMLElement} source
   * @returns {HTMLElement[]} List of drop targets
   */
  #getDropTargetsForSource(source) {
    if (!source) return [];
    if (source.dataset.part === "group") {
      return Array.from(this.element.querySelectorAll("[data-part=\"addGroupButton\"]"));
    }

    const sourceLevel = parseInt(source.dataset.level, 10);
    const parentLevel = sourceLevel - 1;
    const parentNestId = (source.dataset.nestId || "").split("_").slice(0, -1).join("_");
    const all = this.element.querySelectorAll("[data-part=\"addSubgroupButton\"]");
    return Array.from(all).filter(btn =>
      btn.dataset.parentNestId === parentNestId
      && btn.dataset.parentLevel === String(parentLevel)
    );
  }

  /* -------------------------------------------- */

  /**
   * Find the "+" drop target nearest to the cursor.
   * @private
   * @param {HTMLElement} source
   * @param {number} clientX
   * @param {number} clientY
   * @returns {HTMLElement|null} Nearest drop target
   */
  #findNearestDropTarget(source, clientX, clientY) {
    const targets = this.#getDropTargetsForSource(source);
    let nearest = null;
    let minDist = Infinity;
    for (const btn of targets) {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + (rect.width / 2);
      const cy = rect.top + (rect.height / 2);
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (d < minDist) { minDist = d; nearest = btn; }
    }
    return nearest;
  }

  /* -------------------------------------------- */

  #onDragStart(ev) {
    const source = this.#resolveDraggable(ev);
    if (!source) return;
    ev.stopPropagation();
    if (source.dataset.part === "action") {
      const parentSubgroup = source.closest("[data-part=\"subgroup\"]");
      const actionButton = source.querySelector("[data-part=\"actionButton\"]");
      this._dragState = {
        part: "action",
        actionId: actionButton?.dataset.actionId,
        parentNestId: parentSubgroup?.dataset.nestId
      };
    } else {
      this._dragState = {
        part: source.dataset.part, // "group" | "subgroup"
        nestId: source.dataset.nestId,
        level: parseInt(source.dataset.level, 10) || 1
      };
    }
    source.classList.add("tah-dragging");
    this.elements.groups?.classList.add("tah-drag-active");
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = "move";
      try { ev.dataTransfer.setData("text/plain", source.dataset.nestId); } catch{ }
      const transparentImage = document.createElement("img");
      transparentImage.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      ev.dataTransfer.setDragImage(transparentImage, 0, 0);
    }
  }

  /* -------------------------------------------- */

  #onDragEnter(ev) {
    if (!this._dragState) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
  }

  /* -------------------------------------------- */

  #onDragOver(ev) {
    if (!this._dragState) return;

    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    if (this._dragState.part === "action") {
      this.#onDragOverAction(ev);
      return;
    }
    const source = this.element.querySelector(`[data-nest-id="${CSS.escape(this._dragState.nestId)}"]`);
    if (!source) return;
    const plus = this.#findNearestDropTarget(source, ev.clientX, ev.clientY);
    if (!plus) return;
    this.#clearDropIndicators();
    plus.classList.add("tah-drop-indicator");
  }

  /* -------------------------------------------- */

  #onDragOverAction(ev) {
    const source = this.#findActionSourceElement();
    if (!source) return;
    const target = this.#findNearestActionSibling(source, ev.clientX, ev.clientY);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const before = this.isDocked
      ? ev.clientY < rect.top + (rect.height / 2)
      : ev.clientX < rect.left + (rect.width / 2);
    this.#clearDropIndicators();
    target.classList.add(before ? "tah-drop-action-before" : "tah-drop-action-after");
  }

  /* -------------------------------------------- */

  /**
   * Find action source element.
   * @private
   * @returns {HTMLElement|null}
   */
  #findActionSourceElement() {
    const { actionId, parentNestId } = this._dragState ?? {};
    if (!actionId || !parentNestId) return null;
    const parent = this.element.querySelector(
      `[data-part="subgroup"][data-nest-id="${CSS.escape(parentNestId)}"]`
    );
    if (!parent) return null;
    const button = parent.querySelector(`[data-action-id="${CSS.escape(actionId)}"]`);
    return button?.closest("[data-part=\"action\"]") ?? null;
  }

  /* -------------------------------------------- */

  #onDragLeave(ev) {
    if (!ev.relatedTarget || !this.element.contains(ev.relatedTarget)) {
      this.#clearDropIndicators();
    }
  }

  /* -------------------------------------------- */

  async #onDrop(ev) {
    if (!this._dragState) return;
    if (this._dragState.part === "action") {
      await this.#onDropAction(ev);
      return;
    }
    const source = this.element.querySelector(`[data-nest-id="${CSS.escape(this._dragState.nestId)}"]`);
    if (!source) return;
    const plus = this.#findNearestDropTarget(source, ev.clientX, ev.clientY);
    if (!plus) return;
    ev.preventDefault();
    ev.stopPropagation();

    const position = parseInt(plus.dataset.position, 10) || 0;
    this.#clearDropIndicators();

    await this.#reorderGroupToPosition({
      level: this._dragState.level,
      sourceNestId: this._dragState.nestId,
      position
    });
  }

  /* -------------------------------------------- */

  async #onDropAction(ev) {
    const source = this.#findActionSourceElement();
    if (!source) return;
    const target = this.#findNearestActionSibling(source, ev.clientX, ev.clientY);
    if (!target) return;
    ev.preventDefault();
    ev.stopPropagation();
    const dropBefore = target.classList.contains("tah-drop-action-before");
    this.#clearDropIndicators();
    const targetButton = target.querySelector("[data-part=\"actionButton\"]");
    const targetActionId = targetButton?.dataset.actionId;
    if (!targetActionId) return;
    await this.#reorderActionToPosition({
      parentNestId: this._dragState.parentNestId,
      sourceActionId: this._dragState.actionId,
      targetActionId,
      dropBefore
    });
  }

  /* -------------------------------------------- */

  /**
   * Reorder action to its new position.
   * @private
   * @param {object} options
   * @param {string} options.parentNestId
   * @param {string} options.sourceActionId
   * @param {string} options.targetActionId
   * @param {boolean} options.dropBefore
   */
  async #reorderActionToPosition({ parentNestId, sourceActionId, targetActionId, dropBefore }) {
    const groupHandler = this.hudManager.groupHandler;
    const actionHandler = this.hudManager.actionHandler;
    const group = groupHandler.getGroup({ nestId: parentNestId });
    if (!group) return;
    const actions = group.actions.filter(a => a.selected).slice();
    const sIdx = actions.findIndex(a => a.id === sourceActionId);
    if (sIdx < 0) return;
    const [moved] = actions.splice(sIdx, 1);
    let tIdx = actions.findIndex(a => a.id === targetActionId);
    if (tIdx < 0) return;
    if (!dropBefore) tIdx += 1;
    actions.splice(tIdx, 0, moved);
    const payload = actions.map(a => ({ id: a.id, listName: a.listName, name: a.name, type: a.type }));
    actionHandler.updateActions(payload, { nestId: parentNestId });
    await groupHandler.saveGroups({ saveActor: true, saveUser: true });
    Hooks.callAll("forceUpdateTokenActionHud");
  }

  /* -------------------------------------------- */

  #onDragEnd() {
    this.#clearDropIndicators();
    this.elements.groups?.classList.remove("tah-drag-active");
    this.element.querySelectorAll(".tah-dragging").forEach(el => el.classList.remove("tah-dragging"));
    this._dragState = null;
  }

  /* -------------------------------------------- */

  #clearDropIndicators() {
    this.element.querySelectorAll(".tah-drop-indicator, .tah-drop-action-before, .tah-drop-action-after")
      .forEach(el => el.classList.remove("tah-drop-indicator", "tah-drop-action-before", "tah-drop-action-after"));
  }

  /* -------------------------------------------- */

  /**
   * Reorder group to its new position.
   * @private
   * @param {object} options
   * @param {number} options.level
   * @param {string} options.sourceNestId
   * @param {number} options.position
   */
  async #reorderGroupToPosition({ level, sourceNestId, position }) {
    const groupHandler = this.hudManager.groupHandler;

    if (level === 1) {
      const siblings = Object.values(groupHandler.groups)
        .filter(g => g.level === 1 && g.selected)
        .sort((a, b) => a.order - b.order);
      const sIdx = siblings.findIndex(g => g.nestId === sourceNestId);
      if (sIdx < 0) return;
      const [moved] = siblings.splice(sIdx, 1);

      const target = sIdx < position ? position - 1 : position;
      const clamped = Math.max(0, Math.min(target, siblings.length));
      if (clamped === sIdx) return;
      siblings.splice(clamped, 0, moved);
      const payload = siblings.map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      await groupHandler.updateGroups(payload, { level: 0 });
    } else {
      const parentNestId = sourceNestId.split("_").slice(0, -1).join("_");
      const parentGroupData = groupHandler.getGroup({ nestId: parentNestId });
      if (!parentGroupData) return;
      const allChildren = Object.values(groupHandler.groups)
        .filter(g => g.nestId.startsWith(`${parentNestId}_`) && g.level === level && g.selected)
        .sort((a, b) => a.order - b.order);

      // "+" buttons for subgroups only live inside listSubgroups containers, so
      // drag-to-reorder is list-track only. Tab-subgroups carry through untouched.
      const lists = allChildren.filter(g => g.settings?.style !== "tab");
      const tabs = allChildren.filter(g => g.settings?.style === "tab");
      const sIdx = lists.findIndex(g => g.nestId === sourceNestId);
      if (sIdx < 0) return;
      const [moved] = lists.splice(sIdx, 1);
      const target = sIdx < position ? position - 1 : position;
      const clamped = Math.max(0, Math.min(target, lists.length));
      if (clamped === sIdx) return;
      lists.splice(clamped, 0, moved);

      const listPayload = lists.map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      const tabPayload = tabs.map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      await groupHandler.updateGroups([...listPayload, ...tabPayload], parentGroupData);
    }

    await groupHandler.saveGroups({ saveActor: true, saveUser: true });
    Hooks.callAll("forceUpdateTokenActionHud");
  }

  /* -------------------------------------------- */
  /* ACTION EVENTS                                */
  /* -------------------------------------------- */

  /**
   * When an action is clicked.
   * @param {Event} event
   */
  static clickAction(event) {
    event.preventDefault();

    if (this.isUnlocked) {
      event.currentTarget?.blur?.();
      return;
    }

    if (event.button === 2) {
      const button = event.target?.closest?.("[data-part=\"actionButton\"]");
      if (button?.dataset?.hasContextMenu === "true") {
        button.blur?.();
        return;
      }
    }

    this.hudManager.handleHudEvent("clickAction", event);
    event.currentTarget?.blur?.();
  }

  /* -------------------------------------------- */

  /**
   * Handle when an action is hovered.
   * @param {Event} event
   */
  handleActionHover(event) {
    this.hudManager.handleHudEvent("hoverAction", event);
  }

  /* -------------------------------------------- */
  /* HUD DRAG                                     */
  /* -------------------------------------------- */

  /**
   * Drag event handler.
   * @private
   * @param {Event} event
   */
  #dragEvent(event) {
    if (!this.isDraggable) return;

    // Get the main element
    const element = this.element;

    const clientX = event.clientX ?? event.changedTouches[0].clientX;
    const clientY = event.clientY ?? event.changedTouches[0].clientY;

    // Initialise positions and starting positions
    let pos1 = 0;
    let pos2 = 0;
    let pos3 = clientX;
    let pos4 = clientY;
    const originalElementTop = element.offsetTop;
    const originalElementLeft = element.offsetLeft;
    let newElementTop = originalElementTop;
    let newElementLeft = originalElementLeft;

    /**
     * Mouse movement event handler.
     * @param {Event} event
     */
    const mouseMoveEvent = event => {
      const clientX = event.clientX ?? event.changedTouches[0].clientX;
      const clientY = event.clientY ?? event.changedTouches[0].clientY;
      pos1 = pos3 - clientX;
      pos2 = pos4 - clientY;
      pos3 = clientX;
      pos4 = clientY;

      // If the mouse has not moved, do not update
      if (pos1 === pos3 && pos2 === pos4) return;

      newElementTop = newElementTop - pos2;
      newElementLeft = newElementLeft - pos1;

      this.topPos = newElementTop;

      // Apply styles
      requestAnimationFrame(() => {
        Object.assign(element.style, { left: `${newElementLeft}px`, top: `${newElementTop}px` });
      });
    };

    /* -------------------------------------------- */

    /**
     * Mouse up event handler
     */
    const mouseUpEvent = () => {
      // Remove the mouse move and touch move events
      document.onmousemove = null;
      element.ontouchmove = null;

      // Remove the mouse up and touch end events
      document.onmouseup = null;
      element.ontouchend = null;

      // If position has not changed, do not update
      if (newElementTop === originalElementTop && newElementLeft === originalElementLeft) return;

      this.topPos = newElementTop;

      this.#applyDirection();

      // Save the new position to the user's flags
      this.hudPosition = { top: newElementTop, left: newElementLeft };
    };

    // Bind mouse move and touch move events
    document.onmousemove = mouseMoveEvent;
    element.ontouchmove = mouseMoveEvent;

    // Bind mouse up and touch end events
    document.onmouseup = mouseUpEvent;
    element.ontouchend = mouseUpEvent;
  }

  /* -------------------------------------------- */
  /* POSITION                                     */
  /* -------------------------------------------- */

  /**
   * Set position of the HUD
   * @public
   */
  setPosition() {
    if (!this.hudManager.hud) return;
    if (this.isDocked) {
      this.#setDockedPosition();
    } else {
      this.#setUndockedPosition();
    }
  }

  /* -------------------------------------------- */

  /**
   * Set docked position
   */
  #setDockedPosition() {
    this.element.style.top = 0;
    this.element.style.left = 0;

    const interfaceElement = document.querySelector("#interface");
    const dockPosition = this.systemManager.styles[this.setting.style]?.dockPosition;
    const isV13 = foundry.utils.isNewerVersion(game.version, "12.999");

    switch (dockPosition) {
      case "right":
        if (isV13) {
          const sidebarElement = document.querySelector("#sidebar");
          sidebarElement.prepend(this.element);
        } else {
          interfaceElement.appendChild(this.element);
        }
        break;
      case "center-right":
        const rightUiElement = interfaceElement.querySelector("#ui-right");
        if (isV13) {
          rightUiElement.prepend(this.element);
        } else {
          interfaceElement.insertBefore(this.element, rightUiElement);
        }
        break;
      case "left":
        const leftUiElement = interfaceElement.querySelector("#ui-left");
        if (isV13) {
          leftUiElement.prepend(this.element);
        } else {
          interfaceElement.insertBefore(this.element, leftUiElement);
        }
        break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set undocked position
   */
  #setUndockedPosition() {
    document.body.appendChild(this.element);
    this.#setPositionFromFlag();
    this.#applyDirection();
  }

  /* -------------------------------------------- */

  /**
   * Set the position of the HUD based on user flag
   * @private
   */
  #setPositionFromFlag() {
    if (!this.hudPosition) {
      this.element.style.top = `${HUD.DEFAULT_TOP_POS}px`;
      this.element.style.left = `${HUD.DEFAULT_LEFT_POS}px`;
      return;
    }

    return new Promise(resolve => {
      const check = () => {
        if (this.element) {
          this.element.style.bottom = null;
          this.topPos = this.hudPosition.top < 5 || this.hudPosition.top > window.innerHeight + 5
            ? HUD.DEFAULT_TOP_POS
            : this.hudPosition.top ?? HUD.DEFAULT_TOP_POS;
          this.leftPos = this.hudPosition.left < 5 || this.hudPosition.left > window.innerWidth + 5
            ? HUD.DEFAULT_LEFT_POS
            : this.hudPosition.left ?? HUD.DEFAULT_LEFT_POS;
          this.element.style.top = `${this.topPos}px`;
          this.element.style.left = `${this.leftPos}px`;
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };

      check();
    });
  }

  /* -------------------------------------------- */
  /* RESET                                        */
  /* -------------------------------------------- */

  /**
   * Reset the position of the HUD
   * @public
   */
  async resetPosition() {
    Logger.debug("Resetting position...");
    this.hudPosition = { top: HUD.DEFAULT_TOP_POS, left: HUD.DEFAULT_LEFT_POS };
  }

  /* -------------------------------------------- */

  /**
   * Copy user's data to others users
   * @public
   * @param {string} fromUserId        The user id to copy from
   * @param {string | Array} toUserIds The user ids to copy to
   */
  async copy(fromUserId, toUserIds) {
    await this.#copyUserData(fromUserId, toUserIds);
  }

  /* -------------------------------------------- */

  /**
   * Copy user's data to others users
   * @private
   * @param {string} fromUserId        The user id to copy from
   * @param {string | Array} toUserIds The user ids to copy to
   */
  async #copyUserData(fromUserId, toUserIds) {
    if (!game.user.isGM) {
      Logger.info("Copy failed: User is not a GM", true);
      return;
    }
    // Exit if parameters are missing
    if (!fromUserId || !toUserIds.length) {
      Logger.info("Copy failed: Parameters missing", true);
      return;
    }

    Logger.debug("Copying user data to users...");

    const fromGroup = await this.dataHandler.getDataAsGm({ type: "user", id: fromUserId });

    if (typeof toUserIds === "string") {
      await this.dataHandler.saveDataAsGm("user", toUserIds, fromGroup);
    } else if (Array.isArray(toUserIds)) {
      for (const userId of toUserIds) {
        await this.dataHandler.saveDataAsGm("user", userId, fromGroup);
      }
    }

    Logger.debug("User data copied to users");
  }

  /* -------------------------------------------- */

  /**
   * Reset the HUD layout with the socket
   */
  static async resetLayoutWithSocket() {
    game?.tokenActionHud?.resetLayout();
  }

  /* -------------------------------------------- */

  /**
   * Reset the HUD layout
   */
  async resetLayout() {
    Logger.debug("Resetting layout...");
    await this.resetUserAndActorData();
    this.resetPosition();
    Logger.debug("Layout reset");
  }

  /* -------------------------------------------- */

  /**
   * Reset current actor's HUD data
   */
  async resetActorData() {
    Logger.debug("Resetting actor data...");

    await this.dataHandler.saveDataAsGm("actor", this.hudManager.actor.id, {});

    Logger.debug("Actor data reset");

    this.hudManager.hardResetHud();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetActorData" } };
    this.update(trigger);
  }

  /* -------------------------------------------- */

  /**
   * Reset every actor's HUD data
   * @public
   */
  async resetAllActorData() {
    Logger.debug("Resetting all actor data...");

    for (const actor of game.actors) {
      Logger.debug(`Resetting flags for actor [${actor.id}]`, { actor });
      await this.dataHandler.saveDataAsGm("actor", actor.id, {});
    }

    Logger.debug("All actor data reset");
    this.hudManager.hardResetHud();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetAllActorData" } };
    this.update(trigger);
  }

  /* -------------------------------------------- */

  /**
   * Reset user's HUD data
   * @public
   */
  async resetUserData() {
    Logger.debug("Resetting user data...");
    await this.dataHandler.saveDataAsGm("user", game.userId, {});
    Logger.debug("User data reset");
    this.hudManager.hardResetHud();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetUserData" } };
    this.update(trigger);
  }

  /* -------------------------------------------- */

  /**
   * Reset every user's HUD data
   * @public
   */
  async resetAllUserData() {
    Logger.debug("Resetting all user data...");
    for (const user of game.users) {
      await this.dataHandler.saveDataAsGm("user", user.id, {});
    }
    Logger.debug("All user data reset");
    this.hudManager.hardResetHud();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetAllUserData" } };
    this.update(trigger);
  }

  /* -------------------------------------------- */

  /**
   * Reset user and actor's HUD data
   */
  async resetUserAndActorData() {
    Logger.debug("Resetting user data...");
    await this.dataHandler.saveDataAsGm("user", game.userId, {});
    Logger.debug("User data reset");

    Logger.debug("Resetting actor data...");
    await this.dataHandler.saveDataAsGm("actor", this.hudManager.actor.id, {});
    Logger.debug("Actor data reset");

    this.hudManager.hardResetHud();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetUserAndActorData" } };
    this.update(trigger);
  }

  /* -------------------------------------------- */
  /* UPDATE / CLOSE                               */
  /* -------------------------------------------- */

  /**
   * Update the HUD.
   * @public
   * @param {object} trigger
   */
  async update(trigger = null) {
    // Stops settings updates from triggering the HUD update multiple times
    // Instead an update is triggered when settings are updated and the settings config window is closed
    if (trigger?.name === "closeSettingsConfig") {
      if (!this.updateSettingsPending) return;
      this.updateSettingsPending = false;
      Logger.debug("Settings updated");
    }

    await this.#handleUpdate();
    await this.#performUpdate(trigger);
  }

  /* -------------------------------------------- */

  /**
   * Handles HUD updates to avoid overlapping updates.
   */
  async #handleUpdate() {
    // Start a timer and reset it each time an update call is received before the timer has elapsed
    if (this.isUpdatePending) this.updatePendingTimer.abort();

    this.isUpdatePending = true;
    await this.updatePendingTimer.start();
    this.isUpdatePending = false;

    // Wait for the current update to complete before progressing a pending update
    // Stop waiting if the current update takes longer than 5 seconds
    const waitForUpdateCompletion = async () => {
      const maxWaitTime = 5000;
      const interval = 10;
      const iterations = maxWaitTime / interval;

      let i = 0;
      while (i < iterations && this.isUpdating) {
        await this.updateTimer.start();
        i++;
      }

      return !this.isUpdating;
    };

    if (this.isUpdating) {
      const hasCompleted = await waitForUpdateCompletion();
      if (!hasCompleted) {
        Logger.debug("Update took too long. Aborting...");
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Perform the HUD update following handling.
   * @param {object} trigger
   */
  async #performUpdate(trigger) {
    this.isUpdating = true;
    Logger.debug("Updating HUD...", trigger);

    // Await does have an effect
    const initialised = await this.hudManager.init(trigger);
    if (!initialised) {
      this.#abortUpdate();
      return;
    }

    Hooks.callAll("tokenActionHudCorePreRender", this.hudManager.hud, this.hudManager);

    this.rendering = true;
    this.render({ force: true, position: {} });

    this.isUpdating = false;

    Hooks.callAll("tokenActionHudCoreHudUpdated", MODULE);
    Logger.debug("HUD updated");
  }

  /* -------------------------------------------- */

  /**
   * Abort the HUD update with a debug message.
   * @private
   */
  #abortUpdate() {
    this.#close();
    Logger.debug("HUD update aborted as no character(s) found or HUD is disabled");
    this.isUpdating = false;
  }

  /* -------------------------------------------- */

  /**
   * Close the HUD
   * @public
   */
  closeHud() {
    this.#close();
  }

  /* -------------------------------------------- */

  /**
   * Close the HUD
   * @private
   */
  #close() {
    requestAnimationFrame(() => {
      this.element?.classList?.remove("tah-expanded");
      this.element?.classList?.add("tah-closed");
    });

    this.openGroups = new Set();
    this.closeTimer = setTimeout(() => {
      this.close({ animate: false });
    }, 500);
  }

  /* -------------------------------------------- */
  /* TOKEN / ACTOR VALIDATION                     */
  /* -------------------------------------------- */

  /**
   * Whether the token change is valid for a HUD update.
   * @public
   * @param {object} token
   * @param {object} data
   * @returns {boolean} Whether the token change is valid for a HUD update
   */
  isValidTokenChange(token, data = null) {
    if (data.flags) return false;
    return this.#isRelevantToken(token) || (Utils.getSetting("alwaysShowHud") && token.actorId === game.user.character?.id);
  }

  /* -------------------------------------------- */

  /**
   * Whether the token is controlled or on the canvas.
   * @private
   * @param {object} token
   * @returns {boolean} Whether the token is controlled or on the canvas
   */
  #isRelevantToken(token) {
    const controlledTokens = Utils.getControlledTokens();
    return (
      controlledTokens?.some(controlledToken => controlledToken.id === token.id)
        || (!controlledTokens?.length
          && canvas?.tokens?.placeables?.some(token => token.id === this.hudManager.token?.id))
    );
  }

  /* -------------------------------------------- */

  /**
   * Whether the given actor is the selected actor.
   * @param {object} actor
   * @returns {boolean} Whether the given actor is the selected actor
   */
  isControlledActor(actor) {
    return actor?.id === this.hudManager.actor?.id;
  }

  /* -------------------------------------------- */

  /**
   * Whether the actor or item update is valid for a HUD update.
   * @param {object} actor
   * @param {object} data
   * @returns {boolean} Whether the actor or item update is valid for a HUD update
   */
  isValidActorOrItemUpdate(actor, data) {
    if (!actor) {
      Logger.debug("No actor; updating HUD", { data });
      return true;
    }

    if (this.isControlledActor(actor)) {
      Logger.debug("Same actor; updating HUD", { actor, data });
      return true;
    } else {
      Logger.debug("Different actor; skipping HUD update", { actor, data });
      return false;
    }
  }
  /* -------------------------------------------- */
  /* STATE                                        */
  /* -------------------------------------------- */

  /**
   * The direction the HUD will expand.
   * @private
   * @returns {string} "up" or "down"
   */
  get direction() {
    const direction = Utils.getSetting("direction");
    if (direction === "up" || (direction === "auto" && this.topPos > window.innerHeight / 2)) return "up";
    return "down";
  }

  /* -------------------------------------------- */

  /**
   * Get HUD position.
   * @returns {object} {top, left}
   */
  get hudPosition() {
    return Utils.getUserFlag("position");
  }

  /* -------------------------------------------- */

  /**
   * Set HUD position.
   * @param {object} obj {top, left}
   */
  set hudPosition(obj) {
    Utils.setUserFlag("position", obj);
    Logger.debug(`Position set to x: ${obj.top}px, y: ${obj.left}px`);
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is enabled.
   * @returns {boolean} Whether the HUD is enabled
   */
  get isEnabled() {
    return Utils.getSetting("enable");
  }

  set isEnabled(bool) {
    Utils.setSetting("enable", bool);
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is collapsed.
   * @returns {boolean} Whether the HUD is collapsed
   */
  get isCollapsed() {
    return Utils.getUserFlag("isCollapsed");
  }

  set isCollapsed(bool) {
    Utils.setUserFlag("isCollapsed", bool);
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is docked.
   * @returns {boolean} Whether the HUD is docked
   */
  get isDocked() {
    const style = this.systemManager.styles[this.setting.style] ?? this.systemManager.styles.foundryVTT;
    return style?.isDocked || style?.dockPosition;
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is unlocked.
   * @returns {boolean} Whether the HUD is unlocked
   */
  get isUnlocked() {
    return Utils.getUserFlag("isUnlocked");
  }

  set isUnlocked(bool) {
    Utils.setUserFlag("isUnlocked", bool);
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is draggable.
   * @returns {boolean} Whether the HUD is draggable
   */
  get isDraggable() {
    const drag = Utils.getSetting("drag");
    return ((drag === "always") || (drag === "whenUnlocked" && this.isUnlocked));
  }

  /* -------------------------------------------- */

  /**
   * The HUD scale.
   * @private
   * @returns {number} HUD scale
   */
  get scale() {
    if (this.isDocked) return 1;
    const scale = parseFloat(Utils.getSetting("scale")) || 1;
    return Math.min(Math.max(scale, 0.5), 2);
  }
}

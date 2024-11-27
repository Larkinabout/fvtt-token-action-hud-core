import { HudManager } from "../managers/hud-manager.mjs";
import { TagifyAppHelper } from "./tagify-app-helper.mjs";
import { GroupResizer } from "../handlers/group-resizer.mjs";
import { HUD, MODULE, SETTING, TEMPLATE } from "../core/constants.mjs";
import { Logger, Timer, Utils } from "../core/utils.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Token Action HUD application
 */
export class TokenActionHud extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(systemManager, dataHandler, socket) {
    super();
    this.systemManager = systemManager;
    this.dataHandler = dataHandler;
    this.hudManager = new HudManager(this, systemManager, dataHandler, socket);
    this.groupResizer = new GroupResizer(this, this.hudManager);
    this.socket = socket;
    this.openGroups = new Set();
    this.updatePendingTimer = new Timer(10);
    this.updateTimer = new Timer(10);
    this.closeTimer = null;
    this.renderTimer = null;
  }

  /* -------------------------------------------- */

  /**
   * Merge Token Action Hud's default options with ApplicationV2
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
      editHud: TokenActionHud.editHud
    },
    background: "none",
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
   * Define template parts
   */
  static PARTS = {
    form: {
      template: TEMPLATE.hud
    }
  };

  /* -------------------------------------------- */

  /**
   * Prepare context
   * @override
   */
  async _prepareContext() {
    const styleData = this.systemManager.styles[Utils.getSetting("style")];
    const context = {
      hud: this.hudManager.hud,
      id: "token-action-hud",
      style: styleData.class ?? "",
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
   * Initialise the HUD
   * @public
   */
  async init() {
    this.#cacheSettings();
  }

  /* -------------------------------------------- */

  /**
   * Cache settings for slightly faster retrieval
   */
  #cacheSettings() {
    const settings = [
      "activeCssAsText", "allow", "alwaysShowHud", "clickOpenCategory", "direction",
      "debug", "displayIcons", "drag", "enable", "grid",
      "scale", "style"
    ];

    settings.forEach(setting => {
      this[`${setting}Setting`] = Utils.getSetting(setting);
    });
  }

  /* -------------------------------------------- */

  /**
   * Update cached settings following changes
   * @param {string} key The setting key
   * @param {*|null} value      The setting value
   * @public
   */
  async updateCachedSettings(key, value = null) {
    if (!this.updateSettingsPending) {
      this.updateSettingsPending = true;
      Logger.debug("Updating settings...");
    }

    if (!SETTING[key]) return;

    const { classes, variable } = SETTING[key];
    if (variable) {
      if (classes.includes("TokenActionHud")) this[variable] = value;
    }

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
    }
  }

  /* -------------------------------------------- */
  /* RENDER                                       */
  /* -------------------------------------------- */

  /**
   * On render
   * @param {options} context The context
   * @param {options} options The options
   */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.classList.remove("tah-closed");
    clearTimeout(this.closeTimer);
    clearTimeout(this.renderTimer);
    this.#cacheElements();
    this.#setInitialHudState();
    this.#addHoverEvents(this.elements);
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
      subgroupArr: this.element.querySelectorAll("[data-part=\"subgroup\"]"),
      listSubgroupTitleArr: this.element.querySelectorAll("[data-part=\"listSubgroupTitle\"]"),
      groupButtonArr: this.element.querySelectorAll("[data-part=\"groupButton\"]"),
      collapseExpandContainer: this.element.querySelector("[data-part=\"collapseExpandContainer\"]"),
      collapseHudButton: this.element.querySelector("[data-part=\"collapseHudButton\"]"),
      expandHudButton: this.element.querySelector("[data-part=\"expandHudButton\"]"),
      unlockButton: this.element.querySelector("[data-part=\"unlockHudButton\"]"),
      lockButton: this.element.querySelector("[data-part=\"lockHudButton\"]")
    };
  }

  /* -------------------------------------------- */

  /**
   * Set the initial state of the HUD (collapsed or expanded, locked or unlocked)
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
   * Add hover events
   * @param {object} elements The elements
   */
  #addHoverEvents(elements) {
    if (!Utils.getSetting("clickOpenCategory")) {
      // When a category button is hovered over...
      elements.tabSubgroupArr.forEach(element => {
        element.addEventListener("touchstart", this.toggleGroup.bind(this), { passive: true });
        element.addEventListener("pointerenter", this.toggleGroup.bind(this));
        element.addEventListener("pointerleave", this.toggleGroup.bind(this));
      });
    }

    // When a category button is clicked and held...
    if (!this.isDocked) {
      elements.groupButtonArr.forEach(element => {
        element.addEventListener("mousedown", this.#dragEvent.bind(this));
        element.addEventListener("touchstart", this.#dragEvent.bind(this), { passive: true });
      });
    }

    // When an action is hovered...
    elements.actionArr.forEach(element => {
      element.addEventListener("pointerenter", this.handleActionHover.bind(this));
      element.addEventListener("pointerleave", this.handleActionHover.bind(this));
    });
  }

  /* -------------------------------------------- */
  /* POST-RENDER                                  */
  /* -------------------------------------------- */

  /**
   * Functions to execute after the application is rendered
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
   * Apply classes for HUD direction
   * @private
   */
  #applyDirection() {
    if (this.isDocked) return;

    const { characterName, subgroupsContainerArr } = this.elements;

    if (this.direction === "up") {
      characterName.classList.add("tah-hidden");

      subgroupsContainerArr.forEach(element => {
        element.classList.remove("expand-down");
        element.classList.add("expand-up");
      });
    } else {
      if (!this.isCollapsed) {
        characterName.classList.remove("tah-hidden");
      }

      subgroupsContainerArr.forEach(element => {
        element.classList.add("expand-down");
        element.classList.remove("expand-up");
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Reopen groups following a re-render of the HUD
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
  /* INTERACTIVITY                                */
  /* -------------------------------------------- */

  /**
   * When the 'Edit HUD' button is clicked, open the Edit HUD app
   */
  static editHud() {
    TagifyAppHelper.openEditHudApp(this.hudManager.groupHandler);
  }

  /* -------------------------------------------- */
  /* ENABLE/DISABLE HUD                           */
  /* -------------------------------------------- */

  /**
   * Toggle the HUD enabled state
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
   * When the 'Collapse HUD' button is clicked, collapse the HUD
   */
  static collapseHud() {
    this.toggleHudCollapse("collapse");
  }

  /* -------------------------------------------- */

  /**
   * When the 'Expand HUD' button is clicked, expand the HUD
   */
  static expandHud() {
    this.toggleHudCollapse("expand");
  }

  /* -------------------------------------------- */

  /**
   * Toggle the HUD between collapse and expand states
   * @param {string} state The state ("collapse" or "expand")
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
   * When the 'Unlock HUD' button is clicked, unlock the HUD
   * @param {object|null} event The event
   */
  static async unlockHud(event = null) {
    this.toggleHudLock("unlock", event);
  }

  /* -------------------------------------------- */

  /**
   * When the 'Lock HUD' button is clicked, lock the HUD
   * @param {object|null} event The event
   */
  static async lockHud(event = null) {
    this.toggleHudLock("lock", event);
  }

  /* -------------------------------------------- */

  /**
   * Toggle HUD lock state
   * @param {string} state      The state ("lock" or "unlock")
   * @param {object|null} event The event
   */
  toggleHudLock(state, event = null) {
    if (event) event.preventDefault();

    const isUnlocking = state === "unlock";
    const { unlockButton, lockButton, editHudButton, subgroupArr, groupButtonArr,
      groups, listSubgroupsArr, tabSubgroupArr, listSubgroupTitleArr } = this.elements;

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
  }

  /* -------------------------------------------- */
  /* GROUP EVENTS                                 */
  /* -------------------------------------------- */

  /**
   * When a group is clicked
   * @param {object} event The event
   */
  static clickGroup(event) {
    this.bringToFront();

    // Remove focus to allow core ESC interactions
    event.currentTarget.blur();

    if (event.type === "contextmenu") {
      if (this.isUnlocked) {
        this.openEditGroupApp(event);
      } else {
        this.handleGroupClick(event);
      }
    } else if (Utils.getSetting("clickOpenCategory")) {
      this.toggleGroup(event);
    }
  }

  /* -------------------------------------------- */

  /**
   * When a subgroup is clicked
   * @param {object} event The event
   */
  static clickSubgroup(event) {
    if (event.type === "contextmenu") {
      if (this.isUnlocked) {
        this.openEditGroupApp(event);
      } else {
        this.handleGroupClick(event);
      }
    } else {
      const group = Utils.getClosestGroupElement(event);
      if (group.dataset?.groupType === "tab") {
        this.toggleGroup(event, group);
      } else {
        this.collapseExpandSubgroup(event);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Toggle the visibility of the group
   * @param {object} event The event
   * @param {object} group The group element
   */
  toggleGroup(event = null, group = null) {
    group = group || Utils.getClosestGroupElement(event);
    const isOpen = group.classList.contains("hover");
    const shouldOpen = !isOpen;
    if ((isOpen && event?.type === "pointerenter") || (!isOpen && event?.type === "pointerleave")) return;
    group.classList.toggle("hover", shouldOpen);
    if (shouldOpen) {
      this.#toggleOtherGroups(group);
      this.groupResizer.resizeGroup(group);

      this.openGroups.add(group.id);
    } else {
      this.openGroups.delete(group.id);
    }
    // Remove focus to allow core ESC interactions
    if (event) event.currentTarget.blur();
  }

  /* -------------------------------------------- */

  /**
   * Toggle visibility of other groups
   * @private
   * @param {string} groupToIgnore The group to ignore
   */
  #toggleOtherGroups(groupToIgnore) {
    if (!this.openGroups.size) return;

    this.openGroups.forEach(groupId => {
      if (groupId === groupToIgnore.id) return;
      const group = this.element.querySelector(`#${groupId}`);
      // If group no longer exists on the HUD, delete it
      if (!group) {
        this.openGroups.delete(groupId);
      }
      const isParentToIgnore = group.querySelector(`#${groupToIgnore.id}`);
      if (group && !isParentToIgnore) {
        this.toggleGroup(null, group);
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Collapse/expand a subgroup
   * @param {object} event                       The event
   */
  collapseExpandSubgroup(event) {
    if (!Utils.getSetting("collapsibleSubgroups")) return;

    const target = event.target.closest('[data-part="listSubgroupTitle"]');

    const groupElement = Utils.getClosestGroupElement(event);
    const nestId = groupElement?.dataset?.nestId;
    const tabSubgroup = target.closest(".tah-tab-subgroup.hover");
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
      this.groupResizer.resizeGroup(tabSubgroup);
    } else {
      toggleGroupVisibility();
      saveGroupSettings(true);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle when a group is clicked
   * @param {object} event The event
   */
  handleGroupClick(event) {
    this.hudManager.handleHudEvent("groupClick", event);
  }

  /* -------------------------------------------- */

  /**
   * Open the 'Edit Group' or 'Edit Subgroup' app
   * @param {object} event
   */
  openEditGroupApp(event) {
    const group = Utils.getClosestGroupElement(event);
    const { nestId, level, type } = group.dataset;
    if (!nestId) return;
    const name = this.hudManager.groupHandler.groups[nestId].name;
    const parsedLevel = parseInt(level, 10) || null;

    if (parsedLevel === 1) {
      TagifyAppHelper.openEditGroupApp(
        this.hudManager.groupHandler,
        { nestId, name, level: parsedLevel, type }
      );
    } else {
      TagifyAppHelper.openEditSubgroupApp(
        this.hudManager.groupHandler,
        this.hudManager.actionHandler,
        { nestId, name, level: parsedLevel, type }
      );
    }

  }

  /* -------------------------------------------- */
  /* ACTION EVENTS                                */
  /* -------------------------------------------- */

  /**
   * When an action is clicked
   * @param {object} event The event
   */
  static clickAction(event) {
    event.preventDefault();
    this.hudManager.handleHudEvent("clickAction", event);
    event.currentTarget.blur();
  }

  /* -------------------------------------------- */

  /**
   * Handle when an action is hovered
   * @param {object} event The event
   */
  handleActionHover(event) {
    this.hudManager.handleHudEvent("hoverAction", event);
  }

  /* -------------------------------------------- */

  /**
   * Drag event handler
   * @private
   * @param {object} event The event
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
     * Mouse movement event handler
     * @param {object} event The event
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
    const dockPosition = this.systemManager.styles[this.styleSetting]?.dockPosition;

    switch (dockPosition) {
      case "right":
        interfaceElement.appendChild(this.element);
        break;
      case "center-right":
        const rightUiElement = interfaceElement.querySelector("#ui-right");
        interfaceElement.insertBefore(this.element, rightUiElement);
        break;
      case "left":
        const leftUiElement = interfaceElement.querySelector("#ui-left");
        interfaceElement.insertBefore(this.element, leftUiElement);
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

  /**
   * The direction the HUD will expand
   * @private
   * @returns {string} The direction
   */
  get direction() {
    const direction = Utils.getSetting("direction");
    if (direction === "up" || (direction === "auto" && this.topPos > window.innerHeight / 2)) return "up";
    return "down";
  }

  /* -------------------------------------------- */

  /**
   * The HUD position
   * @returns {object} The HUD position
   */
  get hudPosition() {
    return Utils.getUserFlag("position");
  }

  set hudPosition(obj) {
    Utils.setUserFlag("position", obj);
    Logger.debug(`Position set to x: ${obj.top}px, y: ${obj.left}px`);
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is enabled
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
   * Whether the HUD is collapsed
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
   * Whether the HUD is docked
   * @returns {boolean} Whether the HUD is docked
   */
  get isDocked() {
    const style = this.systemManager.styles[this.styleSetting];
    return style.isDocked || style.dockPosition;
  }

  /* -------------------------------------------- */

  /**
   * Whether the HUD is unlocked
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
   * Whether the HUD is draggable
   * @returns {boolean} Whether the HUD is draggable
   */
  get isDraggable() {
    const drag = Utils.getSetting("drag");
    return ((drag === "always") || (drag === "whenUnlocked" && this.isUnlocked));
  }

  /* -------------------------------------------- */

  /**
   * The HUD scale
   * @private
   * @returns {number} The scale
   */
  get scale() {
    if (this.isDocked) return 1;
    const scale = parseFloat(Utils.getSetting("scale")) || 1;
    return Math.min(Math.max(scale, 0.5), 2);
  }

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

  /**
   * Update the HUD
   * @public
   * @param {object} trigger The trigger for the update
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
   * Handles HUD updates to avoid overlapping updates
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
   * Perform the HUD update following handling
   * @param {object} trigger The trigger for the update
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

    this.rendering = true;
    this.render({ force: true, position: {} });

    if (!ui.windows[MODULE.ID]) {
      ui.windows[MODULE.ID] = this;
    }

    this.isUpdating = false;

    Hooks.callAll("tokenActionHudCoreHudUpdated", MODULE);
    Logger.debug("HUD updated");
  }

  /* -------------------------------------------- */

  /**
   * Abort the HUD update with a debug message
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

    delete ui.windows[MODULE.ID];
  }

  /* -------------------------------------------- */

  /**
   * Whether the token change is valid for a HUD update
   * @public
   * @param {object} token The token
   * @param {object} data  The data
   * @returns {boolean}    Whether the token change is valid for a HUD update
   */
  isValidTokenChange(token, data = null) {
    if (data.flags) return false;
    return this.#isRelevantToken(token) || (Utils.getSetting("alwaysShowHud") && token.actorId === game.user.character?.id);
  }

  /* -------------------------------------------- */

  /**
   * Whether the token is controlled or on the canvas
   * @private
   * @param {object} token The token
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
   * Whether the given actor is the selected actor
   * @param {object} actor The actor
   * @returns {boolean}    Whether the given actor is the selected actor
   */
  isControlledActor(actor) {
    return actor?.id === this.hudManager.actor?.id;
  }

  /* -------------------------------------------- */

  /**
   * Whether the actor or item update is valid for a HUD update
   * @param {object} actor The actor
   * @param {object} data  The data
   * @returns {boolean}    Whether the actor or item update is valid for a HUD update
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
}

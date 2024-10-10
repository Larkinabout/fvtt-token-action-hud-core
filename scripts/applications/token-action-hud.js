import { TagDialogHelper } from "./tag-dialog-helper.js";
import { GroupResizer } from "../group-resizer.js";
import { DataHandler } from "../data-handler.js";
import { HUD, MODULE, SETTING, TEMPLATE } from "../constants.js";
import { Logger, Timer, Utils } from "../utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Token Action HUD application
 */
export class TokenActionHud extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(systemManager) {
    super();
    this.module = MODULE;
    this.systemManager = systemManager;
    this.openGroups = new Set();
    this.updatePendingTimer = new Timer(10);
    this.updateTimer = new Timer(10);
  }

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
    id: "token-action-hud",
    position: {
      width: HUD.defaultWidth,
      height: HUD.defaultHeight,
      left: HUD.defaultLeftPos,
      top: HUD.defaultTopPos,
      scale: HUD.defaultScale
    },
    window: {
      frame: false,
      title: "token-action-hud"
    },
    zIndex: 100
  };

  /**
   * Define template parts
   */
  static PARTS = {
    form: {
      template: TEMPLATE.hud
    }
  };

  /**
   * Prepare context
   * @override
   */
  async _prepareContext() {
    const context = {
      hud: this.hud,
      id: "token-action-hud",
      style: game.tokenActionHud.systemManager.styles[this.styleSetting].class ?? "",
      scale: this.scale,
      background: "#00000000"
    };

    Logger.debug("Application context", { context });
    return context;
  }

  /**
   * On render
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#cacheElements();
    this.#setInitialHudState();
    this.#addHoverEvents(this.elements);
  }

  /**
   * Cache HUD elements
   */
  #cacheElements() {
    this.elements = {
      characterName: this.element.querySelector("#tah-character-name"),
      actionArr: this.element.querySelectorAll(".tah-action"),
      buttons: this.element.querySelector("#tah-buttons"),
      tabGroupArr: this.element.querySelectorAll(".tah-tab-group"),
      groups: this.element.querySelector("#tah-groups"),
      editHudButton: this.element.querySelector("#tah-edit-hud"),
      listGroupsArr: this.element.querySelectorAll(".tah-list-groups"),
      groupsContainerArr: this.element.querySelectorAll(".tah-groups-container"),
      groupArr: this.element.querySelectorAll(".tah-group"),
      subtitleArr: this.element.querySelectorAll(".tah-subtitle"),
      groupButtonArr: this.element.querySelectorAll(".tah-group-button"),
      collapseHudButton: this.element.querySelector("#tah-collapse-hud"),
      expandHudButton: this.element.querySelector("#tah-expand-hud"),
      unlockButton: this.element.querySelector("#tah-unlock"),
      lockButton: this.element.querySelector("#tah-lock")
    };
  }

  /**
   * Set the initial state of the HUD (collapsed or expanded, locked or unlocked)
   * @private
   */
  #setInitialHudState() {
    if (this.isCollapsed) { this.collapseHud(); }

    if (this.isUnlocked && this.enableCustomizationSetting) {
      TokenActionHud.unlockHud.call(this);
    } else {
      TokenActionHud.lockHud.call(this);
    }

    const { unlockButton } = this.elements;
    unlockButton.classList.toggle("tah-hidden", !this.enableCustomizationSetting);
  }

  /**
   * Post-render HUD
   */
  postRender() {
    this.rendering = false;
    this.#reopenGroups();
    this.#applyDirection();
  }

  /**
   * Initialise the HUD
   * @public
   */
  async init() {
    this.#cacheSettings();
    this.#cacheUserFlags();

    await this.systemManager.registerDefaultsCore();

    this.dataHandler = new DataHandler();
    await this.dataHandler.init();

    await this.#cacheActionHandler();

    this.groupResizer = new GroupResizer();
    this.rollHandler = this.systemManager.getRollHandlerCore();
  }

  /**
   * Cache settings
   */
  #cacheSettings() {
    const settings = [
      "activeCssAsText", "allow", "alwaysShowHud", "clickOpenCategory", "direction",
      "debug", "displayIcons", "drag", "enableCustomization", "enable", "grid",
      "scale", "style"
    ];

    settings.forEach(setting => {
      this[`${setting}Setting`] = Utils.getSetting(setting);
    });
  }

  /**
   * Cache user flags
   */
  #cacheUserFlags() {
    this.hudPosition = Utils.getUserFlag("position");
    this.isCollapsed = Utils.getUserFlag("isCollapsed");
    this.isUnlocked = Utils.getUserFlag("isUnlocked");
  }

  /**
   * Cache ActionHandler
   */
  async #cacheActionHandler() {
    this.actionHandler = await this.systemManager.getActionHandlerCore();
    this.actionHandler.customLayoutSetting = Utils.getSetting("customLayout");
    this.actionHandler.userCustomLayoutFlag = Utils.getUserFlag("userCustomLayout");
    this.actionHandler.enableCustomizationSetting = this.enableCustomizationSetting;
    this.actionHandler.displayCharacterNameSetting = Utils.getSetting("displayCharacterName");
    this.actionHandler.sortActionsSetting = Utils.getSetting("sortActions");
    this.actionHandler.tooltipsSetting = Utils.getSetting("tooltips");
  }

  /**
   * Update Token Action HUD following change to module settings
   * @param {string} settingKey The setting key
   * @param {*|null} value      The setting value
   * @public
   */
  async updateSettings(settingKey, value = null) {
    if (!this.updateSettingsPending) {
      this.updateSettingsPending = true;
      Logger.debug("Updating settings...");
    }

    const { classes, variable } = SETTING[settingKey];
    if (variable) {
      if (classes.includes("TokenActionHud")) this[variable] = value;
      if (classes.includes("ActionHandler")) this.actionHandler[variable] = value;
    }

    switch (settingKey) {
      case "customLayout":
      case "userCustomLayout":
        this.actionHandler.customLayout = null;
        break;
      case "rollHandler":
        this.rollHandler = this.systemManager.getRollHandlerCore();
        break;
    }
  }

  static editHud() {
    TagDialogHelper.showHudDialog(this.actionHandler);
  }

  /**
   * Unlock the HUD
   * @param {object|null} event The event
   */
  static async unlockHud(event = null) {
    this.toggleHudLock("unlock", event);
  }

  /**
   * Lock the HUD
   * @param {object|null} event The event
   */
  static async lockHud(event = null) {
    this.toggleHudLock("lock", event);
  }

  /**
   * Toggle HUD lock state
   * @param {string} state      The state ("lock" or "unlock")
   * @param {object|null} event The event
   */
  toggleHudLock(state, event = null) {
    if (event) event.preventDefault();

    const isUnlocking = state === "unlock";
    const { unlockButton, lockButton, editHudButton, groupArr, groupButtonArr,
      groups, listGroupsArr, tabGroupArr, subtitleArr } = this.elements;

    unlockButton.classList.toggle("tah-hidden", isUnlocking);
    lockButton.classList.toggle("tah-hidden", !isUnlocking);
    editHudButton.classList.toggle("tah-hidden", !isUnlocking);
    groups.classList.toggle("tah-unlocked", isUnlocking);

    const toggleElements = (elements, className, toggle) => {
      elements.forEach(element => element.classList.toggle(className, toggle));
    };

    toggleElements(groupButtonArr, "disable-edit", !isUnlocking);
    toggleElements(subtitleArr, "disable-edit", !isUnlocking);

    if (isUnlocking) {
      toggleElements(groupArr, "tah-hidden", !isUnlocking);
      toggleElements(listGroupsArr, "tah-hidden", !isUnlocking);
      toggleElements(tabGroupArr, "tah-hidden", !isUnlocking);
      toggleElements(subtitleArr, "tah-hidden", !isUnlocking);
    } else {
      // Hide elements that have no actions
      const hideIfEmpty = elements => {
        elements.forEach(element => {
          const hasActions = element.querySelectorAll(".tah-action").length > 0;
          if (!hasActions) element.classList.add("tah-hidden");
        });
      };

      hideIfEmpty(tabGroupArr);
      hideIfEmpty(groupArr);
      hideIfEmpty(listGroupsArr);

      subtitleArr.forEach(element => {
        const groupElement = element.closest(".tah-group");
        if (groupElement.dataset?.showTitle === "false") {
          element.classList.add("tah-hidden");
        }
      });
    }

    this.setUnlocked(isUnlocking);
  }

  /**
   * Set unlocked state
   * @param {boolean} bool true or false
   */
  setUnlocked(bool) {
    if (this.isUnlocked !== bool) {
      Utils.setUserFlag("isUnlocked", bool);
      this.isUnlocked = bool;
    }
  }

  /**
   * Collapse the HUD
   * @param {object|null} event The event
   */
  static collapseHud(event = null) {
    this.toggleHudCollapse("collapse", event);
  }

  /**
   * Expand the HUD
   * @param {object|null} event The event
   */
  static expandHud(event = null) {
    this.toggleHudCollapse("expand", event);
  }

  /**
   * Toggle the HUD between collapse and expand states
   * @param {string} state      The state ("collapse" or "expand")
   * @param {object|null} event The event
   */
  toggleHudCollapse(state, event = null) {
    if (event) event.preventDefault();

    const isCollapsing = state === "collapse";
    const { collapseHudButton, expandHudButton, groups, buttons } = this.elements;

    collapseHudButton.classList.toggle("tah-hidden", isCollapsing);
    expandHudButton.classList.toggle("tah-hidden", !isCollapsing);
    groups.classList.toggle("tah-hidden", isCollapsing);
    buttons.classList.toggle("tah-hidden", isCollapsing);

    this.setCollapsed(isCollapsing);
  }

  /**
   * Set the collapsed state
   * @param {boolean} isCollapsing Whether the HUD is collapsing
   */
  setCollapsed(isCollapsing) {
    if (this.isCollapsed !== isCollapsing) {
      Utils.setUserFlag("isCollapsed", isCollapsing);
      this.isCollapsed = isCollapsing;
    }
  }

  /**
   * Click a group
   * @param {object} event The event
   */
  static clickGroup(event) {
    this.bringToFront();
    // Remove focus to allow core ESC interactions
    event.currentTarget.blur();

    if (event.type === "contextmenu") {
      if (this.isUnlocked) {
        if (event.currentTarget.parentElement.dataset.level === "1") {
          this.openGroupDialog(event);
        } else {
          this.openActionDialog(event);
        }
      } else {
        this.groupClick(event);
      }
    } else if (this.clickOpenCategorySetting) {
      this.toggleGroup(event);
    }
  }

  /**
   * Toggle the group
   * @param {object} event The event
   * @param {object} group The group element
   */
  toggleGroup(event = null, group = null) {
    group = group || this.#getClosestGroup(event);
    const isOpen = group.classList.contains("hover");
    const shouldOpen = !isOpen;
    if ((isOpen && event?.type === "pointerenter") || (!isOpen && event?.type === "pointerleave")) return;
    group.classList.toggle("hover", shouldOpen);
    this.#toggleGroupSiblings(group, isOpen);
    if (shouldOpen) {
      this.groupResizer.resizeGroup(this.actionHandler, group, this.autoDirection, this.gridSetting);
      this.openGroups.add(group.id);
    } else {
      this.openGroups.delete(group.id);
    }
    // Remove focus to allow core ESC interactions
    if (event) event.currentTarget.blur();
  }

  /**
   * Get closest group
   * @param {object} event The event
   * @returns {object}     The closest group element
   */
  #getClosestGroup(event) {
    if (!event) return null;
    return event.target.closest("[data-is-group=\"true\"]");
  }

  #toggleGroupSiblings(group, show) {
    const closestGroupElement = group.closest("[data-is-group=\"true\"]");
    let sibling = closestGroupElement?.nextElementSibling;
    while (sibling) {
      if (sibling.classList.contains("tah-group")) {
        sibling.classList.toggle("tah-hidden", !show);
      }
      sibling = sibling.nextElementSibling;
    }
  }

  /**
   * Reopen groups
   * @param {Event|null} event
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


  /**
   * Click a subgroup
   * @param {object} event The event
   */
  static clickSubgroup(event) {
    if (event.type === "contextmenu") {
      if (this.isUnlocked) {
        this.openActionDialog(event);
      } else {
        this.groupClick(event);
      }
    } else {
      if (event.target.classList.contains("tah-button-text")) return;
      this.collapseExpandSubgroup(event, this.enableCustomizationSetting);
    }
  }

  /**
   * Click an action
   * @param {object} event The event
   */
  static clickAction(event) {
    event.preventDefault();
    const buttonValue = event.target.closest(".tah-action-button")?.value;
    if (!buttonValue) return;
    try {
      this.rollHandler.handleActionClickCore(event, buttonValue, this.actionHandler);
      event.currentTarget.blur();
    } catch(error) {
      Logger.error(event);
    }
  }

  /**
   * Collapse/expand group
   * @param {object} event                       The event
   * @param {boolean} enableCustomizationSetting Whether customization is enabled
   */
  collapseExpandSubgroup(event, enableCustomizationSetting) {
    const target = event.target.classList.contains("tah-subtitle-text")
      ? event.target.parentElement
      : event.target;

    const groupElement = target?.closest(".tah-group");
    const nestId = groupElement?.dataset?.nestId;
    const tabGroup = target.closest(".tah-tab-group.hover");
    const groupsElement = groupElement?.querySelector(".tah-groups");
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
      if (enableCustomizationSetting) {
        this.actionHandler.saveGroupSettings({ nestId, settings: { collapse } });
      }
    };

    if (groupsElement?.classList.contains("tah-hidden")) {
      toggleGroupVisibility();
      saveGroupSettings(false);
      this.groupResizer.resizeGroup(this.actionHandler, tabGroup, this.autoDirection, this.gridSetting);
    } else {
      toggleGroupVisibility();
      saveGroupSettings(true);
    }
  }

  /**
   * Group click
   * @param {object} event The event
   */
  groupClick(event) {
    const group = this.#getClosestGroup(event);

    const nestId = group.dataset?.nestId;
    if (!nestId) return;

    try {
      this.rollHandler.handleGroupClickCore(event, nestId, this.actionHandler);
    } catch(error) {
      Logger.error(event);
    }
  }

  /**
   * Open the group dialog
   * @param {object} event
   */
  openGroupDialog(event) {
    const target = event.currentTarget;
    const parentElement = target.parentElement;
    if (!parentElement.dataset?.nestId) return;

    const nestId = parentElement.dataset?.nestId;
    const name = parentElement.dataset?.name ?? target.innerText ?? target.outerText;
    const level = parseInt(parentElement.dataset?.level) || null;
    const type = parentElement.dataset?.type;

    TagDialogHelper.showGroupDialog(this.actionHandler, { nestId, name, level, type });
  }

  /**
   * Open the Action dialog
   * @param {object} event The event
   */
  openActionDialog(event) {
    const group = getClosestGroup(event);
    const { nestId, level = parseInt(level) ?? null, type } = group.dataset;
    if (!target?.dataset?.nestId) return;
    const name = this.actionHandler.groups[nestId].name;

    TagDialogHelper.showActionDialog(
      this.actionHandler,
      { nestId, name, level, type }
    );
  }

  /**
   * Action hover
   * @param {object} event The event
   */
  actionHover(event) {
    const target = ((event.target.tagName === "BUTTON")) ? event.target : event.currentTarget.children[0];
    const value = target.value;
    try {
      this.rollHandler.handleActionHoverCore(event, value, this.actionHandler);
    } catch(error) {
      Logger.error(event);
    }
  }

  /**
   * Add hover events
   * @param {object} elements The elements
   */
  #addHoverEvents(elements) {
    if (!this.clickOpenCategorySetting) {
      // When a category button is hovered over...
      elements.tabGroupArr.forEach(element => {
        element.addEventListener("touchstart", this.toggleGroup.bind(this), { passive: true });
        element.addEventListener("pointerenter", this.toggleGroup.bind(this));
        element.addEventListener("pointerleave", this.toggleGroup.bind(this));
      });
    }

    // When a category button is clicked and held...
    elements.groupButtonArr.forEach(element => {
      element.addEventListener("mousedown", this.#dragEvent.bind(this));
      element.addEventListener("touchstart", this.#dragEvent.bind(this), { passive: true });
    });

    // When an action is hovered...
    elements.actionArr.forEach(element => {
      element.addEventListener("pointerenter", this.actionHover.bind(this));
      element.addEventListener("pointerleave", this.actionHover.bind(this));
    });
  }


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
        Object.assign(element.style, { left: `${newElementLeft}px`, position: "fixed", top: `${newElementTop}px` });
      });
    };

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
      Utils.setUserFlag("position", this.hudPosition);

      Logger.debug(`Set position to x: ${newElementTop}px, y: ${newElementLeft}px`);
    };

    // Bind mouse move and touch move events
    document.onmousemove = mouseMoveEvent;
    element.ontouchmove = mouseMoveEvent;

    // Bind mouse up and touch end events
    document.onmouseup = mouseUpEvent;
    element.ontouchend = mouseUpEvent;
  }

  /**
   * Get the automatic direction the HUD expands
   * @private
   * @returns {string} The direction
   */
  get autoDirection() {
    if (this.directionSetting === "up" || (this.directionSetting === "auto" && this.topPos > window.innerHeight / 2)) return "up";
    return "down";
  }

  /**
   * Whether the HUD can be dragged
   * @returns {boolean} Whether the HUD can be dragged
   */
  get isDraggable() {
    return ((this.dragSetting === "always") || (this.dragSetting === "whenUnlocked" && this.isUnlocked));
  }

  /**
   * Get the HUD scale
   * @private
   * @returns {number} The scale
   */
  get scale() {
    const scale = parseFloat(this.scaleSetting) || 1;
    return Math.min(Math.max(scale, 0.5), 2);
  }

  /**
   * Apply direction
   * @private
   */
  #applyDirection() {
    const { characterName, groupsContainerArr } = this.elements;

    if (this.autoDirection === "up") {
      characterName.classList.add("tah-hidden");

      groupsContainerArr.forEach(element => {
        element.classList.remove("expand-down");
        element.classList.add("expand-up");
      });
    } else {
      characterName.classList.remove("tah-hidden");

      groupsContainerArr.forEach(element => {
        element.classList.add("expand-down");
        element.classList.remove("expand-up");
      });
    }
  }

  /**
   * Set position of the HUD
   * @public
   */
  setPosition() {
    if (!this.hud) return;
    this.#setPositionFromFlag();
    this.#applyDirection();
  }

  /**
   * Set the position of the HUD based on user flag
   * @private
   */
  #setPositionFromFlag() {
    if (!this.hudPosition) return;

    const defaultLeftPos = this.defaultLeftPos;
    const defaultTopPos = this.defaultTopPos;

    return new Promise(resolve => {
      const check = () => {
        if (this.element) {
          this.element.style.bottom = null;
          this.topPos = this.hudPosition.top < 5 || this.hudPosition.top > window.innerHeight + 5
            ? defaultTopPos
            : this.hudPosition.top;
          this.leftPos = this.hudPosition.left < 5 || this.hudPosition.left > window.innerWidth + 5
            ? defaultLeftPos
            : this.hudPosition.left;
          this.element.style.top = `${this.topPos}px`;
          this.element.style.left = `${this.leftPos}px`;
          this.element.style.position = "fixed";
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };

      check();
    });
  }

  /**
   * Reset the position of the HUD
   * @public
   */
  async resetPosition() {
    Logger.debug("Resetting position...");
    this.hudPosition = { top: this.defaultTopPos, left: this.defaultLeftPos };
    await Utils.setUserFlag("position", this.hudPosition);
    Logger.debug(`Position reset to x: ${this.defaultTopPos}px, y: ${this.defaultLeftPos}px`);
  }

  /**
   * Toggle HUD
   * @public
   */
  async toggleHud() {
    const binding = Utils.humanizeBinding("toggleHud");
    if (this.enableSetting) {
      this.#close();
      this.enableSetting = false;
      await Utils.setSetting("enable", false);
      Logger.info(game.i18n.format("tokenActionHud.keybinding.toggleHud.disabled", { binding }), true);
    } else {
      this.enableSetting = true;
      await Utils.setSetting("enable", true);
      Logger.info(game.i18n.format("tokenActionHud.keybinding.toggleHud.enabled", { binding }), true);
      Hooks.callAll("forceUpdateTokenActionHud");
    }
  }

  /**
   * Copy user's 'groups' flag to others users
   * @public
   * @param {string} fromUserId      The user id to copy from
   * @param {string | Array} toUserIds The user ids to copy to
   */
  async copy(fromUserId, toUserIds) {
    if (!game.user.isGM) return;

    const isCopied = await this.#copyUserData(fromUserId, toUserIds);
    if (isCopied) {
      Logger.info("HUD copied", true);
    } else {
      Logger.info("Copy HUD failed", true);
    }
  }

  /**
   * Copy user's 'groups' flag to others users
   * @private
   * @param {string} fromUserId        The user id to copy from
   * @param {string | Array} toUserIds The user ids to copy to
   * @returns {boolean}                Whether the user data was copied
   */
  async #copyUserData(fromUserId, toUserIds) {
    // Exit if parameters are missing
    if (!fromUserId || !toUserIds.length) return false;

    Logger.debug("Copying user data...");

    const fromGroup = await DataHandler.getDataAsGm({ type: "user", id: fromUserId });

    if (typeof toUserIds === "string") {
      await DataHandler.saveDataAsGm("user", toUserIds, fromGroup);
    } else if (Array.isArray(toUserIds)) {
      for (const userId of toUserIds) {
        await DataHandler.saveDataAsGm("user", userId, fromGroup);
      }
    }

    Logger.debug("User data copied");
    return true;
  }

  /**
   * Reset the HUD
   */
  static async reset() {
    game?.tokenActionHud?.resetLayout();
  }

  /**
   * Reset the HUD layout
   */
  async resetLayout() {
    Logger.debug("Resetting layout...");
    await this.resetUserAndActorData();
    this.resetPosition();
    Logger.debug("Layout reset");
  }

  /**
   * Reset actor data
   */
  async resetActorData() {
    Logger.debug("Resetting actor data...");

    await DataHandler.saveDataAsGm("actor", this.actor.id, {});

    Logger.debug("Actor data reset");

    this.actionHandler.hardResetActionHandler();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetActorData" } };
    this.update(trigger);
  }

  /**
   * Reset all actor data
   * @public
   */
  async resetAllActorData() {
    Logger.debug("Resetting all actor data...");

    for (const actor of game.actors) {
      Logger.debug(`Resetting flags for actor [${actor.id}]`, { actor });
      await DataHandler.saveDataAsGm("actor", actor.id, {});
    }

    Logger.debug("All actor data reset");
    this.actionHandler.hardResetActionHandler();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetAllActorData" } };
    this.update(trigger);
  }

  /**
   * Reset user data
   * @public
   */
  async resetUserData() {
    Logger.debug("Resetting user data...");
    await DataHandler.saveDataAsGm("user", game.userId, {});
    Logger.debug("User data reset");
    this.actionHandler.hardResetActionHandler();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetUserData" } };
    this.update(trigger);
  }

  /**
   * Reset all user data
   * @public
   */
  async resetAllUserData() {
    Logger.debug("Resetting all user data...");
    for (const user of game.users) {
      await DataHandler.saveDataAsGm("user", user.id, {});
    }
    Logger.debug("All user data reset");
    this.actionHandler.hardResetActionHandler();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetAllUserData" } };
    this.update(trigger);
  }

  /**
   * Reset user and actor data
   */
  async resetUserAndActorData() {
    Logger.debug("Resetting user data...");
    await DataHandler.saveDataAsGm("user", game.userId, {});
    Logger.debug("User data reset");

    Logger.debug("Resetting actor data...");
    await DataHandler.saveDataAsGm("actor", this.actor.id, {});
    Logger.debug("Actor data reset");

    this.actionHandler.hardResetActionHandler();
    const trigger = { trigger: { type: "method", name: "TokenActionHud#resetUserAndActorData" } };
    this.update(trigger);
  }

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

  /**
   * Perform the HUD update following handling
   * @param {object} trigger The trigger for the update
   */
  async #performUpdate(trigger) {
    this.isUpdating = true;
    Logger.debug("Updating HUD...", trigger);

    const previousActorId = this.actor?.id;
    const controlledTokens = Utils.getControlledTokens();
    const character = this.#getCharacter(controlledTokens);
    const multipleTokens = controlledTokens.length > 1 && !character;

    if ((!character && !multipleTokens) || !this.isHudEnabled) {
      this.#abortUpdate("HUD update aborted as no character(s) found or HUD is disabled");
      return;
    }

    const options = (trigger === "controlToken" && previousActorId !== this.actor?.id) ? { saveActor: true } : {};
    this.hud = await this.actionHandler.buildHud(options);

    if (this.actionHandler.availableActionsMap.size === 0) {
      this.#abortUpdate("HUD update aborted as action list empty");
      return;
    }

    this.rendering = true;
    this.render(true);

    if (!ui.windows[this.appId]) {
      ui.windows[this.appId] = this;
    }

    this.isUpdating = false;

    Hooks.callAll("tokenActionHudCoreHudUpdated", this.module);
    Logger.debug("HUD updated");
  }

  /**
   * Abort the HUD update with a debug message
   * @param {string} message The debug message to log
   * @private
   */
  #abortUpdate(message) {
    this.#close();
    Logger.debug(`HUD update aborted: ${message}`);
    this.isUpdating = false;
  }

  /**
   * Close the HUD
   * @private
   */
  #close() {
    this.openGroups = new Set();
    this.close({ animate: false });
  }

  /**
   * Whether the token change is valid for a HUD update
   * @public
   * @param {object} token The token
   * @param {object} data  The data
   * @returns {boolean}    Whether the token change is valid for a HUD update
   */
  isValidTokenChange(token, data = null) {
    if (data.flags) return false;
    return this.#isRelevantToken(token) || (this.alwaysShowSetting && token.actorId === game.user.character?.id);
  }

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
        || (!controlledTokens?.length && canvas?.tokens?.placeables?.some(token => token.id === this.hud?.tokenId))
    );
  }

  /**
   * Whether the given actor is the selected actor
   * @param {object} actor The actor
   * @returns {boolean}    Whether the given actor is the selected actor
   */
  isSelectedActor(actor) {
    return !actor?.id || actor?.id === this.actor?.id;
  }

  /**
   * Whether the actor or item update is valid for a HUD update
   * @param {object} actor The actor
   * @param {object} data  The data
   * @returns {boolean}    Whether the actor or item update is valid for a HUD update
   */
  isValidActorOrItemUpdate(actor, data) {
    if (!this.isSelectedActor(actor)) return false;

    if (!actor) {
      Logger.debug("No actor, update hud", { data });
      return true;
    }

    if (this.hud && actor.id === this.hud.actorId) {
      Logger.debug("Same actor, update hud", { actor, data });
      return true;
    }

    Logger.debug("Different actor, do not update hud", { actor, data });
    return false;
  }

  /**
   * Whether the hud is enabled for the current user
   * @private
   * @returns {boolean} Whether the hud is enabled for the current user
   */
  get isHudEnabled() {
    if (!this.enableSetting) return false;
    if (game.user.isGM) return true;
    return Utils.checkAllow(game.user.role, this.allowSetting);
  }

  /**
   * Get character from controlled tokens
   * @private
   * @param {Array} [controlled = []] The controlled tokens
   * @returns {object|null}           The character
   */
  #getCharacter(controlled = []) {
    if (controlled.length > 1) {
      this.#handleMultipleTokens(controlled);
      return null;
    }
    return this.#handleSingleToken(controlled);
  }

  /**
   * Handle multiple controlled tokens
   * @param {*} controlled
   */
  #handleMultipleTokens(controlled) {
    this.actionHandler.characterName = game.i18n.localize("tokenActionHud.multiple");

    this.token = null;
    this.actor = null;
    this.actionHandler.token = null;
    this.actionHandler.actor = null;
    this.rollHandler.token = null;
    this.rollHandler.actor = null;

    const tokens = controlled;
    const actors = Utils.getControlledActors();

    this.actionHandler.tokens = tokens;
    this.actionHandler.actors = actors;
    this.rollHandler.tokens = tokens;
    this.rollHandler.actors = actors;
  }

  /**
   * Handle a single controlled token
   * @private
   * @param {Array} controlled The controlled tokens
   * @returns {object|null}    The character
   */
  #handleSingleToken(controlled) {
    const character = { token: null, actor: null };

    if (controlled.length === 1 && this.#isValidCharacter(controlled[0])) {
      character.token = controlled[0];
      character.actor = character.token?.actor;
    } else if (controlled.length === 0 && game.user.character && this.alwaysShowSetting) {
      character.actor = game.user.character;
      character.token = canvas.tokens?.placeables.find(t => t.actor?.id === character.actor.id) ?? null;
    }

    if (!character.actor) return null;

    this.actionHandler.characterName = character.token?.name ?? character.actor.name;

    this.token = character.token;
    this.actor = character.actor;
    this.actionHandler.token = character.token;
    this.actionHandler.actor = character.actor;
    this.actionHandler.tokens = [character.token];
    this.actionHandler.actors = [character.actor];
    this.rollHandler.token = character.token;
    this.rollHandler.actor = character.actor;
    this.rollHandler.tokens = [character.token];
    this.rollHandler.actors = [character.actor];

    return character;
  }

  /**
   * Whether the character is a valid selection for the current user
   * @private
   * @param {object} [token = {}] The token
   * @returns {boolean}           Whether the character is a valid selection for the current user
   */
  #isValidCharacter(token = {}) {
    return game.user.isGM || token.actor?.testUserPermission(game.user, "OWNER");
  }
}

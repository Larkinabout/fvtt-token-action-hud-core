import { TagDialogHelper } from "./application/tag-dialog-helper.js";
import { GroupResizer } from "./group-resizer.js";
import { DataHandler } from "./data-handler.js";
import { MODULE, SETTING, TEMPLATE } from "./constants.js";
import { Logger, Timer, Utils } from "./utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Token Action HUD application
 */
export class TokenActionHud extends HandlebarsApplicationMixin(ApplicationV2) {
  // Set defaults
  openGroups = [];

  defaults = {};

  defaultHeight = 200;

  defaultWidth = 20;

  defaultLeftPos = 150;

  defaultTopPos = 80;

  leftPos = this.defaultLeftPos;

  topPos = this.defaultTopPos;

  defaultScale = 1;

  refreshTimeout = null;

  rendering = false;

  tokens = null;

  isUpdatePending = false;

  isUpdating = false;

  updatePendingTimer = new Timer(10);

  updateTimer = new Timer(10);

  constructor(module, systemManager) {
    super();
    this.module = MODULE;
    this.systemManager = systemManager;
    this.autoDirection = "down";
    this.directionSetting = "down";
    this.alwaysShowSetting = false;
    this.clickOpenCategorySetting = false;
    this.isCollapsed = false;
    this.enableCustomizationSetting = false;
    this.dragSetting = "whenUnlocked";
    this.enableSetting = false;
    this.isHudEnabled = false;
    this.gridSetting = false;
    this.isUnlocked = false;
    this.styleSetting = null;
  }

  /**
   * Merge Token Action Hud's default options with Application
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
      width: this.defaultWidth,
      height: this.defaultHeight,
      left: this.defaultLeftPos,
      top: this.defaultTopPos,
      scale: this.defaultScale
    },
    window: {
      frame: false,
      title: "token-action-hud"
    },
    zIndex: 100
  };

  static PARTS = {
    form: {
      template: TEMPLATE.hud
    }
  };

  /**
   * Initialise the HUD
   * @public
   */
  async init() {
    this.activeCssAsTextSetting = Utils.getSetting("activeCssAsText");
    this.allowSetting = Utils.getSetting("allow");
    this.alwaysShowSetting = Utils.getSetting("alwaysShowHud");
    this.clickOpenCategorySetting = Utils.getSetting("clickOpenCategory");
    this.directionSetting = Utils.getSetting("direction");
    this.debugSetting = Utils.getSetting("debug");
    this.displayIconsSetting = Utils.getSetting("displayIcons");
    this.dragSetting = Utils.getSetting("drag");
    this.enableCustomizationSetting = Utils.getSetting("enableCustomization");
    this.enableSetting = Utils.getSetting("enable");
    this.gridSetting = Utils.getSetting("grid");
    this.scaleSetting = Utils.getSetting("scale");
    this.styleSetting = Utils.getSetting("style");

    this.isCollapsed = Utils.getUserFlag("isCollapsed");
    this.isHudEnabled = this.#getHudEnabled();
    this.hudPosition = Utils.getUserFlag("position");
    this.isUnlocked = Utils.getUserFlag("isUnlocked");

    await this.systemManager.registerDefaultsCore();

    this.dataHandler = new DataHandler();
    await this.dataHandler.init();

    this.actionHandler = await this.systemManager.getActionHandlerCore();
    this.actionHandler.customLayoutSetting = Utils.getSetting("customLayout");
    this.actionHandler.userCustomLayoutFlag = Utils.getUserFlag("userCustomLayout");
    this.actionHandler.enableCustomizationSetting = this.enableCustomizationSetting;
    this.actionHandler.displayCharacterNameSetting = Utils.getSetting("displayCharacterName");
    this.actionHandler.sortActionsSetting = Utils.getSetting("sortActions");
    this.actionHandler.tooltipsSetting = Utils.getSetting("tooltips");

    this.GroupResizer = new GroupResizer();
    this.rollHandler = this.systemManager.getRollHandlerCore();
  }

  /**
   * Update Token Action HUD following change to module settings
   * @param key
   * @param value
   * @public
   */
  async updateSettings(key, value = null) {
    if (!this.updateSettingsPending) {
      this.updateSettingsPending = true;
      Logger.debug("Updating settings...");
    }

    const setting = SETTING[key];
    const variable = setting?.variable;
    if (variable) {
      if (setting.classes.includes("TokenActionHud")) this[variable] = value;
      if (setting.classes.includes("ActionHandler")) this.actionHandler[variable] = value;
    }

    switch (key) {
      case "allow":
      case "enable":
        this.isHudEnabled = this.#getHudEnabled();
        break;
      case "customLayout":
      case "userCustomLayout":
        this.actionHandler.customLayout = null;
        break;
      case "rollHandler":
        this.updateRollHandler();
        break;
    }
  }

  /**
   * Update the RollHandler
   * @public
   */
  updateRollHandler() {
    this.rollHandler = this.systemManager.getRollHandlerCore();
  }

  /**
   * Whether the HUD can be dragged
   * @returns {boolean} Whether the HUD can be dragged
   */
  get isDraggable() {
    return ((this.dragSetting === "always") || (this.dragSetting === "whenUnlocked" && this.isUnlocked));
  }

  /**
   * Get Token Action Hud scale
   * @private
   * @returns {number} The scale
   */
  #getScale() {
    const scale = parseFloat(this.scaleSetting);
    if (scale < 0.5) return 0.5;
    if (scale > 2) return 2;
    return scale;
  }

  /**
   * Get data
   * @override
   */
  async _prepareContext() {
    const context = {
      hud: this.hud,
      id: "token-action-hud",
      style: game.tokenActionHud.systemManager.styles[this.styleSetting].class ?? "",
      scale: this.#getScale(),
      background: "#00000000"
    };

    Logger.debug("Application context", { context });

    return context;
  }

  static editHud() {
    TagDialogHelper.showHudDialog(this.actionHandler);
  }

  /**
   * Unlock the HUD
   * @param {object} event
   */
  static async unlockHud(event = null) {
    if (event) {
      event.preventDefault();
    }

    this.elements.unlockButton.classList.add("tah-hidden");
    this.elements.lockButton.classList.remove("tah-hidden");
    this.elements.editHudButton.classList.remove("tah-hidden");
    this.elements.groupArr.forEach(element => element.classList.remove("tah-hidden"));
    this.elements.groupButtonArr.forEach(element => element.classList.remove("disable-edit"));
    this.elements.groups.classList.remove("tah-unlocked");
    this.elements.listGroupsArr.forEach(element => element.classList.remove("tah-hidden"));
    this.elements.tabGroupArr.forEach(element => element.classList.remove("tah-hidden"));
    this.elements.subtitleArr.forEach(element => element.classList.remove("disable-edit", "tah-hidden"));

    if (!this.isUnlocked) {
      await Utils.setUserFlag("isUnlocked", true);
      this.isUnlocked = true;
    }
  }

  /**
   * Lock the HUD
   * @param {object} event
   */
  static async lockHud(event = null) {
    if (event) {
      event.preventDefault();
    }
    this.elements.lockButton.classList.add("tah-hidden");
    this.elements.unlockButton.classList.remove("tah-hidden");
    this.elements.editHudButton.classList.add("tah-hidden");
    this.elements.groups.classList.remove("tah-unlocked");
    for (const topGroupElement of this.elements.tabGroupArr) {
      const hasActions = (topGroupElement.getElementsByClassName("tah-action").length > 0);
      if (!hasActions) topGroupElement.classList.add("tah-hidden");
    }
    for (const groupElement of this.elements.groupArr) {
      const hasActions = (groupElement.getElementsByClassName("tah-action").length > 0);
      if (!hasActions) groupElement.classList.add("tah-hidden");
    }
    for (const listGroupsElement of this.elements.listGroupsArr) {
      const hasActions = (listGroupsElement.getElementsByClassName("tah-action").length > 0);
      if (!hasActions) listGroupsElement.classList.add("tah-hidden");
    }
    for (const subtitleElement of this.elements.subtitleArr) {
      const groupElement = subtitleElement.closest(".tah-group");
      if (groupElement?.dataset?.showTitle === "false") {
        subtitleElement.classList.add("tah-hidden");
      }
    }
    this.elements.groupButtonArr.forEach(element => element.classList.add("disable-edit"));
    this.elements.subtitleArr.forEach(element => element.classList.add("disable-edit"));
    if (this.isUnlocked) {
      await Utils.setUserFlag("isUnlocked", false);
      this.isUnlocked = false;
    }
  }

  /**
   * Collapse the HUD
   * @param {object} event The event
   */
  static collapseHud(event = null) {
    if (event) {
      event.preventDefault();
      event = event || window.event;
    }
    this.elements.collapseHudButton.classList.add("tah-hidden");
    this.elements.expandHudButton.classList.remove("tah-hidden");
    this.elements.groups.classList.add("tah-hidden");
    this.elements.buttons.classList.add("tah-hidden");
    if (!this.isCollapsed) {
      Utils.setUserFlag("isCollapsed", true);
      this.isCollapsed = true;
    }
  }

  /**
   * Expand the HUD
   * @param {object} event The event
   */
  static expandHud(event = null) {
    if (event) {
      event.preventDefault();
      event = event || window.event;
    }
    this.elements.expandHudButton.classList.add("tah-hidden");
    this.elements.collapseHudButton.classList.remove("tah-hidden");
    this.elements.groups.classList.remove("tah-hidden");
    this.elements.buttons.classList.remove("tah-hidden");
    if (this.isCollapsed) {
      Utils.setUserFlag("isCollapsed", false);
      this.isCollapsed = false;
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
   * Click a subtitle
   * @param {object} event The event
   */
  static clickSubgroup(event) {
    // When a subcategory title is right-clicked...
    if (event.type === "contextmenu") {
      if (this.isUnlocked) {
        this.openActionDialog(event);
      } else {
        this.groupClick(event);
      }
    } else {
      if (event.target.classList.contains("tah-button-text")) return;
      this.collapseExpandGroup(event, this.enableCustomizationSetting);
    }
  }

  /**
   * Click an action
   * @param {object} event The event
   */
  static clickAction(event) {
    // When an action is clicked or right-clicked...
    event.preventDefault();
    const button = event.target.closest(".tah-action-button");
    const value = button?.value;
    if (!value) return;
    try {
      this.rollHandler.handleActionClickCore(event, value, this.actionHandler);
      event.currentTarget.blur();
    } catch(error) {
      Logger.error(event);
    }
  }

  /**
   * Toggle the group
   * @param {object} event The event
   */
  toggleGroup(event) {
    const group = event.target.closest(".tah-tab-group") ?? event.target.closest("tah-group");
    if (group.classList.contains("hover")) {
      this.closeGroup(event, group);
    } else {
      const groupElements = group.parentElement.querySelectorAll(".tah-tab-group");
      for (const groupElement of groupElements) {
        groupElement.classList.remove("hover");
        this.#deleteOpenGroup(groupElement.id);
      }
      this.openGroup(event, group);
    }
    // Remove focus to allow core ESC interactions
    event.currentTarget.blur();
  }

  /**
   * Collapse/expand group
   * @param {object} event                       The event
   * @param {boolean} enableCustomizationSetting Whether customization is enabled
   */
  collapseExpandGroup(event, enableCustomizationSetting) {
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
      this.GroupResizer.resizeGroup(this.actionHandler, tabGroup, this.autoDirection, this.gridSetting);
    } else {
      toggleGroupVisibility();
      saveGroupSettings(true);
    }
  }

  /**
   * Close the group
   * @param {object} event The event
   * @param {object} group The group
   */
  closeGroup(event, group = null) {
    if (game.tokenActionHud.rendering) return;
    if (!group) group = event.target.closest(".tah-tab-group") ?? event.target.closest("tah-group");
    group.classList.remove("hover");
    const closestGroupElement = group.closest(".tah-group");
    let sibling = closestGroupElement?.nextElementSibling;
    while (sibling) {
      if (sibling.classList.contains("tah-group")) {
        sibling.classList.remove("tah-hidden");
      }
      sibling = sibling.nextElementSibling;
    }
    this.#deleteOpenGroup(group.id);
  }

  /**
   * Open the group
   * @param {object} event The event
   * @param {object} group The group
   */
  openGroup(event, group) {
    if (!group) group = event.target.closest(".tah-tab-group") ?? event.target.closest("tah-group");
    group.classList.add("hover");
    const closestGroupElement = group.closest(".tah-tab-group") ?? group.closest(".tah-group");
    let sibling = closestGroupElement?.nextElementSibling;
    while (sibling) {
      if (sibling.classList.contains("tah-group")) {
        sibling.classList.add("tah-hidden");
      }
      sibling = sibling.nextElementSibling;
    }
    this.GroupResizer.resizeGroup(this.actionHandler, group, this.autoDirection, this.gridSetting);
    this.#addOpenGroup(group.id);
  }

  /**
   * Group click
   * @param {object} event The event
   */
  groupClick(event) {
    const target = (event.target.classList.contains("tah-button-text"))
    || (event.target.classList.contains("tah-button-image"))
    || (event.target.classList.contains("tah-group-button"))
      ? event.target.closest(".tah-tab-group")
      : event.target.closest(".tah-group");
    if (!target?.dataset?.nestId) return;
    const nestId = target?.dataset?.nestId;
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
    if (!target?.parentElement?.dataset?.nestId) return;

    const nestId = target?.parentElement?.dataset?.nestId;
    const name = target?.parentElement?.dataset?.name ?? target.innerText ?? target.outerText;
    const level = parseInt(target?.parentElement?.dataset?.level) || null;
    const type = target?.parentElement?.dataset?.type;

    TagDialogHelper.showGroupDialog(
      this.actionHandler,
      { nestId, name, level, type }
    );
  }

  /**
   * Open the Action dialog
   * @param {object} event The event
   */
  openActionDialog(event) {
    const target = (event.target.classList.contains("tah-button-text"))
      || (event.target.classList.contains("tah-button-image"))
      || (event.target.classList.contains("tah-group-button"))
      ? event.target.closest(".tah-tab-group")
      : event.target.closest(".tah-group");
    if (!target?.dataset?.nestId) return;
    const nestId = target?.dataset?.nestId;
    const name = this.actionHandler.groups[nestId].name;
    const level = parseInt(target?.dataset?.level) || null;
    const type = target?.dataset?.type;

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
   * Activate listeners
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);
    this.elements = {
      actionArr: this.element.querySelectorAll(".tah-action"),
      buttons: this.element.querySelector("#tah-buttons"),
      tabGroupArr: this.element.querySelectorAll(".tah-tab-group"),
      groups: this.element.querySelector("#tah-groups"),
      editHudButton: this.element.querySelector("#tah-edit-hud"),
      listGroupsArr: this.element.querySelectorAll(".tah-list-groups"),
      groupArr: this.element.querySelectorAll(".tah-group"),
      subtitleArr: this.element.querySelectorAll(".tah-subtitle"),
      groupButtonArr: this.element.querySelectorAll(".tah-group-button"),
      collapseHudButton: this.element.querySelector("#tah-collapse-hud"),
      expandHudButton: this.element.querySelector("#tah-expand-hud"),
      unlockButton: this.element.querySelector("#tah-unlock"),
      lockButton: this.element.querySelector("#tah-lock")
    };

    // Bind event listeners
    this.#addHoverEvents(this.elements);

    // Set initial collapsed state
    if (this.isCollapsed) { TokenActionHud.collapseHud.call(this); }

    // Set initial lock state
    if (this.isUnlocked && this.enableCustomizationSetting) {
      TokenActionHud.unlockHud.call(this);
    } else {
      TokenActionHud.lockHud.call(this);
    }

    if (!this.enableCustomizationSetting) {
      this.elements.unlockButton.classList.add("tah-hidden");
    }
  }

  /**
   * Post-render HUD
   */
  postRender() {
    this.rendering = false;
    this.#applySettings();
    this.#reopenGroups();

    // Resize category
    this.openGroups.forEach(groupId => {
      const group = this.element.querySelector(`#${groupId}`);
      if (group) {
        this.GroupResizer.resizeGroup(this.actionHandler, group, this.autoDirection, this.gridSetting);
      }
    });
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
        element.addEventListener("pointerenter", this.openGroup.bind(this));
        element.addEventListener("pointerleave", this.closeGroup.bind(this));
        element.addEventListener("mouseleave", this.closeGroup.bind(this));
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

      this.#applySettings();

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
  #getAutoDirection() {
    if (this.directionSetting === "up" || (this.directionSetting === "auto" && this.topPos > window.innerHeight / 2)) return "up";
    return "down";
  }

  /**
   * Apply settings
   * @private
   */
  #applySettings() {
    this.autoDirection = this.#getAutoDirection();
    if (this.autoDirection === "up") {
      $(document).find(".tah-groups-container").removeClass("expand-down");
      $(document).find(".tah-groups-container").addClass("expand-up");
      $(document).find(".tah-groups-container").removeClass("expand-down");
      $(document).find(".tah-groups-container").addClass("expand-up");
      $(document).find("#tah-character-name").addClass("tah-hidden");
    } else {
      $(document).find(".tah-groups-container").addClass("expand-down");
      $(document).find(".tah-groups-container").removeClass("expand-up");
      $(document).find(".tah-groups-container").addClass("expand-down");
      $(document).find(".tah-groups-container").removeClass("expand-up");
      $(document).find("#tah-character-name").removeClass("tah-hidden");
    }
  }

  /**
   * Set position of the HUD
   * @public
   */
  setPosition() {
    if (!this.hud) return;
    this.#setPositionFromFlag();
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
   * Set hovered group
   * @private
   * @param {string} groupId The group id
   */
  #addOpenGroup(groupId) {
    this.openGroups.add(groupId);
  }

  /**
   * Clear hovered group
   * @private
   * @param {string} groupId The group id
   */
  #deleteOpenGroup(groupId) {
    this.openGroups.delete(groupId);
  }

  /**
   * Restore the open state of HD groups
   * @param {Event|null} event
   * @private
   */
  #reopenGroups(event = null) {
    if (!this.openGroups.size) return;

    this.openGroups.forEach(groupId => {
      const group = this.element.querySelector(`#${groupId}`);
      if (group) {
        this.openGroup(event, group);
      }
    });
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
   * @public
   */
  async resetDialog() {
    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("tokenActionHud.dialog.resetLayout.title")
      },
      content: `<p>${game.i18n.localize("tokenActionHud.dialog.resetLayout.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("tokenActionHud.dialog.button.yes"),
        callback: async () => {
          const customLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=customLayout]");
          if (customLayoutElement) {
            await this.updateSettings("customLayout", customLayoutElement?.value ?? "");
            await Utils.setSetting("customLayout", customLayoutElement?.value ?? "");
          }
          const userCustomLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=userCustomLayout]");
          if (userCustomLayoutElement) {
            await this.updateSettings("userCustomLayout", userCustomLayoutElement?.value ?? "");
            await Utils.setUserFlag("userCustomLayout", userCustomLayoutElement?.value ?? "");
          }
          await TokenActionHud.reset();
          Logger.info("Layout reset", true);
        }
      },
      no: {
        label: game.i18n.localize("tokenActionHud.dialog.button.no")
      }
    });
  }

  /**
   * Reset all HUD layouts for everyone
   * @public
   */
  async resetAllDialog() {
    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("tokenActionHud.dialog.resetAllLayouts.title")
      },
      content: `<p>${game.i18n.localize("tokenActionHud.dialog.resetAllLayouts.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("tokenActionHud.dialog.button.yes"),
        callback: async () => {
          const customLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=customLayout]");
          if (customLayoutElement) {
            await Utils.setSetting("customLayout", customLayoutElement?.value ?? "");
          }
          const userCustomLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=userCustomLayout]");
          if (userCustomLayoutElement) {
            await Utils.setUserFlag("userCustomLayout", userCustomLayoutElement?.value ?? "");
          }
          await game.tokenActionHud.socket.executeForEveryone("reset");
          Logger.info("All layouts reset", true);
        }
      },
      no: {
        label: game.i18n.localize("tokenActionHud.dialog.button.no")
      }
    });
  }

  static async reset() {
    Logger.debug("Resetting layout...");
    await game?.tokenActionHud?.resetUserAndActorData();
    game?.tokenActionHud?.resetPosition();
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
      this.#close();
      Logger.debug("HUD update aborted as no character(s) found or HUD is disabled");
      this.isUpdating = false;
      return;
    }

    const options = (trigger === "controlToken" && previousActorId !== this.actor?.id) ? { saveActor: true } : {};
    this.hud = await this.actionHandler.buildHud(options);

    if (this.actionHandler.availableActionsMap.size === 0) {
      this.#close();
      Logger.debug("HUD update aborted as action list empty");
      this.isUpdating = false;
      return;
    }

    this.rendering = true;
    this.render(true);
    if (!ui.windows[this.appId]) {
      ui.windows[this.appId] = this;
    }

    this.#reopenGroups();

    this.isUpdating = false;

    Hooks.callAll("tokenActionHudCoreHudUpdated", this.module);
    Logger.debug("HUD updated");
  }

  /**
   * Close HUD
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
   * Whether the character is a valid selection for the current user
   * @private
   * @param {object} [token = {}] The token
   * @returns {boolean}           Whether the character is a valid selection for the current user
   */
  #isValidCharacter(token = {}) {
    return game.user.isGM || token.actor?.testUserPermission(game.user, "OWNER");
  }

  /**
   * Whether the hud is enabled for the current user
   * @private
   * @returns {boolean} Whether the hud is enabled for the current user
   */
  #getHudEnabled() {
    if (!this.enableSetting) return false;
    if (game.user.isGM) return true;
    return Utils.checkAllow(game.user.role, this.allowSetting);
  }

  /**
   * Get character from selected tokens
   * @private
   * @param {Array} [controlled = []] The controlled tokens
   * @returns {object|null}           The character
   */
  #getCharacter(controlled = []) {
    if (controlled.length > 1) {
      const actors = Utils.getControlledActors();
      const tokens = controlled;
      this.actor = null;
      this.token = null;
      this.actionHandler.characterName = "Multiple";
      this.actionHandler.actor = null;
      this.actionHandler.actors = actors;
      this.actionHandler.token = null;
      this.actionHandler.tokens = tokens;
      this.rollHandler.actor = null;
      this.rollHandler.actors = actors;
      this.rollHandler.token = null;
      this.rollHandler.tokens = tokens;
      return null;
    }

    const character = { token: null, actor: null };
    if (controlled.length === 1) {
      const token = controlled[0];
      const actor = token.actor;

      if (!this.#isValidCharacter(token)) return null;

      character.token = token;
      character.actor = actor;
    } else if (controlled.length === 0 && game.user.character && this.alwaysShowSetting) {
      character.actor = game.user.character;
      character.token = canvas.tokens?.placeables.find(t => t.actor?.id === character.actor.id) ?? null;
    }

    if (!character.actor) return null;

    this.actor = character.actor;
    this.token = character.token;
    this.actionHandler.characterName = character.token?.name ?? character.actor.name;
    this.actionHandler.actor = character.actor;
    this.actionHandler.actors = [character.actor];
    this.actionHandler.token = character.token;
    this.actionHandler.tokens = [character.token];
    this.rollHandler.actor = character.actor;
    this.rollHandler.actors = [character.actor];
    this.rollHandler.token = character.token;
    this.rollHandler.tokens = [character.token];
    return character;
  }
}

import { DELIMITER } from "../../core/constants.mjs";
import { Logger, Utils } from "../../core/utils.mjs";

/**
 * Resolves core actions triggered from the HUD
 */
export class RollHandler {
  actor = null;

  token = null;

  delimiter = DELIMITER;

  preRollHandlers = [];

  rollHandlerExtenders = [];

  /* -------------------------------------------- */

  /**
   * Throw error
   * @public
   * @param {*} err The error
   */
  throwInvalidValueErr(err) {
    throw new Error(
      `Error handling button click: ${err}`
    );
  }

  /**
   * Handle action events
   * @public
   * @param {object} event The event
   */
  async handleActionClickCore(event) {
    Logger.debug("Handling action click event", { event });

    // Update variables with current action context
    this.actor = this.actionHandler.actor;
    this.token = this.actionHandler.token;
    this.action = this.getAction(event);

    this.registerKeyPresses(event);
    const buttonValue = this.getButtonValue(event);

    let handled = false;
    this.preRollHandlers.forEach(handler => {
      if (handled) return;
      handler.action = this.action;
      handled = handler.prehandleActionEvent(event, buttonValue, this.actionHandler);
    });

    if (handled) return;

    if (this.#isGenericAction()) {
      await this.#handleGenericActionClick();
    } else {
      this.handleActionClick(event, buttonValue);
    }
  }

  /* -------------------------------------------- */

  /**
   * Overide for the TAH system module
   * @override
   * @param {object} event       The event
   * @param {string} buttonValue The button value
   */
  handleActionClick(event, buttonValue) {}

  /* -------------------------------------------- */

  /**
   * Handle action hover events
   * @param {object} event        The event
   */
  async handleActionHoverCore(event) {
    Logger.debug("Handling action hover event", { event });

    // Update variables with current action context
    this.actor = this.actionHandler.actor;
    this.token = this.actionHandler.token;
    this.action = this.getAction(event);

    this.registerKeyPresses(event);
    const buttonValue = this.getButtonValue(event);

    this.handleActionHover(event, buttonValue);
  } 

  /* -------------------------------------------- */

  /**
   * Overide for the TAH system module
   * @override
   * @param {object} event       The event
   * @param {string} buttonValue The button value
   */
  handleActionHover(event, buttonValue) {}

  /* -------------------------------------------- */

  /**
   * Handle group click events
   * @param {object} event        The event
   * @param {string} nestId       The nest ID
   */
  async handleGroupClickCore(event, nestId) {
    Logger.debug(`Handling click event for group [${nestId}]`, { event });

    // Update variables with current action context
    this.actor = this.actionHandler.actor;
    this.token = this.actionHandler.token;

    const group = this.groupHandler.getGroup({ nestId });

    this.registerKeyPresses(event);

    this.handleGroupClick(event, group);
  }

  /* -------------------------------------------- */

  /**
   * Overide for the TAH system module
   * @override
   * @param {object} event The event
   * @param {object} group The group
   */
  handleGroupClick(event, group) {}

  /* -------------------------------------------- */

  /**
   * Add a pre-roll handler
   * @public
   * @param {object} handler The roll handler
   */
  addPreRollHandler(handler) {
    Logger.debug(`Adding pre-roll handler ${handler.constructor.name}`);
    this.preRollHandlers.push(handler);
  }

  /* -------------------------------------------- */

  /**
   * Get button value
   * @param {object} event  The event
   * @returns {string}      The button value
   */
  getButtonValue(event) {
    if (!event) return null;
    const buttonElement = event.target.querySelector(".tah-action-button") ?? event.target.closest(".tah-action-button");
    return buttonElement?.value || null;
  }

  /* -------------------------------------------- */

  /**
   * Get the action from the action ID on thee button
   * @param {object} event  The event
   * @returns {object}      The action
   */
  getAction(event) {
    if (!event) return {};
    const actionButtonElement = event.target.closest('[data-part="actionButton"]')
      ?? event.target.querySelector('[data-part="actionButton"]');
    const actionId = actionButtonElement?.dataset?.actionId;
    if (!actionId) return {};
    return this.actionHandler.availableActions.get(actionId) || {};
  }

  /* -------------------------------------------- */

  /**
   * Registers key presses
   * @public
   * @param {object} event The events
   */
  registerKeyPresses(event) {
    this.rightClick = this.isRightClick(event);
    this.ctrl = this.isCtrl(event);
    this.alt = this.isAlt(event);
    this.shift = this.isShift(event);
  }

  /* -------------------------------------------- */

  /**
   * Renders the item sheet
   * @public
   * @param {object} actor  The actor
   * @param {string} itemId The item id
   * @returns {boolean}     Whether the item was rendered
   */
  renderItem(actor, itemId) {
    // If actor is not specified, use the RollHandler's actor
    if (!actor) {
      actor = this.actor;
    }

    // Get the item
    const item = Utils.getItem(actor, itemId);

    // If the item is not found, return false
    if (!item) return false;

    // Render the item and return true
    item.sheet.render(true);
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Whether the item sheet should be rendered
   * @public
   * @returns {boolean}
   */
  isRenderItem() {
    return (
      this.rightClick
            && !(this.alt || this.ctrl || this.shift)
    );
  }

  /* -------------------------------------------- */

  /**
   * Whether the button was right-clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  isRightClick(event) {
    const button = event?.originalEvent?.button || event.button;
    return button === 2;
  }

  /* -------------------------------------------- */

  /**
   * Whether the ALT key was pressed when the button was clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  isAlt(event) {
    const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT);
    if (event.altKey && !isModiferActive) {
      Logger.debug("Emulating LEFT ALT key press");
      KeyboardManager.emulateKeypress(false, "AltLeft", { altKey: true, force: true });
      game.keyboard.downKeys.add("AltLeft");
      return true;
    }
    return isModiferActive;
  }

  /* -------------------------------------------- */

  /**
   * Whether the CTRL key was pressed when the button was clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  isCtrl(event) {
    const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL);
    if (event.ctrlKey && !isModiferActive) {
      Logger.debug("Emulating LEFT CTRL key press");
      KeyboardManager.emulateKeypress(false, "ControlLeft", { ctrlKey: true, force: true });
      game.keyboard.downKeys.add("ControlLeft");
      return true;
    }
    return isModiferActive;
  }

  /* -------------------------------------------- */

  /**
   * Whether the SHIFT key was pressed when the button was clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  isShift(event) {
    const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
    if (event.shiftKey && !isModiferActive) {
      Logger.debug("Emulating LEFT SHIFT key press");
      KeyboardManager.emulateKeypress(false, "ShiftLeft", { shiftKey: true, force: true });
      game.keyboard.downKeys.add("ShiftLeft");
      return true;
    }
    return isModiferActive;
  }

  /* -------------------------------------------- */

  /**
   * Whether the action is a generic action
   * @private
   * @returns {boolean} Whether the action is a generic action
   */
  #isGenericAction() {
    const { actionType } = this.action.system;
    return actionType === "utility" && this.action.id.includes("toggle");
  }

  /* -------------------------------------------- */

  /**
   * Handle generic action
   * @private
   */
  async #handleGenericActionClick() {
    const firstControlledToken = Utils.getFirstControlledToken();

    if (this.action.id === "toggleVisibility") await firstControlledToken.toggleVisibility();
    if (this.action.id === "toggleCombat") await firstControlledToken.toggleCombat();

    Hooks.callAll("forceUpdateTokenActionHud");
  }
}

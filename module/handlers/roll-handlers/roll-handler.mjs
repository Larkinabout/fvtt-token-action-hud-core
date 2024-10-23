import { DELIMITER } from "../../core/constants.mjs";
import { Logger, Utils } from "../../core/utils.mjs";

/**
 * Resolves core actions triggered from the HUD
 */
export class RollHandler {
  constructor() {
    this.hudManager = null;
    this.delimiter = DELIMITER;
    this.preRollHandlers = [];
    this.rollHandlerExtenders = [];
  }

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
   * @param {object} action The action
   */
  async handleActionClickCore(event, action) {
    try {
      Logger.debug("Handling action click event", { event });

      // Update variables with current action context
      this.action = action;

      // If the action has an onClick function, call it and trigger a HUD update
      if (typeof action?.onClick === "function") {
        action.onClick();
        Hooks.callAll("forceUpdateTokenActionHud");
        return;
      }

      // Get the value of the associated button
      const buttonValue = this.getButtonValue(event);

      // Check pre-handlers
      let handled = false;
      for (const handler of this.preRollHandlers) {
        if (handled) break;
        handler.action = this.action;
        handled = handler.prehandleActionEvent(event, buttonValue, this.actionHandler);
      }

      // If the action was not handled by the pre-handlers, call the default method
      if (!handled) {
        this.handleActionClick(event, buttonValue);
      }
    } catch(error) {
      Logger.error("Error handling action click event", { error, event, action });
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
   * @param {object} event  The event
   * @param {object} action The action
   */
  async handleActionHoverCore(event, action) {
    Logger.debug("Handling action hover event", { event });

    // Update variables with current action context
    this.action = action;

    if (typeof action?.onHover === "function") {
      action.onHover();
      return;
    }

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
   * @param {object} event The event
   * @param {group} group  The nest ID
   */
  async handleGroupClickCore(event, group) {
    Logger.debug(`Handling click event for group [${group.name}]`, { event });

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
    return (this.isRightClick && !(this.isAlt || this.isCtrl || this.isShift));
  }

  /* -------------------------------------------- */
  /* Shortcuts to the HudManager properties       */
  /* -------------------------------------------- */

  /**
   * Get actor
   * @returns {object} The actor
   */
  get actor() {
    return this.hudManager?.actor;
  }

  /* -------------------------------------------- */

  /**
   * Get actors
   * @returns {Array} The actors
   */
  get actors() {
    return this.hudManager?.actors;
  }

  /* -------------------------------------------- */

  /**
   * Get token
   * @returns {object} The token
   */
  get token() {
    return this.hudManager?.token;
  }

  /* -------------------------------------------- */

  /**
   * Get tokens
   * @returns {Array} The tokens
   */
  get tokens() {
    return this.hudManager?.tokens;
  }

  /* -------------------------------------------- */

  /**
   * Whether the right mouse button was clicked
   * @returns {boolean} Whether the right mouse button was clicked
   */
  get isRightClick() {
    return this.hudManager.isRightClick;
  }

  /* -------------------------------------------- */

  /**
   * Whether the ALT key was pressed
   * @returns {boolean} Whether the ALT key was pressed
   */
  get isAlt() {
    return this.hudManager.isAlt;
  }

  /* -------------------------------------------- */

  /**
   * Whether the CTRL key was pressed
   * @returns {boolean} Whether the CTRL key was pressed
   */
  get isCtrl() {
    return this.hudManager.isCtrl;
  }

  /* -------------------------------------------- */

  /**
   * Whether the SHIFT key was pressed
   * @returns {boolean} Whether the SHIFT key was pressed
   */
  get isShift() {
    return this.hudManager.isShift;
  }
}

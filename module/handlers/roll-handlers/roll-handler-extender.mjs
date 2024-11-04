import { RollHandler } from "./roll-handler.mjs";

/**
 * An extension of the base RollHandler which extends the actions that can be handled
 */
export class RollHandlerExtender extends RollHandler {
  constructor() {
    super();
  }

  /**
   * Pre-handle action event
   * @param {object} event        The event
   * @param {string} buttonValue  The button value
   * @param {class} actionHandler The ActionHandler instance
   * @returns {boolean}
   */
  prehandleActionEvent(event, buttonValue, actionHandler) {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle action click
   * @override
   * @param {object} event        The click event
   * @param {string} buttonValue  The button value
   * @param {class} actionHandler The ActionHandler instance
   * @returns {boolean}
   */
  handleActionClick(event, buttonValue, actionHandler) {
    return false;
  }
}

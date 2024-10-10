import { RollHandler } from "./roll-handler.js";

/**
 * An extension of the base RollHandler which extends the actions that can be handled
 */
export class RollHandlerExtender extends RollHandler {
  /**
   * Pre-handle action event
   * @param {object} event        The event
   * @param {string} encodedValue The action's encoded value
   * @param {class} actionHandler The action handler
   * @returns {boolean}
   */
  prehandleActionEvent(event, encodedValue, actionHandler) {
    return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle action click
   * @override
   * @param {object} event        The click event
   * @param {string} encodedValue The action's encoded value
   * @param {class} actionHandler The action handler
   * @returns {boolean}
   */
  handleActionClick(event, encodedValue, actionHandler) {
    return false;
  }
}

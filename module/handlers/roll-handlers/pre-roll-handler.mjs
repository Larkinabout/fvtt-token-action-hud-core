import { RollHandler } from "./roll-handler.mjs";

/*
 * Used for adding support for actions not part of the core functions.
 * Returns true from prehandleActionEvent() if it can perform an action and stops
 * further actions being performed.
 */
export class PreRollHandler extends RollHandler {
  /**
   * Pre-handle action event
   * @param {object} event        The event
   * @param {string} buttonValue  The button value
   * @param {class} actionHandler The action handler
   * @returns {boolean}
   */
  prehandleActionEvent(event, buttonValue, actionHandler) {
    return false;
  }
}

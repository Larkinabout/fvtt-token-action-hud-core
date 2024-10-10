import { DELIMITER, ACTION_TYPE } from "../constants.js";
import { Utils } from "../utils.js";

/**
 * Handler for building the HUD's macro actions.
 */
export class MacroActionHandler {
  constructor(actionHandler) {
    this.actionHandler = actionHandler;
  }

  /* -------------------------------------------- */

  /**
   * Build macro actions
   * @override
   */
  async buildMacroActions() {
    if (!this.macroActions) {
      this.macroActions = {
        actionsData: await this.#getActions(),
        groupData: { id: "macros", type: "core" }
      };
    }

    this.actionHandler.addActions(this.macroActions.actionsData, this.macroActions.groupData);
  }

  /* -------------------------------------------- */

  /**
   * Get actions
   * @private
   * @returns {object} The actions
   */
  async #getActions() {
    const actionType = "macro";
    const macros = game.macros.filter(macro => this.#hasPermission(macro));

    return macros.map(macro => {
      return {
        id: macro.id,
        name: macro.name,
        listName: this.#getListName(actionType, macro.name),
        encodedValue: [actionType, macro.id].join(DELIMITER),
        img: Utils.getImage(macro)
      };
    });
  }

  /* -------------------------------------------- */

  /**
   * Check if the user has permission for the macro
   * @private
   * @param {object} macro The macro
   * @returns {boolean}    Whether the user has permission
   */
  #hasPermission(macro) {
    const { ownership } = macro;
    return ownership[game.userId] ? ownership[game.userId] > 0 : ownership.default > 0;
  }

  /* -------------------------------------------- */

  /**
   * Get list name
   * @param {string} actionType The action type
   * @param {string} name       The action name
   * @returns {string}          The list name
   */
  #getListName(actionType, name) {
    const actionTypeName = `${game.i18n.localize(ACTION_TYPE[actionType])}: ` ?? "";
    return `${actionTypeName}${name}`;
  }
}

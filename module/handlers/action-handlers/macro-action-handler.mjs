import { ACTION_TYPE } from "../../core/constants.mjs";
import { Utils } from "../../core/utils.mjs";

/**
 * Handler for building the HUD's macro actions.
 */
export class MacroActionHandler {
  constructor(actionHandler) {
    this.actionHandler = actionHandler;
  }

  /* -------------------------------------------- */

  /**
   * Clear cached macro actions.
   */
  clearCache() {
    this.macroActions = null;
  }

  /* -------------------------------------------- */

  /**
   * Build macro actions
   * @override
   */
  async buildActions() {
    if (!Utils.getSetting("enableMacroActions")) return;

    if (!this.macroActions) {
      this.macroActions = {
        actions: await this.#getActions(),
        groupData: { id: "macros", type: "core" }
      };
    }

    this.actionHandler.addActions(this.macroActions.actions, this.macroActions.groupData);
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

    return macros.map(macro =>
      this.actionHandler.createAction({
        id: macro.id,
        name: macro.name,
        listName: this.#getListName(actionType, macro.name),
        img: Utils.getImage(macro),
        onClick: () => {
          game.macros.get(macro.id).execute();
        }
      })
    );
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

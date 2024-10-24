import { ActionHandlerExtender } from "./action-handler-extender.mjs";
import { DELIMITER, ITEM_MACRO_ICON } from "../../core/constants.mjs";
import { Utils } from "../../core/utils.mjs";

/**
 * Handler for building actions related to the Item Macro module.
 */
export class ItemMacroActionHandlerExtender extends ActionHandlerExtender {
  constructor() {
    super();
  }

  /* -------------------------------------------- */

  /**
   * Extend the action list
   * @override
   */
  extendActionHandler() {
    if (!this.actor) return;

    const items = this.actor.items.filter(item => item.flags?.itemacro?.macro?.command);
    if (!items?.length) return;

    const itemMacroSetting = Utils.getSetting("itemMacro");
    if (itemMacroSetting === "original") return;

    const replaceExisting = itemMacroSetting === "itemMacro";

    Object.values(this.groupHandler.groups).forEach(group => {
      this.#addGroupActions(items, group, replaceExisting);
    });
  }

  /* -------------------------------------------- */

  /**
   * Add group actions
   * @private
   * @param {Array} items     The items
   * @param {object} group    The group
   * @param {boolean} replace Whether to replace the action or not
   */
  #addGroupActions(items, group, replace) {
    // Exit if no actions exist
    if (!group?.actions?.length) return;

    const actions = [];
    for (const existingAction of group.actions) {
      const item = items.find(item => item.id === existingAction.id);
      if (!item) continue;

      const existingItemMacroAction = group.actions.find(action => action.id === `itemMacro+${existingAction.id}`);
      const actionToReplace = existingItemMacroAction ?? existingAction;

      if (existingItemMacroAction) replace = true;

      const macroAction = this.#createItemMacroAction(item, existingAction, actionToReplace, replace);

      if (!replace) {
        actions.push(macroAction);
      }

      if (!this.actionHandler.availableActions.has(macroAction.id)) {
        this.actionHandler.availableActions.set(macroAction.id, macroAction);
      }
    }

    this.#addActions(actions, group);
  }

  /* -------------------------------------------- */

  /**
   * Create item macro action
   * @private
   * @param {object} item            The item
   * @param {object} existingAction  The existing action
   * @param {object} actionToReplace The action to replace
   * @param {boolean} replace        Whether to replace the action or not
   * @returns {object}               The item macro action
   */
  #createItemMacroAction(item, existingAction, actionToReplace, replace) {
    const action = (replace) ? actionToReplace : Utils.deepClone(existingAction);
    action.encodedValue = `itemMacro${existingAction.encodedValue?.substr(existingAction.encodedValue.indexOf(DELIMITER))}`;
    action.id = `itemMacro+${existingAction.id}`;
    action.fullName = existingAction.fullName;
    action.listName = `Item Macro: ${existingAction.fullName}`;
    action.name = existingAction.name;
    action.img = existingAction.img;
    action.itemMacroIcon = `<i class="${ITEM_MACRO_ICON.ICON}" data-tooltip="${ITEM_MACRO_ICON.TOOLTIP}"></i>`;
    action.selected = existingAction.userSelected ?? existingAction.systemSelected;

    action.onClick = () => {
      try {
        item.executeMacro();
      } catch(err) {
        Logger.debug("ItemMacro Error", err);
        return false;
      }
    };

    return action;
  }

  /* -------------------------------------------- */

  /**
   * Add actions to the group
   * @private
   * @param {object} actions The actions
   * @param {object} group   The group
   */
  #addActions(actions, group) {
    actions.forEach(macroAction => {
      const index = group.actions.findIndex(action => action.id === macroAction.id) + 1;
      group.actions.splice(index, 0, macroAction);
    });
  }
}

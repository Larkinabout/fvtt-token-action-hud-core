import { ActionListExtender } from './action-list-extender.js'
import { DELIMITER, ITEM_MACRO_ICON } from '../constants.js'
import { Utils } from '../utilities/utils.js'

/**
 * Handler for building actions related to the Item Macro module.
 */
export class ItemMacroActionListExtender extends ActionListExtender {
    constructor (actionHandler) {
        super(actionHandler.categoryManager)
        this.actionHandler = actionHandler
        this.categoryManager = actionHandler.categoryManager
        this.actor = this.actionHandler.actor
        this.token = this.actionHandler.token
    }

    /**
     * Extend the action list
     * @override
     */
    extendActionList () {
        if (!this.actor) return
        const items = this.actor.items.filter((item) => item.flags?.itemacro?.macro?.command)

        let itemIds
        if (Utils.isModuleActive('midi-qol')) {
            itemIds = items
                .filter(this._isUnsupportedByMidiQoL)
                .map((item) => item.id)
        } else {
            itemIds = items.map((item) => item.id)
        }

        if (!itemIds) return

        if (itemIds.length === 0) return

        const itemMacroSetting = Utils.getSetting('itemMacro')

        if (itemMacroSetting === 'original') return

        const replace = itemMacroSetting === 'itemMacro'

        this.categoryManager.flattenedSubcategories.forEach(subcategory => {
            this._addSubcategoryActions(itemIds, subcategory, replace)
        })
    }

    /**
     * Add subcategory actions
     * @private
     * @param {array} itemIds      The list of item IDs
     * @param {object} subcategory The subcategory
     * @param {boolean} replace    Whether to replace the action or not
     */
    _addSubcategoryActions (itemIds, subcategory, replace) {
        // Exit if no actions exist
        if (!subcategory?.actions?.length) return

        const macroActions = []
        subcategory.actions.forEach(action => {
            if (!itemIds.includes(action.id)) return

            const existingItemMacroAction = subcategory.actions.find(subcategoryAction => subcategoryAction.id === `itemMacro+${action.id}`)
            const actionToReplace = existingItemMacroAction ?? action

            if (existingItemMacroAction) {
                replace = true
            }

            const macroAction = this._createItemMacroAction(action, actionToReplace, replace)

            // Add action to action list
            if (!replace) macroActions.push(macroAction)
        })

        this._addActionsToSubcategory(subcategory, macroActions)
    }

    /**
     * Create item macro action
     * @private
     * @param {object} originalAction  The original action
     * @param {object} actionToReplace The action to replace
     * @param {boolean} replace        Whether to replace the action or not
     * @returns {object}               The item macro action
     */
    _createItemMacroAction (originalAction, actionToReplace, replace) {
        const itemMacroAction = (replace) ? actionToReplace : Utils.deepClone(originalAction)
        itemMacroAction.id = `itemMacro+${originalAction.id}`
        itemMacroAction.fullName = originalAction.fullName
        itemMacroAction.listName = `Item Macro: ${originalAction.fullName}`
        itemMacroAction.name = originalAction.name
        itemMacroAction.encodedValue = `itemMacro${originalAction.encodedValue.substr(originalAction.encodedValue.indexOf(DELIMITER))}`
        itemMacroAction.itemMacroIcon = `<i class="${ITEM_MACRO_ICON.ICON}" title="${ITEM_MACRO_ICON.TOOLTIP}"></i>`
        return itemMacroAction
    }

    /**
     * Add actions to the subcategory
     * @private
     * @param {object} subcategory  The subcategory
     * @param {object} macroActions The actions
     */
    _addActionsToSubcategory (subcategory, macroActions) {
        macroActions.forEach((macroAction) => {
            const index = subcategory.actions.findIndex((action) => action.id === macroAction.id) + 1
            subcategory.actions.splice(index, 0, macroAction)
        })
    }

    /**
     * Whether the item is supported by MidiQoL or not
     * @private
     * @param {object} item The item
     * @returns {boolean}
     */
    _isUnsupportedByMidiQoL (item) {
        const flag = item.getFlag('midi-qol', 'onUseMacroName')
        return !flag
    }
}

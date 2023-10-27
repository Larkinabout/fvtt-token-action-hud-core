import { ActionHandlerExtender } from './action-handler-extender.js'
import { DELIMITER, ITEM_MACRO_ICON } from '../constants.js'
import { Utils } from '../utils.js'

/**
 * Handler for building actions related to the Item Macro module.
 */
export class ItemMacroActionHandlerExtender extends ActionHandlerExtender {
    constructor (actionHandler) {
        super(actionHandler)
        this.actionHandler = actionHandler
        this.actor = this.actionHandler.actor
        this.token = this.actionHandler.token
    }

    /**
     * Extend the action list
     * @override
     */
    extendActionHandler () {
        // Update actor and token with current action handler context
        this.actor = this.actionHandler.actor
        this.token = this.actionHandler.token

        if (!this.actor) return
        const items = this.actor.items.filter((item) => item.flags?.itemacro?.macro?.command)

        let itemIds
        if (Utils.isModuleActive('midi-qol')) {
            itemIds = items
                .filter(this.#isUnsupportedByMidiQoL)
                .map((item) => item.id)
        } else {
            itemIds = items.map((item) => item.id)
        }

        if (!itemIds) return

        if (itemIds.length === 0) return

        const itemMacroSetting = Utils.getSetting('itemMacro')

        if (itemMacroSetting === 'original') return

        const replace = itemMacroSetting === 'itemMacro'

        Object.keys(this.actionHandler.groups).forEach(groupKey => {
            const group = this.actionHandler.groups[groupKey]
            this.#addGroupActions(itemIds, group, replace)
        })
    }

    /**
     * Add group actions
     * @private
     * @param {array} itemIds   The list of item IDs
     * @param {object} group    The group
     * @param {boolean} replace Whether to replace the action or not
     */
    #addGroupActions (itemIds, group, replace) {
        // Exit if no actions exist
        if (!group?.actions?.length) return

        const actions = []
        group.actions.forEach(existingAction => {
            if (!itemIds.includes(existingAction.id)) return

            const existingItemMacroAction = group.actions.find(action => action.id === `itemMacro+${existingAction.id}`)
            const actionToReplace = existingItemMacroAction ?? existingAction

            if (existingItemMacroAction) {
                replace = true
            }

            const macroAction = this.#createItemMacroAction(existingAction, actionToReplace, replace)

            if (!replace) actions.push(macroAction)
        })

        this.#addActions(actions, group)
    }

    /**
     * Create item macro action
     * @private
     * @param {object} existingAction  The existing action
     * @param {object} actionToReplace The action to replace
     * @param {boolean} replace        Whether to replace the action or not
     * @returns {object}               The item macro action
     */
    #createItemMacroAction (existingAction, actionToReplace, replace) {
        const action = (replace) ? actionToReplace : Utils.deepClone(existingAction)
        action.encodedValue = `itemMacro${existingAction.encodedValue?.substr(existingAction.encodedValue.indexOf(DELIMITER))}`
        action.id = `itemMacro+${existingAction.id}`
        action.fullName = existingAction.fullName
        action.listName = `Item Macro: ${existingAction.fullName}`
        action.name = existingAction.name
        action.itemMacroIcon = `<i class="${ITEM_MACRO_ICON.ICON}" data-tooltip="${ITEM_MACRO_ICON.TOOLTIP}"></i>`
        return action
    }

    /**
     * Add actions to the group
     * @private
     * @param {object} actions The actions
     * @param {object} group   The group
     */
    #addActions (actions, group) {
        actions.forEach(macroAction => {
            const index = group.actions.findIndex(action => action.id === macroAction.id) + 1
            group.actions.splice(index, 0, macroAction)
        })
    }

    /**
     * Whether the item is supported by MidiQoL or not
     * @private
     * @param {object} item The item
     * @returns {boolean}
     */
    #isUnsupportedByMidiQoL (item) {
        const flag = item.getFlag('midi-qol', 'onUseMacroName')
        return !flag
    }
}

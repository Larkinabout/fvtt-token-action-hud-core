import { ActionListExtender } from './action-list-extender.js'
import { DELIMITER } from '../constants.js'
import { Utils } from '../utilities/utils.js'

export class ItemMacroActionListExtender extends ActionListExtender {
    constructor (actionHandler) {
        super(actionHandler.categoryManager)
        this.actionHandler = actionHandler
        this.categoryManager = actionHandler.categoryManager
    }

    /**
     * Extend the action list
     * @override
     * @param {object} character The actor and/or token
     */
    extendActionList (character) {
        if (!character) return

        const tokenId = character.token?.id
        const actorId = character.actor?.id

        if (!actorId) return

        const actor = Utils.getActor(actorId, tokenId)
        const items = actor.items.filter((item) => item.flags?.itemacro?.macro?.command)

        let itemIds
        if (Utils.isModuleActive('midi-qol')) {
            itemIds = items
                .filter(this.isUnsupportedByMidiQoL)
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
            this.addSubcategoryActions(itemIds, subcategory, replace)
        })
    }

    /**
     * Add subcategory actions
     * @param {array} itemIds      The list of item IDs
     * @param {object} subcategory The subcategory
     * @param {boolean} replace    Whether to replace the action or not
     */
    addSubcategoryActions (itemIds, subcategory, replace) {
        // Exit if no actions exist
        if (!subcategory?.actions?.length) return

        const macroActions = []
        subcategory.actions.forEach(action => {
            if (!itemIds.includes(action.id)) return

            const macroAction = this.createItemMacroAction(action, replace)

            // Add action to action list
            if (!replace) macroActions.push(macroAction)
        })

        this.addActionsToSubcategory(subcategory, macroActions)
    }

    /**
     * Create item macro action
     * @param {object} action   The action
     * @param {boolean} replace Whether to replace the action or not
     * @returns {object}        The action
     */
    createItemMacroAction (action, replace) {
        const itemMacroAction = (replace) ? action : Utils.deepClone(action)
        itemMacroAction.fullName = `(M) ${itemMacroAction.fullName}`
        itemMacroAction.name = `(M) ${itemMacroAction.name}`
        itemMacroAction.encodedValue = `itemMacro ${itemMacroAction.encodedValue.substr(itemMacroAction.encodedValue.indexOf(DELIMITER))}`

        return itemMacroAction
    }

    /**
     * Add actions to the subcategory
     * @param {object} subcategory  The subcategory
     * @param {object} macroActions The actions
     */
    addActionsToSubcategory (subcategory, macroActions) {
        macroActions.forEach((macroAction) => {
            const index = subcategory.actions.findIndex((action) => action.id === macroAction.id) + 1
            subcategory.actions.splice(index, 0, macroAction)
        })
    }

    /**
     * Whether the item is supported by MidiQoL or not
     * @param {object} item The item
     * @returns {boolean}
     */
    isUnsupportedByMidiQoL (item) {
        const flag = item.getFlag('midi-qol', 'onUseMacroName')
        return !flag
    }
}

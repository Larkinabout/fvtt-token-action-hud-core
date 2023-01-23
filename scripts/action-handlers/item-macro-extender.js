import { ActionListExtender } from './action-list-extender.js'
import { getSetting } from '../utilities/utils.js'

export class ItemMacroActionListExtender extends ActionListExtender {
    constructor (actionHandler) {
        super(actionHandler.categoryManager)
        this.actionHandler = actionHandler
        this.categoryManager = actionHandler.categoryManager
    }

    /**
     * Whether the module is active or not
     * @param {string} id The module ID
     * @returns {boolean}
     */
    static isModuleActive (id) {
        const module = game.modules.get(id)
        return module && module.active
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

        const actor = this.getActor(actorId, tokenId)
        const items = actor.items.filter((item) => item.flags?.itemacro?.macro?.command)

        let itemIds
        if (ItemMacroActionListExtender.isModuleActive('midi-qol')) {
            itemIds = items
                .filter(this.isUnsupportedByMidiQoL)
                .map((item) => item.id)
        } else {
            itemIds = items.map((item) => item.id)
        }

        if (!itemIds) return

        if (itemIds.length === 0) return

        const itemMacroSetting = getSetting('itemMacro')

        if (itemMacroSetting === 'original') return

        const replace = itemMacroSetting === 'itemMacro'

        this.categoryManager.flattenedSubcategories.forEach(subcategory => {
            this.addSubcategoryActions(itemIds, subcategory, replace)
        })
    }

    /**
     * Add subcategory actions
     * @param {array} itemIds The list of item IDs
     * @param {object} subcategory The subcategory
     * @param {boolean} replace Whether to replace the action or not
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
     * @param {object} action The action
     * @param {boolean} replace Whether to replace the action or not
     * @returns {object} The action
     */
    createItemMacroAction (action, replace) {
        const itemMacroAction = (replace) ? action : deepClone(action)
        itemMacroAction.fullName = `(M) ${itemMacroAction.fullName}`
        itemMacroAction.name = `(M) ${itemMacroAction.name}`
        itemMacroAction.encodedValue = `itemMacro ${itemMacroAction.encodedValue.substr(itemMacroAction.encodedValue.indexOf(this.delimiter))}`

        return itemMacroAction
    }

    /**
     * Add actions to the subcategory
     * @param {object} subcategory The subcategory
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

    /**
     * Get the actor
     * @param {string} actorId The actor ID
     * @param {string} tokenId The token ID
     * @returns {object} The actor
     */
    getActor (actorId, tokenId) {
        let token = null
        if (tokenId) {
            token = canvas.tokens.placeables.find((token) => token.id === tokenId)
        }
        if (token) {
            return token.actor
        }
        return game.actors.get(actorId)
    }
}

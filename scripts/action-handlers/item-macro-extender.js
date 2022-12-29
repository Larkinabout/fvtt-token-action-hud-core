import ActionListExtender from './action-list-extender.js'
import { getSetting } from '../utilities/utils.js'

export class ItemMacroActionListExtender extends ActionListExtender {
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
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     * @returns {object} The action list
     */
    extendActionList (actionList, character) {
        if (!character) return

        const tokenId = character.token?.id
        const actorId = character.actor?.id

        if (!actorId) return

        const actor = this.getActor(actorId, tokenId)
        const items = actor.items.filter((item) => item.hasMacro())

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

        if (itemMacroSetting === 'original') return actionList

        const replace = itemMacroSetting === 'itemMacro'

        actionList.categories.forEach((category) => {
            category.subcategories.forEach((subcategory) => {
                this.addSubcategoryActions(itemIds, subcategory, replace)
            })
        })

        return actionList
    }

    /**
     * Add subcategory actions
     * @param {array} itemIds The list of item IDs
     * @param {object} subcategory The subcategory
     * @param {boolean} replace Whether to replace the action or not
     */
    addSubcategoryActions (itemIds, subcategory, replace) {
        if (subcategory.subcategories && subcategory.subcategories.length > 0) {
            subcategory.subcategories.forEach((subcategory) =>
                this.addSubcategoryActions(itemIds, subcategory, replace)
            )
        }

        const macroActions = []
        subcategory.actions.forEach((action) => {
            if (!itemIds.includes(action.id)) return

            const macroAction = this.createItemMacroAction(action, replace)

            // if replacing, actions should have already been edited in place, no need to add.
            if (!replace) macroActions.push(macroAction)
        })

        this.addActionsToSubcategory(subcategory, macroActions)
    }

    /**
     * Create item macro action
     * @param {*} action The action
     * @param {*} replace Whether to replace the action or not
     * @returns The action
     */
    createItemMacroAction (action, replace) {
        const actionType = 'itemMacro'
        const newAction = replace ? action : {}

        const keep = action.encodedValue.substr(
            action.encodedValue.indexOf(this.delimiter)
        )
        newAction.encodedValue = actionType + keep
        newAction.id = action.id
        newAction.name = `(M) ${action.name}`
        newAction.img = action.img
        newAction.icon = action.icon
        newAction.info1 = action.info1
        newAction.info2 = action.info2
        newAction.info3 = action.info3
        newAction.selected = action.selected

        return newAction
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
     * @returns The actor
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

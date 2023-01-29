import { DELIMITER } from '../constants.js'
import { Utils } from '../utilities/utils.js'

export class MacroActionHandler {
    actionHandler

    constructor (actionHandler) {
        this.actionHandler = actionHandler
        this.categoryManager = actionHandler.categoryManager
    }

    /**
     * Build any macro actions
     * @override
     */
    async buildMacroActions () {
        const subcategoryType = 'custom'
        // Get macro subcategories
        const subcategories = this.categoryManager.getFlattenedSubcategories({ type: subcategoryType })
        const subcategoryIds = subcategories.flatMap(subcategory => subcategory.id)

        if (!subcategoryIds) return

        // Get actions
        const actions = await this._getActions()

        // Add actions to action list
        for (const subcategoryId of subcategoryIds) {
            const subcategoryData = { id: subcategoryId, type: subcategoryType }
            this.actionHandler.addActionsToActionList(actions, subcategoryData)
        }
    }

    /**
     * Get actions
     * @private
     * @returns {object} The actions
     */
    async _getActions () {
        const actionType = 'macro'
        const macros = game.macros.filter((macro) => {
            const permissions = macro.ownership
            if (permissions[game.userId]) return permissions[game.userId] > 0
            return permissions.default > 0
        })
        return macros.map((macro) => {
            const id = macro.id
            const name = macro.name
            const encodedValue = [actionType, macro.id].join(DELIMITER)
            const img = Utils.getImage(macro)
            const selected = true
            return {
                id,
                name,
                encodedValue,
                img,
                selected
            }
        })
    }
}

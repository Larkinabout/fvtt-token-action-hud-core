import { DELIMITER, ACTION_TYPE } from '../constants.js'
import { Utils } from '../utils.js'

/**
 * Handler for building the HUD's macro actions.
 */
export class MacroActionHandler {
    actionHandler
    macroActions

    constructor (actionHandler) {
        this.actionHandler = actionHandler
        this.macroActions = null
    }

    /**
     * Build macro actions
     * @override
     */
    async buildMacroActions () {
        if (!this.macroActions) {
            const groupData = { id: 'macros', type: 'core' }
            const actionsData = await this.#getActions()
            this.macroActions = { actionsData, groupData }
        }

        this.actionHandler.addActions(this.macroActions.actionsData, this.macroActions.groupData)
    }

    /**
     * Get actions
     * @private
     * @returns {object} The actions
     */
    async #getActions () {
        const actionType = 'macro'
        const macros = game.macros.filter((macro) => {
            const permissions = macro.ownership
            if (permissions[game.userId]) return permissions[game.userId] > 0
            return permissions.default > 0
        })
        return macros.map((macro) => {
            const id = macro.id
            const name = macro.name
            const actionTypeName = `${Utils.i18n(ACTION_TYPE[actionType])}: ` ?? ''
            const listName = `${actionTypeName}${name}`
            const encodedValue = [actionType, macro.id].join(DELIMITER)
            const img = Utils.getImage(macro)
            return {
                id,
                name,
                listName,
                encodedValue,
                img
            }
        })
    }
}

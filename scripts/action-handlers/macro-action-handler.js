import { DELIMITER, ACTION_TYPE } from '../constants.js'
import { Utils } from '../utils.js'

/**
 * Handler for building the HUD's macro actions.
 */
export class MacroActionHandler {
    actionHandler

    constructor (actionHandler) {
        this.actionHandler = actionHandler
    }

    /**
     * Build macro actions
     * @override
     */
    async buildMacroActions () {
        const groupData = { id: 'macros', type: 'core' }
        const actionsData = await this._getActions()
        this.actionHandler.addActions(actionsData, groupData)
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

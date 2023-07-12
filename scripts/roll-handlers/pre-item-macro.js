import { PreRollHandler } from './pre-roll-handler.js'
import { DELIMITER } from '../constants.js'
import { Logger, Utils } from '../utils.js'

export class ItemMacroPreRollHandler extends PreRollHandler {
    /** @override */
    prehandleActionEvent (event, encodedValue, actionHandler) {
        // Update variables with current action context
        this.actor = actionHandler.actor
        const payload = encodedValue.split(DELIMITER)

        if (payload.length !== 2) return false

        const actionType = payload[0]
        const actionId = payload[1]

        if (actionType !== 'itemMacro') return false

        if (this.isRenderItem()) {
            this.doRenderItem(this.actor, actionId)
            return true
        }

        return this.#tryExecuteItemMacro(actionId)
    }

    /**
     * Try to execute item macro
     * @private
     * @param {string} actionId The action id
     * @returns {boolean}       Whether the item macro executed
     */
    #tryExecuteItemMacro (actionId) {
        const item = Utils.getItem(this.actor, actionId)

        try {
            item.executeMacro()
        } catch (e) {
            Logger.debug('ItemMacro Error', e)
            return false
        }

        return true
    }
}

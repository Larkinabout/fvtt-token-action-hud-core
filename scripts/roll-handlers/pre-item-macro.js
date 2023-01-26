import { PreRollHandler } from './pre-roll-handler.js'
import { DELIMITER } from '../constants.js'
import { Logger, Utils } from '../utilities/utils.js'

export class ItemMacroPreRollHandler extends PreRollHandler {
    /** @override */
    prehandleActionEvent (event, encodedValue) {
        this.registerKeyPresses(event)

        const payload = encodedValue.split(DELIMITER)

        if (payload.length !== 4) return false

        const actionType = payload[0]
        const actorId = payload[1]
        const tokenId = payload[2]
        const actionId = payload[3]

        if (actionType !== 'itemMacro') return false

        if (this.isRenderItem()) {
            this.doRenderItem(actorId, tokenId, actionId)
            return true
        }

        return this._tryExecuteItemMacro(event, actorId, tokenId, actionId)
    }

    _tryExecuteItemMacro (event, actorId, tokenId, actionId) {
        const actor = Utils.getActor(actorId, tokenId)
        const item = Utils.getItem(actor, actionId)

        try {
            item.executeMacro()
        } catch (e) {
            Logger.debug('ItemMacro Error', e)
            return false
        }

        return true
    }
}

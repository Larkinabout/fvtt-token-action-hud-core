import { DELIMITER } from '../constants.js'
import { Logger, Utils } from '../utilities/utils.js'

/**
 * Resolves core actions triggered from the HUD
 */
export class RollHandler {
    preRollHandlers = []

    throwInvalidValueErr (err) {
        throw new Error(
            `Error handling button click: ${err}`
        )
    }

    async handleActionEvent (event, encodedValue) {
        Logger.debug(`Handling event for action [${encodedValue}]`, { event })

        this.registerKeyPresses(event)

        let handled = false
        this.preRollHandlers.forEach((handler) => {
            if (handled) return

            handled = handler.prehandleActionEvent(event, encodedValue)
        })

        if (handled) return

        if (this._isMultiGenericAction(encodedValue)) {
            await this._doMultiGenericAction(encodedValue)
            return
        }

        this.doHandleActionEvent(event, encodedValue)
    }

    doHandleActionEvent (event, encodedValue) {}

    addPreRollHandler (handler) {
        Logger.debug(
            `Adding pre-roll handler ${handler.constructor.name}`
        )
        this.preRollHandlers.push(handler)
    }

    registerKeyPresses (event) {
        this.rightClick = this.isRightClick(event)
        this.ctrl = this.isCtrl(event)
        this.alt = this.isAlt(event)
        this.shift = this.isShift(event)
    }

    doRenderItem (actorId, tokenId, actionId) {
        const actor = Utils.getActor(actorId, tokenId)
        const item = Utils.getItem(actor, actionId)
        item.sheet.render(true)
    }

    isRenderItem () {
        return (
            Utils.getSetting('renderItemOnRightClick') &&
            this.rightClick &&
            !(this.alt || this.ctrl || this.shift)
        )
    }

    isRightClick (event) {
        return event?.originalEvent?.button === 2
    }

    isAlt (event) {
        return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT)
    }

    isCtrl (event) {
        return game.keyboard.isModifierActive(
            KeyboardManager.MODIFIER_KEYS.CONTROL
        )
    }

    isShift (event) {
        return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)
    }

    /** @private */
    _isMultiGenericAction (encodedValue) {
        const payload = encodedValue.split(DELIMITER)

        const actionType = payload[0]
        const actionId = payload[3]

        return actionType === 'utility' && actionId.includes('toggle')
    }

    /** @private */
    async _doMultiGenericAction (encodedValue) {
        const payload = encodedValue.split(DELIMITER)
        const actionId = payload[3]

        const firstControlledToken = Utils.getFirstControlledToken()

        if (actionId === 'toggleVisibility') firstControlledToken.toggleVisibility()
        if (actionId === 'toggleCombat') firstControlledToken.toggleCombat()

        Hooks.callAll('forceUpdateTokenActionHud')
    }
}

import { Logger, getSetting } from '../utilities/utils.js'

export class RollHandler {
    preRollHandlers = []

    i18n = (toTranslate) => game.i18n.localize(toTranslate)

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

    getItem (actor, itemId) {
        return actor.items.get(itemId)
    }

    getToken (tokenId) {
        return canvas.tokens.placeables.find((token) => token.id === tokenId)
    }

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
        const actor = this.getActor(actorId, tokenId)
        const item = this.getItem(actor, actionId)
        item.sheet.render(true)
    }

    isRenderItem () {
        return (
            getSetting('renderItemOnRightClick') &&
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
        const payload = encodedValue.split('|')

        const actionType = payload[0]
        const actionId = payload[3]

        return actionType === 'utility' && actionId.includes('toggle')
    }

    /** @private */
    async _doMultiGenericAction (encodedValue) {
        const payload = encodedValue.split('|')
        const actionId = payload[3]

        if (actionId === 'toggleVisibility') {
            await canvas.tokens.controlled[0].toggleVisibility()
        }

        if (actionId === 'toggleCombat') {
            await canvas.tokens.controlled[0].toggleCombat()
        }

        Hooks.callAll('forceUpdateTokenActionHud')
    }
}

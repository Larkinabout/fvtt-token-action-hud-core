import { DELIMITER } from '../constants.js'
import { Logger, Utils } from '../utilities/utils.js'

/**
 * Resolves core actions triggered from the HUD
 */
export class RollHandler {
    preRollHandlers = []

    /**
     * Throw error
     * @param {*} err The error
     */
    throwInvalidValueErr (err) {
        throw new Error(
            `Error handling button click: ${err}`
        )
    }

    /**
     * Handle action events
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
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

    /**
     * Overide for the TAH system module
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    doHandleActionEvent (event, encodedValue) {}

    /**
     * Add a pre-roll handler
     * @param {object} handler The roll handler
     */
    addPreRollHandler (handler) {
        Logger.debug(
            `Adding pre-roll handler ${handler.constructor.name}`
        )
        this.preRollHandlers.push(handler)
    }

    /**
     * Registers key presses
     * @public
     * @param {object} event The events
     */
    registerKeyPresses (event) {
        this.rightClick = this.isRightClick(event)
        this.ctrl = this.isCtrl(event)
        this.alt = this.isAlt(event)
        this.shift = this.isShift(event)
    }

    /**
     * Renders the item sheet
     * @public
     * @param {string} actorId The actor id
     * @param {string} tokenId The token id
     * @param {string} itemId  The item id
     */
    doRenderItem (actorId, tokenId, itemId) {
        const actor = Utils.getActor(actorId, tokenId)
        const item = Utils.getItem(actor, itemId)
        item.sheet.render(true)
    }

    /**
     * Whether the item sheet should be rendered
     * @public
     * @returns {boolean}
     */
    isRenderItem () {
        return (
            Utils.getSetting('renderItemOnRightClick') &&
            this.rightClick &&
            !(this.alt || this.ctrl || this.shift)
        )
    }

    /**
     * Whether the button was right-clicked
     * @public
     * @param {object} event The event
     * @returns {boolean}
     */
    isRightClick (event) {
        return event?.originalEvent?.button === 2
    }

    /**
     * Whether the ALT key was pressed when the button was clicked
     * @public
     * @param {object} event The event
     * @returns {boolean}
     */
    isAlt (event) {
        return game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT)
    }

    /**
     * Whether the CTRL key was pressed when the button was clicked
     * @public
     * @param {object} event The event
     * @returns {boolean}
     */
    isCtrl (event) {
        return game.keyboard.isModifierActive(
            KeyboardManager.MODIFIER_KEYS.CONTROL
        )
    }

    /**
     * Whether the SHIFT key was pressed when the button was clicked
     * @public
     * @param {object} event The event
     * @returns {boolean}
     */
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

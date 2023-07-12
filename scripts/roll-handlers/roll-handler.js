import { DELIMITER } from '../constants.js'
import { Logger, Utils } from '../utils.js'

/**
 * Resolves core actions triggered from the HUD
 */
export class RollHandler {
    actor = null
    token = null
    delimiter = DELIMITER
    preRollHandlers = []

    /**
     * Throw error
     * @public
     * @param {*} err The error
     */
    throwInvalidValueErr (err) {
        throw new Error(
            `Error handling button click: ${err}`
        )
    }

    /**
     * Handle action events
     * @public
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    async handleActionEvent (event, encodedValue, actionHandler) {
        Logger.debug(`Handling event for action [${encodedValue}]`, { event })
        // Update variables with current action context
        this.actor = actionHandler.actor;
        this.token = actionHandler.token;

        this.registerKeyPresses(event)

        let handled = false
        this.preRollHandlers.forEach((handler) => {
            if (handled) return

            handled = handler.prehandleActionEvent(event, encodedValue, actionHandler)
        })

        if (handled) return

        if (this._isGenericAction(encodedValue)) {
            await this._handleGenericAction(encodedValue)
        } else {
            this.doHandleActionEvent(event, encodedValue)
        }
    }

    /**
     * Overide for the TAH system module
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    doHandleActionEvent (event, encodedValue) {}

    /**
     * Add a pre-roll handler
     * @public
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
     * @param {object} actor  The actor
     * @param {string} itemId The item id
     */
    doRenderItem (actor, itemId) {
        if (!actor) actor = this.actor
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
        const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT)
        if (event.altKey && !isModiferActive) {
            Logger.debug('Emulating LEFT ALT key press')
            KeyboardManager.emulateKeypress(false, 'AltLeft', { altKey: true, force: true })
            game.keyboard.downKeys.add('AltLeft')
            return true
        }
        return isModiferActive
    }

    /**
     * Whether the CTRL key was pressed when the button was clicked
     * @public
     * @param {object} event The event
     * @returns {boolean}
     */
    isCtrl (event) {
        const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL)
        if (event.ctrlKey && !isModiferActive) {
            Logger.debug('Emulating LEFT CTRL key press')
            KeyboardManager.emulateKeypress(false, 'ControlLeft', { ctrlKey: true, force: true })
            game.keyboard.downKeys.add('ControlLeft')
            return true
        }
        return isModiferActive
    }

    /**
     * Whether the SHIFT key was pressed when the button was clicked
     * @public
     * @param {object} event The event
     * @returns {boolean}
     */
    isShift (event) {
        const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)
        if (event.shiftKey && !isModiferActive) {
            Logger.debug('Emulating LEFT SHIFT key press')
            KeyboardManager.emulateKeypress(false, 'ShiftLeft', { shiftKey: true, force: true })
            game.keyboard.downKeys.add('ShiftLeft')
            return true
        }
        return isModiferActive
    }

    /**
     * Whether the action is a generic action
     * @private
     * @param {string} encodedValue The encoded value
     * @returns {boolean}           Whether the action is a generic action
     */
    _isGenericAction (encodedValue) {
        const payload = encodedValue.split(DELIMITER)

        const actionType = payload[0]
        const actionId = payload[1]

        return actionType === 'utility' && actionId.includes('toggle')
    }

    /**
     * Handle generic action
     * @private
     * @param {string} encodedValue The encoded value
     */
    async _handleGenericAction (encodedValue) {
        const payload = encodedValue.split(DELIMITER)
        const actionId = payload[1]

        const firstControlledToken = Utils.getFirstControlledToken()

        if (actionId === 'toggleVisibility') await firstControlledToken.toggleVisibility()
        if (actionId === 'toggleCombat') await firstControlledToken.toggleCombat()

        Hooks.callAll('forceUpdateTokenActionHud')
    }
}

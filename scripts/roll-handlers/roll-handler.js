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
     * @param {object} event         The event
     * @param {string} encodedValue  The encoded value
     * @param {class}  actionHandler The ActionHandler class
     */
    async handleActionClickCore (event, encodedValue, actionHandler) {
        Logger.debug(`Handling click event for action [${encodedValue}]`, { event })

        // Update variables with current action context
        this.actor = actionHandler.actor
        this.token = actionHandler.token

        this.registerKeyPresses(event)

        let handled = false
        this.preRollHandlers.forEach((handler) => {
            if (handled) return

            handled = handler.prehandleActionEvent(event, encodedValue, actionHandler)
        })

        if (handled) return

        if (this.#isGenericAction(encodedValue)) {
            await this.#handleGenericActionClick(encodedValue)
        } else {
            if (this.handleActionClick.toString().slice(-2) !== '{}') {
                this.handleActionClick(event, encodedValue)
            } else {
                globalThis.logger.warn('Token Action HUD | RollHandler.doHandleActionEvent is deprecated. Use RollHandler.handleActionClick')
                this.doHandleActionEvent(event, encodedValue)
            }
        }
    }

    /**
     * Overide for the TAH system module
     * @override
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    handleActionClick (event, encodedValue) {}

    /**
     * Handle action hover events
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     * @param {class} actionHandler The ActionHandler class
     */
    async handleActionHoverCore (event, encodedValue, actionHandler) {
        Logger.debug(`Handling hover event for action [${encodedValue}]`, { event })

        // Update variables with current action context
        this.actor = actionHandler.actor
        this.token = actionHandler.token

        this.registerKeyPresses(event)

        this.handleActionHover(event, encodedValue)
    }

    /**
     * Overide for the TAH system module
     * @override
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    handleActionHover (event, encodedValue) {}

    /**
     * Handle group click events
     * @param {object} event        The event
     * @param {string} nestId       The nest ID
     * @param {class} actionHandler The ActionHandler class
     */
    async handleGroupClickCore (event, nestId, actionHandler) {
        Logger.debug(`Handling click event for group [${nestId}]`, { event })

        // Update variables with current action context
        this.actor = actionHandler.actor
        this.token = actionHandler.token

        const group = actionHandler.getGroup({ nestId })

        this.registerKeyPresses(event)

        this.handleGroupClick(event, group)
    }

    /**
     * Overide for the TAH system module
     * @override
     * @param {object} event The event
     * @param {object} group The group
     */
    handleGroupClick (event, group) {}

    /**
     * Add a pre-roll handler
     * @public
     * @param {object} handler The roll handler
     */
    addPreRollHandler (handler) {
        Logger.debug(`Adding pre-roll handler ${handler.constructor.name}`)
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
     * @returns {boolean}     Whether the item was rendered
     */
    renderItem (actor, itemId) {
        // If actor is not specified, use the RollHandler's actor
        if (!actor) {
            actor = this.actor
        }

        // Get the item
        const item = Utils.getItem(actor, itemId)

        // If the item is not found, return false
        if (!item) return false

        // Render the item and return true
        item.sheet.render(true)
        return true
    }

    /**
     * Whether the item sheet should be rendered
     * @public
     * @returns {boolean}
     */
    isRenderItem () {
        return (
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
    #isGenericAction (encodedValue) {
        const [actionType, actionId] = encodedValue.split(DELIMITER)
        return actionType === 'utility' && actionId.includes('toggle')
    }

    /**
     * Handle generic action
     * @private
     * @param {string} encodedValue The encoded value
     */
    async #handleGenericActionClick (encodedValue) {
        const payload = encodedValue.split(DELIMITER)
        const actionId = payload[1]

        const firstControlledToken = Utils.getFirstControlledToken()

        if (actionId === 'toggleVisibility') await firstControlledToken.toggleVisibility()
        if (actionId === 'toggleCombat') await firstControlledToken.toggleCombat()

        Hooks.callAll('forceUpdateTokenActionHud')
    }

    // DEPRECATED

    /**
     * Overide for the TAH system module
     * @override
     * @param {object} event        The event
     * @param {string} encodedValue The encoded value
     */
    doHandleActionEvent (event, encodedValue) {}

    /**
     * Renders the item sheet
     * @public
     * @param {object} actor  The actor
     * @param {string} itemId The item id
     */
    doRenderItem (actor, itemId) {
        globalThis.logger.warn('Token Action HUD | RollHandler.doRenderItem is deprecated. Use RollHandler.renderItem')
        this.renderItem(actor, itemId)
    }
}

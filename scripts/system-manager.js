import { registerSettings } from './settings.js'
import { ItemMacroActionListExtender } from './action-handlers/item-macro-extender.js'
import { CompendiumMacroPreHandler } from './roll-handlers/compendium-macro-pre-handler.js'
import { ItemMacroPreRollHandler } from './roll-handlers/pre-item-macro.js'
import { MODULE } from './constants.js'
import { Logger, Utils } from './utils.js'

export class SystemManager {
    constructor () {
        this.coreModuleId = MODULE.ID
    }

    /** ACTION HANDLERS */
    /** OVERRIDDEN BY SYSTEM */

    doGetActionHandler () {}
    doGetRollHandler (handlerId) {}
    getAvailableRollHandlers () {}
    doRegisterSettings (updateFunc) {}
    async doRegisterDefaultFlags () {}

    /**
     * Register default flags
     * @public
     */
    async registerDefaultFlags () {
        await Utils.unsetUserFlag('default')
        const defaults = await this.doRegisterDefaultFlags() ?? []
        if (defaults) {
            if (defaults?.categories) {
                globalThis.logger.warn('Token Action HUD | SystemManager.doRegisterDefaultFlags expects \'layout\' to be returned instead of \'categories\'')
            }
            if (defaults?.subcategories) {
                globalThis.logger.warn('Token Action HUD | SystemManager.doRegisterDefaultFlags expects \'groups\' to be returned instead of \'subcategories\'')
            }
            game.tokenActionHud.defaults = defaults
        }
    }

    /**
     * Initialise the action handler
     * @public
     * @returns {ActionHandler}
     */
    async getActionHandler () {
        const actionHandler = this.doGetActionHandler()
        this.addActionExtenders(actionHandler)
        return actionHandler
    }

    /**
     * Initialise action list extenders
     * @public
     * @param {ActionHandler} actionHandler The ActionHandler class
     */
    addActionExtenders (actionHandler) {
        if (Utils.isModuleActive('itemacro') && !Utils.isModuleActive('midi-qol')) { actionHandler.addFurtherActionHandler(new ItemMacroActionListExtender(actionHandler)) }
    }

    /**
     * Get the roll handler
     * @public
     * @returns {object} The roll handler
     */
    getRollHandler () {
        let rollHandlerId = Utils.getSetting('rollHandler')

        if (!(rollHandlerId === 'core' || Utils.isModuleActive(rollHandlerId))) {
            Logger.error(rollHandlerId, Utils.i18n('tokenActionHud.handlerNotFound'))
            rollHandlerId = 'core'
            Utils.setSetting('rollHandler', rollHandlerId)
        }

        const rollHandler = this.doGetRollHandler(rollHandlerId)
        this.addPreHandlers(rollHandler)
        return rollHandler
    }

    /**
     * Add pre-handlers
     * @public
     * @param {object} rollHandler
     */
    addPreHandlers (rollHandler) {
        rollHandler.addPreRollHandler(new CompendiumMacroPreHandler())

        if (Utils.isModuleActive('itemacro') && !Utils.isModuleActive('midi-qol')) { rollHandler.addPreRollHandler(new ItemMacroPreRollHandler()) }
    }

    /**
     * Register module settings
     * @public
     */
    registerSettings () {
        const rollHandlers = this.getAvailableRollHandlers()
        registerSettings(this, rollHandlers)
    }

    /**
     * Add handler
     * @param {array} choices The choices
     * @param {string} id     The module id
     */
    static addHandler (choices, id) {
        if (Utils.isModuleActive(id)) {
            const title = Utils.getModuleTitle(id)
            mergeObject(choices, { [id]: title })
        }
    }
}

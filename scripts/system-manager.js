import { registerSettingsCore } from './settings.js'
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

    getActionHandler () {}
    getRollHandler (rollHandlerId) {}
    getAvailableRollHandlers () {}
    registerSettings (onChangeFunction) {}
    async registerDefaults () {}

    /**
     * Register default flags
     * @public
     */
    async registerDefaultsCore () {
        let func = null
        if (this.registerDefaults.toString().slice(-2) !== '{}') {
            func = this.registerDefaults
        } else {
            globalThis.logger.warn('Token Action HUD | SystemHandler.doRegisterDefaultFlags is deprecated. Use SystemHandler.registerDefaults')
            func = this.doRegisterDefaultFlags
        }
        const defaults = await func() ?? []
        Hooks.callAll('tokenActionHudCoreRegisterDefaults', defaults)
        if (defaults) {
            game.tokenActionHud.defaults = defaults
        }
    }

    /**
     * Initialise the action handler
     * @public
     * @returns {class} The ActionHandler class
     */
    async getActionHandlerCore () {
        let func = null
        if (this.getActionHandler.toString().slice(-2) !== '{}') {
            func = this.getActionHandler
        } else {
            globalThis.logger.warn('Token Action HUD | SystemHandler.doGetActionHandler is deprecated. Use SystemHandler.getActionHandler')
            func = this.doGetActionHandler
        }
        const actionHandler = func()
        this.addActionHandlerExtensions(actionHandler)
        return actionHandler
    }

    /**
     * Add action handler extensions
     * @public
     * @param {class} actionHandler The ActionHandler class
     */
    addActionHandlerExtensions (actionHandler) {
        if (Utils.isModuleActive('itemacro') && !Utils.isModuleActive('midi-qol')) {
            actionHandler.addFurtherActionHandler(new ItemMacroActionListExtender(actionHandler))
        }

        Hooks.callAll('tokenActionHudCoreAddActionHandlerExtensions', actionHandler)
    }

    /**
     * Get the roll handler
     * @public
     * @returns {class} The RollHandler class
     */
    getRollHandlerCore () {
        let rollHandlerId = Utils.getSetting('rollHandler')

        if (!(rollHandlerId === 'core' || Utils.isModuleActive(rollHandlerId))) {
            Logger.error(rollHandlerId, Utils.i18n('tokenActionHud.handlerNotFound'))
            rollHandlerId = 'core'
            Utils.setSetting('rollHandler', rollHandlerId)
        }

        let func = null
        if (this.getRollHandler.toString().slice(-2) !== '{}') {
            func = this.getRollHandler
        } else {
            globalThis.logger.warn('Token Action HUD | SystemHandler.doGetRollHandler is deprecated. Use SystemHandler.getRollHandler')
            func = this.doGetRollHandler
        }
        const rollHandler = func(rollHandlerId)
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

        if (Utils.isModuleActive('itemacro') && !Utils.isModuleActive('midi-qol')) {
            rollHandler.addPreRollHandler(new ItemMacroPreRollHandler())
        }
    }

    /**
     * Register module settings
     * @public
     */
    registerSettingsCore () {
        const rollHandlers = this.getAvailableRollHandlers()
        registerSettingsCore(this, rollHandlers)
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

    // DEPRECATED
    doGetActionHandler () {}
    doGetRollHandler (rollHandlerId) {}
    doRegisterSettings (onChangeFunction) {}
    async doRegisterDefaultFlags () {}
}

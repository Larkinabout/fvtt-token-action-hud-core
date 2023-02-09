import { registerSettings } from './settings.js'
import { ItemMacroActionListExtender } from './action-handlers/item-macro-extender.js'
import { CompendiumMacroPreHandler } from './roll-handlers/compendium-macro-pre-handler.js'
import { ItemMacroPreRollHandler } from './roll-handlers/pre-item-macro.js'
import { CompendiumActionHandler } from './action-handlers/compendium-action-handler.js'
import { MODULE } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

export class SystemManager {
    constructor () {
        this.coreModuleId = MODULE.ID
    }

    doGetCategoryManager () {}

    /** ACTION HANDLERS */
    /** OVERRIDDEN BY SYSTEM */

    doGetActionHandler () {}
    doGetRollHandler (handlerId) {}
    getAvailableRollHandlers () {}
    doRegisterSettings (updateFunc) {}
    async doRegisterDefaultFlags () {}

    /**
     * Register default flags
     */
    async registerDefaultFlags () {
        const defaults = await this.doRegisterDefaultFlags()
        if (defaults) {
            await Utils.unsetUserFlag('default')
            await Utils.setUserFlag('default', defaults)
        }
    }

    /**
     * Initialise the action handler
     * @param {CategoryManager} categoryManager The CategoryManager class
     * @returns {ActionHandler}
     */
    async getActionHandler (categoryManager) {
        const actionHandler = this.doGetActionHandler(categoryManager)
        this.addActionExtenders(actionHandler)
        return actionHandler
    }

    /**
     * Initialise action list extenders
     * @param {ActionHandler} actionHandler The ActionHandler class
     */
    addActionExtenders (actionHandler) {
        if (Utils.isModuleActive('itemacro')) { actionHandler.addFurtherActionHandler(new ItemMacroActionListExtender(actionHandler)) }
    }

    /**
     * Initialise the category manager
     * @returns {CategoryManager} The CategoryManager class
     */
    async getCategoryManager () {
        const categoryManager = this.doGetCategoryManager()
        await categoryManager.init()
        return categoryManager
    }

    /** ROLL HANDLERS */

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

    addPreHandlers (rollHandler) {
        rollHandler.addPreRollHandler(new CompendiumMacroPreHandler())

        if (Utils.isModuleActive('itemacro')) { rollHandler.addPreRollHandler(new ItemMacroPreRollHandler()) }
    }

    /** SETTINGS */

    registerSettings () {
        const rollHandlers = this.getAvailableRollHandlers()
        registerSettings(this, rollHandlers)
    }

    /** UTILITY */

    static addHandler (choices, id) {
        if (Utils.isModuleActive(id)) {
            const title = Utils.getModuleTitle(id)
            mergeObject(choices, { [id]: title })
        }
    }
}

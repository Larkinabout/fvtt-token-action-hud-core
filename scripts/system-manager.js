import { registerSettings } from './settings.js'
import { ItemMacroActionListExtender } from './action-handlers/item-macro-extender.js'
import { CompendiumMacroPreHandler } from './roll-handlers/compendium-macro-pre-handler.js'
import { ItemMacroPreRollHandler } from './roll-handlers/pre-item-macro.js'
import { CompendiumActionHandler } from './action-handlers/compendium-action-handler.js'
import { Logger, getSetting, setSetting } from './utilities/utils.js'

export class SystemManager {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)

    namespace = 'token-action-hud-core'

    doGetCategoryManager () {}

    /** ACTION HANDLERS */
    /** OVERRIDDEN BY SYSTEM */

    doGetActionHandler () {}
    doGetRollHandler (handlerId) {}
    getAvailableRollHandlers () {}
    doRegisterSettings (updateFunc) {}
    async doRegisterDefaultFlags () {}

    async registerDefaultFlags () {
        await game.user.unsetFlag(this.namespace, 'default')
        await this.doRegisterDefaultFlags()
    }

    async getActionHandler (categoryManager) {
        const actionHandler = this.doGetActionHandler(categoryManager)
        this.addActionExtenders(actionHandler)
        return actionHandler
    }

    async getCompendiumActionHandler (user) {
        const compendiumActionHandler = new CompendiumActionHandler(this.categoryManager)
        return compendiumActionHandler
    }

    addActionExtenders (actionHandler) {
        if (SystemManager.isModuleActive('itemacro')) { actionHandler.addFurtherActionHandler(new ItemMacroActionListExtender()) }
    }

    async getCategoryManager (user) {
        const categoryManager = this.doGetCategoryManager(user)
        await categoryManager.init()
        return categoryManager
    }

    /** ROLL HANDLERS */

    getRollHandler () {
        let rollHandlerId = getSetting('rollHandler')

        if (!(rollHandlerId === 'core' || SystemManager.isModuleActive(rollHandlerId))) {
            Logger.error(rollHandlerId, this.i18n('tokenActionHud.handlerNotFound'))
            rollHandlerId = 'core'
            setSetting('rollHandler', rollHandlerId)
        }

        const rollHandler = this.doGetRollHandler(rollHandlerId)
        this.addPreHandlers(rollHandler)
        return rollHandler
    }

    addPreHandlers (rollHandler) {
        rollHandler.addPreRollHandler(new CompendiumMacroPreHandler())

        if (SystemManager.isModuleActive('itemacro')) { rollHandler.addPreRollHandler(new ItemMacroPreRollHandler()) }
    }

    /** SETTINGS */

    registerSettings () {
        const rollHandlers = this.getAvailableRollHandlers()
        registerSettings(this.namespace, this, rollHandlers)
    }

    /** UTILITY */

    static addHandler (choices, id) {
        if (SystemManager.isModuleActive(id)) {
            const title = SystemManager.getModuleTitle(id)
            mergeObject(choices, { [id]: title })
        }
    }

    static isModuleActive (id) {
        const module = game.modules.get(id)
        return module && module.active
    }

    static getModuleTitle (id) {
        return game.modules.get(id)?.title ?? ''
    }
}

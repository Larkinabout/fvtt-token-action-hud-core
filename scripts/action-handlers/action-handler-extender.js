import { ActionHandler } from './action-handler.js'

/**
 * An extension of the base ActionHandler which extends the HUD via core or system modules.
 */
export class ActionHandlerExtender extends ActionHandler {
    extendActionList () {}

    /**
     * @override
     */
    extendActionHandler () {
        globalThis.logger.warn('Token Action HUD | ActionListExtender.extendActionList is deprecated. Use ActionHandlerExtender.extendActionHandler')
        this.extendActionList()
    }
}

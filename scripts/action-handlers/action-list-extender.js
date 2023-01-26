import { ActionHandler } from './action-handler.js'

/**
 * An extension of the base ActionHandler which extends the action list via core or system modules.
 */
export class ActionListExtender extends ActionHandler {
    constructor (categoryManager) {
        super(categoryManager)
    }

    extendActionList (character) {}
}

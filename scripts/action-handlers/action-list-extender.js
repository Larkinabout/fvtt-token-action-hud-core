import { ActionHandler } from './action-handler.js'

export class ActionListExtender extends ActionHandler {
    constructor (categoryManager) {
        super(categoryManager)
    }

    extendActionList (character) {}
}

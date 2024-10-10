import { RollHandler } from './roll-handler.js'

/**
 * An extension of the base RollHandler which extends the actions that can be handled
 */
export class RollHandlerExtender extends RollHandler {
    prehandleActionEvent (event, encodedValue, actionHandler) {
        return false
    }

    handleActionClick (event, encodedValue, actionHandler) {
        return false
    }
}

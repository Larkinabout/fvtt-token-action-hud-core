import { ActionHandler } from "./action-handler.mjs";

/**
 * An extension of the base ActionHandler which extends the HUD via core or system modules.
 */
export class ActionHandlerExtender extends ActionHandler {
  constructor() {
    super();
  }

  /**
   * Extend action handler
   * @override
   */
  extendActionHandler() {}
}

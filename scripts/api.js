import { MODULE } from "./constants.js";
import { ActionHandler } from "./action-handlers/action-handler.js";
import { ActionHandlerExtender } from "./action-handlers/action-handler-extender.js";
import { DataHandler } from "./data-handler.js";
import { PreRollHandler } from "./roll-handlers/pre-roll-handler.js";
import { RollHandler } from "./roll-handlers/roll-handler.js";
import { SystemManager } from "./system-manager.js";
import { Logger, Timer, Utils } from "./utils.js";

/**
 * Register the API
 */
export function registerApi() {
  const module = game.modules.get(MODULE.ID);
  module.api = {
    ActionListExtender: ActionHandlerExtender,
    ActionHandlerExtender,
    ActionHandler,
    DataHandler,
    Logger,
    PreRollHandler,
    RollHandler,
    SystemManager,
    Timer,
    Utils
  };

  Hooks.callAll("tokenActionHudCoreApiReady", module);
}

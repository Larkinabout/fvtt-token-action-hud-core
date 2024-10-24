import { MODULE } from "./constants.mjs";
import { ActionHandler } from "../handlers/action-handlers/action-handler.mjs";
import { ActionHandlerExtender } from "../handlers/action-handlers/action-handler-extender.mjs";
import { DataHandler } from "../handlers/data-handler.mjs";
import { PreRollHandler } from "../handlers/roll-handlers/pre-roll-handler.mjs";
import { RollHandler } from "../handlers/roll-handlers/roll-handler.mjs";
import { RollHandlerExtender } from "../handlers/roll-handlers/roll-handler-extender.mjs";
import { SystemManager } from "../managers/system-manager.mjs";
import { Logger, Timer, Utils } from "./utils.mjs";

/**
 * Register the API
 */
export function registerApi() {
  const module = game.modules.get(MODULE.ID);
  module.api = {
    ActionHandlerExtender,
    ActionHandler,
    DataHandler,
    Logger,
    PreRollHandler,
    RollHandler,
    RollHandlerExtender,
    SystemManager,
    Timer,
    Utils
  };

  Hooks.callAll("tokenActionHudCoreApiReady", module);
}

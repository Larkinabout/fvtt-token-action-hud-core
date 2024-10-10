import { registerSettingsCore } from "./settings.js";
import { ItemMacroActionHandlerExtender } from "./action-handlers/item-macro-extender.js";
import { CompendiumMacroPreHandler } from "./roll-handlers/compendium-macro-pre-handler.js";
import { ItemMacroPreRollHandler } from "./roll-handlers/pre-item-macro.js";
import { MODULE, CSS_STYLE } from "./constants.js";
import { Logger, Utils } from "./utils.js";

export class SystemManager {
  constructor() {
    this.coreModuleId = MODULE.ID;
    this.styles = null;
  }

  /* -------------------------------------------- */
  /*  Methods for system modules to override      */
  /* -------------------------------------------- */

  getActionHandler() {}

  getRollHandler(rollHandlerId) {}

  getAvailableRollHandlers() {}

  registerSettings(onChangeFunction) {}

  async registerDefaults() {}

  /* -------------------------------------------- */

  /**
   * Register defaults
   * @public
   */
  async registerDefaultsCore() {
    const defaults = await this.registerDefaults() ?? [];

    Hooks.callAll("tokenActionHudCoreRegisterDefaults", defaults);

    if (defaults) {
      game.tokenActionHud.defaults = defaults;
    }
  }

  /* -------------------------------------------- */

  /**
   * Register styles
   */
  async registerStylesCore() {
    const systemStyles = this.registerStyles() ?? {};
    this.styles = foundry.utils.mergeObject(CSS_STYLE, systemStyles);

    Hooks.callAll("tokenActionHudCoreRegisterStyles", this.styles);
  }

  /* -------------------------------------------- */

  /**
   * @override
   */
  async registerStyles() {}

  /* -------------------------------------------- */

  /**
   * Initialise the action handler
   * @public
   * @returns {class} The action handler
   */
  async getActionHandlerCore() {
    const actionHandler = this.getActionHandler();
    this.#addActionHandlerExtenders(actionHandler);
    return actionHandler;
  }

  /* -------------------------------------------- */

  /**
   * Add action handler extensions
   * @public
   * @param {class} actionHandler The action handler
   */
  #addActionHandlerExtenders(actionHandler) {
    if (Utils.isModuleActive("itemacro") && !Utils.isModuleActive("midi-qol")) {
      actionHandler.addActionHandlerExtender(new ItemMacroActionHandlerExtender(actionHandler));
    }

    Hooks.callAll("tokenActionHudCoreAddActionHandlerExtenders", actionHandler);
  }

  /* -------------------------------------------- */

  /**
   * Get the roll handler
   * @public
   * @returns {class} The roll handler
   */
  getRollHandlerCore() {
    let rollHandlerId = Utils.getSetting("rollHandler");

    if (!(rollHandlerId === "core" || Utils.isModuleActive(rollHandlerId))) {
      Logger.error(rollHandlerId, game.i18n.localize("tokenActionHud.handlerNotFound"));
      rollHandlerId = "core";
      Utils.setSetting("rollHandler", rollHandlerId);
    }

    const rollHandler = this.getRollHandler(rollHandlerId);
    this.addPreHandlers(rollHandler);
    this.#addRollHandlerExtenders(rollHandler);
    return rollHandler;
  }

  /* -------------------------------------------- */

  /**
   * Add pre-handlers
   * @public
   * @param {object} rollHandler
   */
  addPreHandlers(rollHandler) {
    rollHandler.addPreRollHandler(new CompendiumMacroPreHandler());

    if (Utils.isModuleActive("itemacro") && !Utils.isModuleActive("midi-qol")) {
      rollHandler.addPreRollHandler(new ItemMacroPreRollHandler());
    }
  }

  /* -------------------------------------------- */

  /**
   * Add roll handler extensions
   * @public
   * @param {class} rollHandler The roll handler
   */
  #addRollHandlerExtenders(rollHandler) {
    Hooks.callAll("tokenActionHudCoreAddRollHandlerExtenders", rollHandler);
  }

  /* -------------------------------------------- */

  /**
   * Register module settings
   * @public
   */
  registerSettingsCore() {
    const rollHandlers = this.getAvailableRollHandlers();
    registerSettingsCore(this, rollHandlers, this.styles);
  }

  /* -------------------------------------------- */

  /**
   * Add handler
   * @param {Array} choices The choices
   * @param {string} id     The module id
   */
  static addHandler(choices, id) {
    if (Utils.isModuleActive(id)) {
      const title = Utils.getModuleTitle(id);
      foundry.utils.mergeObject(choices, { [id]: title });
    }
  }
}

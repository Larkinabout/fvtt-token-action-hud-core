import { registerSettingsCore } from "../core/settings.mjs";
import { ItemMacroActionHandlerExtender } from "../handlers/action-handlers/item-macro-extender.mjs";
import { CompendiumMacroPreHandler } from "../handlers/roll-handlers/compendium-macro-pre-handler.mjs";
import { ItemMacroPreRollHandler } from "../handlers/roll-handlers/pre-item-macro.mjs";
import { MODULE, CSS_STYLE } from "../core/constants.mjs";
import { Logger, Utils } from "../core/utils.mjs";

export class SystemManager {
  constructor() {
    this.coreModuleId = MODULE.ID;
    this.defaults = [];
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
   * @returns {Array} The defaults
   */
  async registerDefaultsCore() {
    const defaults = await this.registerDefaults() ?? [];

    Hooks.callAll("tokenActionHudCoreRegisterDefaults", defaults);

    if (defaults) {
      this.defaults = defaults;
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
   * @param {class} dataHandler   The data handler
   * @returns {class}             The action handler
   */
  getActionHandlerCore(dataHandler) {
    const actionHandler = this.getActionHandler();
    actionHandler.systemManager = this;
    actionHandler.dataHandler = dataHandler;
    this.#addActionHandlerExtenders(actionHandler);

    Hooks.callAll("tokenActionHudCoreAddActionHandler", actionHandler);

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
   * @param {class} actionHandler The action handler
   * @returns {class} The roll handler
   */
  getRollHandlerCore(actionHandler) {
    let rollHandlerId = Utils.getSetting("rollHandler");

    if (!(rollHandlerId === "core" || Utils.isModuleActive(rollHandlerId))) {
      Logger.error(rollHandlerId, game.i18n.localize("tokenActionHud.handlerNotFound"));
      rollHandlerId = "core";
      Utils.setSetting("rollHandler", rollHandlerId);
    }

    const rollHandler = this.getRollHandler(rollHandlerId);
    rollHandler.actionHandler = actionHandler;

    this.addPreHandlers(rollHandler);
    this.#addRollHandlerExtenders(rollHandler);

    Hooks.callAll("tokenActionHudCoreAddRollHandler", rollHandler);

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

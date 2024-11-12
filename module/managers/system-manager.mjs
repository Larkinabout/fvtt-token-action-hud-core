import { registerSettingsCore } from "../core/settings.mjs";
import { ItemMacroActionHandlerExtender } from "../handlers/action-handlers/item-macro-extender.mjs";
import { RollHandler } from "../handlers/roll-handlers/roll-handler.mjs";
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

  getRollHandler(rollHandlerId) {
    return false;
  }

  getAvailableRollHandlers() {}

  registerSettings(onChangeFunction) {}

  async registerDefaults() {}

  registerStyles() {}

  /* -------------------------------------------- */

  /**
   * Initialise the system manager
   */
  async init() {
    await this.#registerDefaultsCore();
    this.#registerStylesCore();
    this.#registerSettingsCore();
  }


  /* -------------------------------------------- */

  /**
   * Register defaults
   * @private
   * @returns {Array} The defaults
   */
  async #registerDefaultsCore() {
    const defaults = await this.registerDefaults() ?? [];

    Hooks.callAll("tokenActionHudCoreRegisterDefaults", defaults);

    if (defaults) {
      this.defaults = defaults;
    }
  }

  /* -------------------------------------------- */

  /**
   * Register styles
   * @private
   */
  #registerStylesCore() {
    const systemStyles = this.registerStyles() ?? {};
    this.styles = foundry.utils.mergeObject(CSS_STYLE, systemStyles);

    Hooks.callAll("tokenActionHudCoreRegisterStyles", this.styles);
  }

  /* -------------------------------------------- */

  /**
   * Register module settings
   * @private
   */
  #registerSettingsCore() {
    const rollHandlers = this.getAvailableRollHandlers();
    registerSettingsCore(this, rollHandlers, this.styles);
  }

  /* -------------------------------------------- */

  /**
   * Initialise the action handler
   * @public
   * @param {class} hudManager The HudManager instance
   * @returns {class}          The ActionHandler instance
   */
  getActionHandlerCore(hudManager) {
    const actionHandler = this.getActionHandler();
    actionHandler.systemManager = this;

    const { dataHandler, groupHandler } = hudManager;
    actionHandler.hudManager = hudManager;
    actionHandler.dataHandler = dataHandler;
    actionHandler.groupHandler = groupHandler;
    actionHandler.addGroup = groupHandler.addGroup.bind(groupHandler);
    actionHandler.addGroupInfo = groupHandler.addGroupInfo.bind(groupHandler);
    this.#addActionHandlerExtenders(groupHandler, actionHandler);

    Hooks.callAll("tokenActionHudCoreAddActionHandler", actionHandler);

    return actionHandler;
  }

  /* -------------------------------------------- */

  /**
   * Add action handler extensions
   * @public
   * @param {class} groupHandler The GroupHandler instance
   * @param {class} actionHandler The ActionHandler instance
   */
  #addActionHandlerExtenders(groupHandler, actionHandler) {
    if (Utils.isModuleActive("itemacro") && !Utils.isModuleActive("midi-qol")) {
      actionHandler.addActionHandlerExtender(new ItemMacroActionHandlerExtender(groupHandler, actionHandler));
    }

    Hooks.callAll("tokenActionHudCoreAddActionHandlerExtenders", actionHandler);
  }

  /* -------------------------------------------- */

  /**
   * Get the roll handler
   * @public
   * @param {class} hudManager The HudManager instance
   * @returns {class}          The RollHandler instance
   */
  getRollHandlerCore(hudManager) {
    let rollHandlerId = Utils.getSetting("rollHandler");

    if (!(rollHandlerId === "core" || Utils.isModuleActive(rollHandlerId))) {
      Logger.error(rollHandlerId, game.i18n.localize("tokenActionHud.handlerNotFound"));
      rollHandlerId = "core";
      Utils.setSetting("rollHandler", rollHandlerId);
    }

    // If no system RollHandler is returned, use core RollHandler
    const rollHandler = this.getRollHandler(rollHandlerId) ?? new RollHandler();
    rollHandler.hudManager = hudManager;

    this.#addRollHandlerExtenders(rollHandler);

    Hooks.callAll("tokenActionHudCoreAddRollHandler", rollHandler);

    return rollHandler;
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

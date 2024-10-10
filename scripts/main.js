import { MODULE, TEMPLATE } from "./constants.js";
import { DataHandler } from "./data-handler.js";
import { MigrationManager } from "./migration-manager.js";
import { TokenActionHud } from "./applications/token-action-hud.js";
import { Logger, Utils } from "./utils.js";
import { registerSocket, getSocket, isSocketlibActive } from "./sockets.js";
import { registerApi } from "./api.js";

let systemManager;

/**
 * Register hooks
 */
Hooks.once("socketlib.ready", registerSocket);
Hooks.on("ready", registerApi);
Hooks.on("tokenActionHudSystemReady", registerCoreModule);
Hooks.on("tokenActionHudCoreReady", registerHud);
Hooks.on("renderHotbar", (_, html) => addContextMenuListener(html, "li.macro"));
Hooks.on("renderSceneNavigation", (_, html) => addContextMenuListener(html, "li.scene.nav-item"));

/* -------------------------------------------- */

/**
 * Register the core module
 * @param {object} systemModule The system module
 */
async function registerCoreModule(systemModule) {
  // Exit if core module version is not compatible with the system module
  if (!Utils.isSystemModuleCompatible(systemModule.api.requiredCoreModuleVersion)) return;

  // Exit if socketlit module is not installed or enabled
  if (!isSocketlibActive()) return;

  // Create new SystemManager and register core and system module settings
  systemManager = new systemModule.api.SystemManager(MODULE.ID);
  systemManager.registerStylesCore();
  systemManager.registerSettingsCore();

  // Set stylesheet to 'style' core module setting
  Utils.switchCSS(Utils.getSetting("style"));

  // Register Handlebar helpers
  Utils.registerHandlebars();

  // Load templates
  loadTemplates(Object.values(TEMPLATE));

  Hooks.callAll("tokenActionHudCoreReady");
}

/* -------------------------------------------- */

/**
 * Register the TokenActionHud application
 */
async function registerHud() {
  // Initialise DataHandler
  const dataHandler = new DataHandler(getSocket());
  await dataHandler.init();

  // Initialise MigrationManager
  const migrationManager = new MigrationManager(dataHandler, getSocket());
  await migrationManager.init();

  checkColorPicker();
  createDirectories(dataHandler);
  registerHudHooks();

  // If no Token Action Hud application exists, create a new TokenActionHud and initialise it
  if (!game.tokenActionHud) {
    game.tokenActionHud = new TokenActionHud(systemManager, dataHandler, getSocket());
    await game.tokenActionHud.init();
  }

  game.tokenActionHud.update({ type: "hook", name: "tokenActionHudCoreReady" });
}

/* -------------------------------------------- */

/**
 * Notify GM if the Color Picker is not active
 */
function checkColorPicker() {
  if (game.user.isGM && !game.modules.get("color-picker")?.active && Utils.getSetting("startup") === false) {
    Logger.info("To enable color pickers, install the 'Color Picker' module.", true);
    Utils.setSetting("startup", true);
  }
}

/* -------------------------------------------- */

/**
 * If user is the GM and 'Enable Customization' is enabled, create directories for the layout files
 * @param {DataHandler} dataHandler The data handler
 */
async function createDirectories(dataHandler) {
  if (game.user.isGM && Utils.getSetting("enableCustomization")) {
    await dataHandler.createDirectories();
  }
}

/* -------------------------------------------- */

/**
 * Register HUD-related hooks
 */
function registerHudHooks() {
  Hooks.on("renderTokenActionHud", () => game.tokenActionHud.postRender());
  const hooks = [
    "deleteActor", "updateActor", "createActiveEffect", "deleteActiveEffect",
    "createCombat", "deleteCombat", "updateCombat", "updateCombatant",
    "deleteCompendium", "updateCompendium", "createItem", "deleteItem",
    "updateItem", "deleteMacro", "updateMacro", "controlToken", "deleteToken",
    "updateToken", "closeSettingsConfig", "forceUpdateTokenActionHud"
  ];

  hooks.forEach(hook => Hooks.on(hook, (...args) => handleHookEvent(...args, hook)));
}

/* -------------------------------------------- */

/**
 * Handle hook events
 * @param {object} hookData The hook data
 * @param {string} hookName The hook name
 */
function handleHookEvent(hookData, hookName) {
  if (!validateHookData(hookData, hookName)) return;
  game.tokenActionHud.update({ type: "hook", name: hookName, data: hookData });
}

/* -------------------------------------------- */

/**
 * Validate hook data
 * @param {object} hookData The hook data
 * @param {string} hookName The hook name
 * @returns {boolean}
 */
function validateHookData(hookData, hookName) {
  switch (hookName) {
    case "deleteActor":
    case "updateActor":
      return game.tokenActionHud.isValidActorOrItemUpdate(hookData.actor, hookData.data);
    case "createActiveEffect":
    case "deleteActiveEffect":
      return game.tokenActionHud.isSelectedActor(hookData.activeEffect.parent);
    case "createCombatant":
    case "updateCombatant":
      return game.tokenActionHud.isSelectedActor(hookData.combatant.actor);
    case "deleteCompendium":
    case "updateCompendium":
      return validateCompendium(hookData.source?.metadata?.id);
    case "createItem":
    case "deleteItem":
    case "updateItem":
      return game.tokenActionHud.isValidActorOrItemUpdate(hookData.item?.actor);
    case "deleteMacro":
    case "updateMacro":
      game.tokenActionHud.actionHandler.macroActionHandler.macroActions = null;
      return true;
    case "updateToken":
      return Object.hasOwn(hookData.data, "hidden") && game.tokenActionHud.isValidTokenChange(hookData.token, hookData.data);
    default:
      return true;
  }
}

/* -------------------------------------------- */

/**
 * Validate compendium hook
 * @param {string} id The compendium ID
 * @returns {boolean} Whether the compendium hook is valid
 */
function validateCompendium(id) {
  const compendiumHandler = game.tokenActionHud.actionHandler.compendiumActionHandler;
  if (!compendiumHandler.isLinkedCompendium(id)) return false;
  compendiumHandler.compendiumActions = new Map();
  return true;
}

/* -------------------------------------------- */

/**
 * Add context menu listeners
 * @param {object} html     The HTML
 * @param {string} selector The selector for the HTML element
 */
function addContextMenuListener(html, selector) {
  const element = html[0].querySelector(selector);
  if (element) element.addEventListener("contextmenu", sendHudToBottom);
}

/* -------------------------------------------- */

/**
 * Send HUD to bottom
 */
function sendHudToBottom() {
  if (game.tokenActionHud?.element) {
    game.tokenActionHud.element.style.zIndex = 0;
  }
}

import { MODULE, TEMPLATE } from "./core/constants.mjs";
import { DataHandler } from "./handlers/data-handler.mjs";
import { MigrationManager } from "./managers/migration-manager.mjs";
import { TokenActionHud } from "./applications/token-action-hud.mjs";
import { Logger, Utils } from "./core/utils.mjs";
import { registerSocket, getSocket, isSocketlibActive } from "./core/sockets.mjs";
import { registerApi } from "./core/api.mjs";

let systemManager;

/**
 * Register hooks
 */
Hooks.once("socketlib.ready", registerSocket);
Hooks.on("ready", registerApi);
Hooks.on("tokenActionHudSystemReady", registerCoreModule);
Hooks.on("tokenActionHudCoreReady", registerHud);
Hooks.on("renderHotbar", (_, html) => addContextMenuListener(html, foundry.utils.isNewerVersion(game.version, "12.999") ? "li.slot" : "li.macro"));
Hooks.on("renderSceneNavigation", (_, html) => addContextMenuListener(html, foundry.utils.isNewerVersion(game.version, "12.999") ? "li.ui-control" : "li.scene.nav-item"));

/* -------------------------------------------- */

/**
 * Register the core module
 * @param {object} systemModule The system module
 */
async function registerCoreModule(systemModule) {
  // Exit if core module version is not compatible with the system module
  if (!Utils.isSystemModuleCompatible(systemModule.api?.requiredCoreModuleVersion)) return;

  // Exit if socketlit module is not installed or enabled
  if (!isSocketlibActive()) return;

  // Create new SystemManager and register core and system module settings
  systemManager = new systemModule.api.SystemManager(MODULE.ID);
  await systemManager.init();

  // Register Handlebar helpers
  Utils.registerHandlebars();

  // Load templates
  if (foundry.utils.isNewerVersion(game.version, "12.9999")) {
    foundry.applications.handlebars.loadTemplates(Object.values(TEMPLATE));
  } else {
    loadTemplates(Object.values(TEMPLATE));
  }

  Hooks.callAll("tokenActionHudCoreReady");
}

/* -------------------------------------------- */

/**
 * Register the TokenActionHud application
 */
async function registerHud() {
  // Get socket
  const socket = getSocket();

  // Initialise DataHandler
  const dataHandler = new DataHandler(socket);
  await dataHandler.init();

  // Initialise MigrationManager
  const migrationManager = new MigrationManager(dataHandler, socket);
  await migrationManager.init();

  checkColorPicker();
  registerHudHooks();

  game.tokenActionHud = new TokenActionHud(systemManager, dataHandler, socket);
  await game.tokenActionHud.init();

  Hooks.callAll("tokenActionHudReady");

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

  hooks.forEach(hook => Hooks.on(hook, (...args) => handleHookEvent({ ...args }, hook)));
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
      return game.tokenActionHud.isValidActorOrItemUpdate(hookData[0], hookData[1]);
    case "createActiveEffect":
    case "deleteActiveEffect":
      return game.tokenActionHud.isControlledActor(hookData[0]?.parent);
    case "createCombatant":
    case "updateCombatant":
      return game.tokenActionHud.isControlledActor(hookData[0]?.actor);
    case "deleteCompendium":
    case "updateCompendium":
      return validateCompendium(hookData.source?.metadata?.id);
    case "createItem":
    case "deleteItem":
    case "updateItem":
      return game.tokenActionHud.isValidActorOrItemUpdate(hookData[0]?.actor);
    case "deleteMacro":
    case "updateMacro":
      game.tokenActionHud.actionHandler.macroActionHandler.macroActions = null;
      return true;
    case "updateToken":
      return Object.hasOwn(hookData[1], "hidden") && game.tokenActionHud.isValidTokenChange(hookData[0], hookData[1]);
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
  if (!game.tokenActionHud) return false;
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
    game.tokenActionHud.element.style.zIndex = 20;
  }
}

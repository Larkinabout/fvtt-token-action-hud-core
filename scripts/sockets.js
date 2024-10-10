import { MODULE } from "./constants.js";
import { DataHandler } from "./data-handler.js";
import { TokenActionHud } from "./applications/token-action-hud.js";

let socket;

/**
 * Register socket with socketlib module
 */
export function registerSocket() {
  socket = socketlib.registerModule(MODULE.ID);
  socket.register("getFilePaths", DataHandler.getFilePathsWithSocket);
  socket.register("getData", DataHandler.getDataWithSocket);
  socket.register("saveData", DataHandler.saveDataWithSocket);
  socket.register("reset", TokenActionHud.reset);
}

/**
 * Whether the socketlib module is active
 * @returns {boolean} Whether the socketlib module is active
 */
export function isSocketlibActive() {
  if (game.modules.get("socketlib")?.active) return true;

  Logger.error("This module requires the 'socketlib' module to be installed and enabled.", true);
  return false;
}


/**
 * Get the socket
 * @returns {object} The socket
 */
export function getSocket() {
  return socket;
}

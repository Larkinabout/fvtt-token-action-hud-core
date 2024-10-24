import { MODULE } from "./constants.mjs";
import { DataHandler } from "../handlers/data-handler.mjs";
import { TokenActionHud } from "../applications/token-action-hud.mjs";

let socket;

/**
 * Register socket with socketlib module
 */
export function registerSocket() {
  socket = socketlib.registerModule(MODULE.ID);
  socket.register("getFilePaths", DataHandler.getFilePathsWithSocket);
  socket.register("getData", DataHandler.getDataWithSocket);
  socket.register("saveData", DataHandler.saveDataWithSocket);
  socket.register("reset", TokenActionHud.resetLayoutWithSocket);
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

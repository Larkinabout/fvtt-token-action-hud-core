import { MODULE } from "./constants.js";
import { DataHandler } from "./data-handler.js";
import { TokenActionHud } from "./applications/token-action-hud.js";

let socket;

/**
 * Register socket with socketlib module
 */
export function registerSocket() {
  socket = socketlib.registerModule(MODULE.ID);
  socket.register("getFilePaths", DataHandler.getFilePaths);
  socket.register("getData", DataHandler.getData);
  socket.register("saveData", DataHandler.saveData);
  socket.register("reset", TokenActionHud.reset);
}

/**
 * Get the socket
 * @returns {object} The socket
 */
export function getSocket() {
  return socket;
}

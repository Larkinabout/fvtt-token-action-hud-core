import { PreRollHandler } from "./pre-roll-handler.mjs";
import { COMPENDIUM_ACTION_TYPES } from "../../core/constants.mjs";

export class CompendiumMacroPreHandler extends PreRollHandler {
  /**
   * Pre-handle action event
   * @param {object} event        The event
   * @param {string} buttonValue  The button value
   * @param {class} actionHandler The action handler
   * @returns {boolean}
   */
  prehandleActionEvent(event, buttonValue, actionHandler) {
    const { actionType, documentId, packId, soundId } = this.action.system;

    if (!COMPENDIUM_ACTION_TYPES.includes(actionType)) return false;

    switch (actionType) {
      case "compendiumEntry":
        this.#handleCompendium(packId, documentId);
        break;
      case "compendiumMacro":
        this.#handleMacroCompendium(packId, documentId);
        break;
      case "compendiumPlaylist":
        this.#handlePlaylistCompendium(packId, documentId, soundId);
        break;
      case "macro":
        this.#handleMacro(packId);
        break;
      default:
        return false;
    }

    return true;
  }

  /* -------------------------------------------- */

  /**
   * Handle compendium
   * @private
   * @param {string} packId     The pack ID
   * @param {string} documentId The document ID
   */
  #handleCompendium(packId, documentId) {
    const pack = game.packs.get(packId);
    pack.getDocument(documentId).then(entity => entity.sheet.render(true));
  }

  /* -------------------------------------------- */

  /**
   * Handle macro compendium
   * @private
   * @param {string} packId     The pack ID
   * @param {string} documentId The document ID
   */
  #handleMacroCompendium(packId, documentId) {
    const pack = game.packs.get(packId);
    pack.getDocument(documentId).then(entity => entity.execute());
  }

  /* -------------------------------------------- */

  /**
   * Handle playlist compendium
   * @private
   * @param {string} packId     The pack ID
   * @param {string} documentId The document ID
   * @param {string} soundId    The sound ID
   */
  async #handlePlaylistCompendium(packId, documentId, soundId) {
    const pack = game.packs.get(packId);
    const playlist = await pack.getDocument(documentId);
    const sound = playlist.sounds.find(sound => sound._id === soundId);
    AudioHelper.play({ src: sound.path }, {});
  }

  /* -------------------------------------------- */

  /**
   * Handle macro
   * @private
   * @param {string} packId The pack ID
   */
  #handleMacro(packId) {
    game.macros.get(packId).execute();
  }
}

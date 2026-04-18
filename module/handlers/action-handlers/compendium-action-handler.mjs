import { ACTION_TYPE, COMPENDIUM_PACK_TYPES } from "../../core/constants.mjs";
import { Utils } from "../../core/utils.mjs";

/**
 * Handler for building the HUD's compendium actions.
 */
export class CompendiumActionHandler {
  actionHandler;

  compendiumActions;

  packIds;

  constructor(actionHandler) {
    this.actionHandler = actionHandler;
    this.compendiumActions = new Map();
    this.packIds = [];
  }

  /* -------------------------------------------- */
  /* BUILD                                        */
  /* -------------------------------------------- */

  /**
   * Build compendium actions.
   */
  async buildActions() {
    if (!Utils.getSetting("enableCompendiumActions")) return;

    if (this.compendiumActions.size === 0) {
      this.packIds = game.packs
        .filter(
          pack =>
            COMPENDIUM_PACK_TYPES.includes(pack.documentName)
              && (foundry.utils.isNewerVersion(game.version, "10") ? pack.visible : !pack.private || game.user.isGM)
        )
        .map(pack => pack.metadata.id);

      if (this.packIds.length === 0) return;

      await Promise.all(this.packIds.map(packId => this.#setActions(packId)));
    }

    for (const pack of this.compendiumActions.values()) {
      this.actionHandler.addActions(pack.actions, pack.groupData);
    }
  }

  /* -------------------------------------------- */

  /**
   * Set compendium actions into the compendiumActions map.
   * @param {string} packId
   */
  async #setActions(packId) {
    const pack = game.packs.get(packId);
    const entries = pack ? pack.index.size > 0 ? pack.index : await pack.getIndex() : null;
    if (!entries) return;
    const actionType = this.#getCompendiumActionType(pack?.documentName);
    if (!actionType) return;
    const actions = entries.map(entry => (
      this.actionHandler.createAction(
        {
          id: entry._id,
          name: entry.name,
          listName: `${game.i18n.localize(ACTION_TYPE[actionType])}: ${entry.name}`,
          img: Utils.getImage(entry),
          onClick: this.#getOnClick(actionType, pack, entry._id)
        })
    ));
    const groupData = { id: this.#getGroupId(packId), type: "core" };
    this.compendiumActions.set(packId, { actions, groupData });
  }

  /* -------------------------------------------- */
  /* HELPERS                                      */
  /* -------------------------------------------- */

  /**
   * Get compendium action type based on document name.
   * @param {string} documentName
   * @returns {string} Compendium action type
   */
  #getCompendiumActionType(documentName) {
    switch (documentName) {
      case "Macro":
        return "compendiumMacro";
      default:
        return "compendiumEntry";
    }
  }

  /* -------------------------------------------- */

  /**
   * Get on click function.
   * @param {string} actionType
   * @param {object} pack
   * @param {string} documentId
   * @returns {Function}
   */
  #getOnClick(actionType, pack, documentId) {
    switch (actionType) {
      case "compendiumMacro":
        return this.#getOnClickFunction(pack, documentId);
      default:
        return this.#getOnClickEntry(pack, documentId);
    }
  }

  /* -------------------------------------------- */

  /**
   * Get on click function for compendium journal entry.
   * @param {object} pack
   * @param {string} documentId
   * @returns {Function}
   */
  #getOnClickEntry(pack, documentId) {
    return async () => {
      const journalEntry = await pack.getDocument(documentId);
      journalEntry.sheet.render(true); };
  }

  /* -------------------------------------------- */

  /**
   * Get on click function for compendium macro.
   * @param {object} pack
   * @param {string} documentId
   * @returns {Function}
   */
  #getOnClickFunction(pack, documentId) {
    return async () => {
      await pack.getDocument(documentId).then(macro => macro.execute());
    };
  }

  /* -------------------------------------------- */

  /**
   * Get the group ID from the pack ID.
   * @param {string} packId
   * @returns {string} Group ID
   */
  #getGroupId(packId) {
    return packId.replace(".", "-");
  }

  /* -------------------------------------------- */
  /* LOOKUPS                                      */
  /* -------------------------------------------- */

  /**
   * Whether the compendium is linked.
   * @public
   * @param {string} packId
   * @returns {boolean} Whether the compendium is linked
   */
  isLinkedCompendium(packId) {
    return (this.packIds.length)
      ? this.packIds?.includes(packId)
      : false;
  }
}

import { GROUP_TYPE } from "../../core/constants.mjs";
import { Utils } from "../../core/utils.mjs";

/**
 * Handler for building the HUD's generic actions.
 */
export class GenericActionHandler {
  constructor(actionHandler) {
    this.actionHandler = actionHandler;
    this.actor = actionHandler.actor;
    this.token = actionHandler.token;
  }

  /* -------------------------------------------- */

  /**
   * Build generic actions
   * @public
   */
  buildGenericActions() {
    this.#buildUtilities();
  }

  /* -------------------------------------------- */

  /**
   * Build utilities
   * @private
   */
  #buildUtilities() {
    if (this.actor) {
      this.#buildSingleTokenUtilities();
    } else {
      this.#buildMultipleTokenUtilities();
    }
  }

  /* -------------------------------------------- */

  /**
   * Build utilities for a single token
   * @private
   */
  #buildSingleTokenUtilities() {
    if (!this.token) return;
    const actionsData = [];

    const actionType = "utility";

    // Build Toggle Combat action
    const toggleCombatId = "toggleCombat";
    const toggleCombatName = this.token?.inCombat
      ? game.i18n.localize("tokenActionHud.removeFromCombat")
      : game.i18n.localize("tokenActionHud.addToCombat");
    const toggleCombatAction = {
      id: toggleCombatId,
      name: toggleCombatName,
      system: {
        actionType
      }
    };
    actionsData.push(toggleCombatAction);

    // Build Toggle Visibility action
    if (game.user.isGM) {
      const toggleVisibilityId = "toggleVisibility";
      const toggleVisibilityName = this.token?.document?.hidden
        ? game.i18n.localize("tokenActionHud.makeVisible")
        : game.i18n.localize("tokenActionHud.makeInvisible");
      const toggleVisibilityAction = {
        id: toggleVisibilityId,
        name: toggleVisibilityName,
        system: {
          actionType
        }
      };
      actionsData.push(toggleVisibilityAction);
    }

    const groupData = { id: "token", type: GROUP_TYPE.SYSTEM };

    // Add actions to HUD
    this.actionHandler.addActions(actionsData, groupData);
  }

  /* -------------------------------------------- */

  /**
   * Build utilities for multiple tokens
   * @private
   */
  #buildMultipleTokenUtilities() {
    const tokens = Utils.getControlledTokens();
    const actionsData = [];

    const actionType = "utility";

    // Toggle Combat
    const toggleCombatId = "toggleCombat";
    const toggleCombatName = tokens.every(token => token.inCombat)
      ? game.i18n.localize("tokenActionHud.removeFromCombat")
      : game.i18n.localize("tokenActionHud.addToCombat");
    const toggleCombatAction = {
      id: toggleCombatId,
      name: toggleCombatName,
      system: {
        actionType
      }
    };
    actionsData.push(toggleCombatAction);

    // Toggle Visibility
    if (game.user.isGM) {
      const toggleVisibilityId = "toggleVisibility";
      const toggleVisibilityname = tokens.every(token => token.document?.hidden)
        ? game.i18n.localize("tokenActionHud.makeVisible")
        : game.i18n.localize("tokenActionHud.makeInvisible");
      const toggleVisibilityAction = {
        id: toggleVisibilityId,
        name: toggleVisibilityname,
        system: {
          actionType
        }
      };
      actionsData.push(toggleVisibilityAction);
    }

    const groupData = { id: "token", type: GROUP_TYPE.SYSTEM };

    // Add actions to HUD
    this.actionHandler.addActions(actionsData, groupData);
  }
}

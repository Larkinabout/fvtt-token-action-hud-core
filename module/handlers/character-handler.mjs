import { Utils } from "../core/utils.mjs";

export class CharacterHandler {
  constructor(hudManager) {
    this.hudManager = hudManager;
    this.groupHandler = hudManager.groupHandler;
    this.actionHandler = hudManager.actionHandler;
    this.rollHandler = hudManager.rollHandler;
  }

  /**
   * Initialise Character Handler
   */
  init() {
    this.previousActorId = this.actor?.id;
    this.setCharacter();
  }

  /* -------------------------------------------- */

  /**
   * Whether there is a character
   * @returns {boolean} Whether there is a character
   */
  get isCharacter() {
    return this.actor || this.isMultipleTokens;
  }

  /* -------------------------------------------- */

  /**
   * Whether there is multiple tokens
   * @returns {boolean} Whether there is multiple tokens
   */
  get isMultipleTokens() {
    const controlledTokens = Utils.getControlledTokens();
    return controlledTokens.length > 1 && !this.actor;
  }

  /* -------------------------------------------- */

  /**
   * Whether the current actor is the same actor
   * @returns {boolean} Whether the current actor is the same actor
   */
  get isSameActor() {
    return this.previousActorId !== this.actor?.id;
  }

  /* -------------------------------------------- */

  /**
   * Set character based on controlled tokens
   * @private
   */
  setCharacter() {
    this.resetCharacter();
    const controlledTokens = Utils.getControlledTokens();
    if (controlledTokens.length > 1) {
      this.#handleMultipleTokens(controlledTokens);
    } else {
      this.#handleSingleToken(controlledTokens);
    }
  }

  /* -------------------------------------------- */

  /**
   * Reset actor and token properties
   */
  resetCharacter() {
    this.token = null;
    this.actor = null;
    this.tokens = [];
    this.actors = [];
  }

  /* -------------------------------------------- */

  /**
   * Handle multiple controlled tokens
   * @param {*} controlledTokens
   */
  #handleMultipleTokens(controlledTokens) {
    this.characterName = game.i18n.localize("tokenActionHud.multiple");

    // Empty singulars
    this.token = null;
    this.actor = null;

    // Set multiples
    this.tokens = controlledTokens;
    this.actors = Utils.getControlledActors();
  }

  /* -------------------------------------------- */

  /**
   * Handle a single controlled token
   * @private
   * @param {Array} controlledTokens The controlled tokens
   */
  #handleSingleToken(controlledTokens) {
    const character = { token: null, actor: null };

    if (controlledTokens.length === 1 && this.#isValidCharacter(controlledTokens[0])) {
      character.token = controlledTokens[0];
      character.actor = character.token?.actor;
    } else if (controlledTokens.length === 0 && game.user.character && Utils.getSetting("alwaysShowHud")) {
      character.actor = game.user.character;
      character.token = canvas.tokens?.placeables.find(t => t.actor?.id === character.actor.id) ?? null;
    }

    if (!character.actor) return;

    this.characterName = character.token?.name ?? character.actor.name;

    // Set in this class
    this.token = character.token;
    this.actor = character.actor;
    this.tokens = [character.token];
    this.actors = [character.actor];
  }

  /* -------------------------------------------- */

  /**
   * Whether the character is a valid selection for the current user
   * @private
   * @param {object} [token = {}] The token
   * @returns {boolean}           Whether the character is a valid selection for the current user
   */
  #isValidCharacter(token = {}) {
    return game.user.isGM || token.actor?.testUserPermission(game.user, "OWNER");
  }

}

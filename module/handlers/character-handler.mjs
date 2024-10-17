import { Utils } from "../core/utils.mjs";

export class CharacterHandler {
  constructor(tokenActionHud, actionHandler, rollHandler) {
    this.tokenActionHud = tokenActionHud;
    this.actionHandler = actionHandler;
    this.rollHandler = rollHandler;
  }

  init() {
    this.previousActorId = this.actor?.id;
    this.setCharacter();
  }

  get multipleTokens() {
    const controlledTokens = Utils.getControlledTokens();
    return controlledTokens.length > 1 && !this.actor;
  }

  get isSameActor() {
    return this.previousActorId !== this.actor?.id;
  }

  get isCharacter() {
    return this.actor || this.multipleTokens;
  }

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

  /**
   * Reset actor and token properties
   */
  resetCharacter() {
    this.token = null;
    this.actor = null;
    this.tokenActionHud.token = null;
    this.tokenActionHud.actor = null;
    this.actionHandler.token = null;
    this.actionHandler.actor = null;
    this.rollHandler.token = null;
    this.rollHandler.actor = null;
    this.tokens = [];
    this.actors = [];
    this.actionHandler.tokens = this.tokens;
    this.actionHandler.actors = this.actors;
    this.rollHandler.tokens = this.tokens;
    this.rollHandler.actors = this.actors;
  }

  /* -------------------------------------------- */

  /**
   * Handle multiple controlled tokens
   * @param {*} controlledTokens
   */
  #handleMultipleTokens(controlledTokens) {
    this.characterName = game.i18n.localize("tokenActionHud.multiple");
    this.actionHandler.characterName = game.i18n.localize("tokenActionHud.multiple");

    // Empty singulars
    this.token = null;
    this.actor = null;
    this.tokenActionHud.token = null;
    this.tokenActionHud.actor = null;
    this.actionHandler.token = null;
    this.actionHandler.actor = null;
    this.rollHandler.token = null;
    this.rollHandler.actor = null;

    // Set multiples
    this.tokens = controlledTokens;
    this.actors = Utils.getControlledActors();
    this.actionHandler.tokens = this.tokens;
    this.actionHandler.actors = this.actors;
    this.rollHandler.tokens = this.tokens;
    this.rollHandler.actors = this.actors;
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
    } else if (controlledTokens.length === 0 && game.user.character && this.alwaysShowSetting) {
      character.actor = game.user.character;
      character.token = canvas.tokens?.placeables.find(t => t.actor?.id === character.actor.id) ?? null;
    }

    if (!character.actor) return;

    this.characterName = character.token?.name ?? character.actor.name;
    this.actionHandler.characterName = this.characterName;

    // Set in this class
    this.token = character.token;
    this.actor = character.actor;
    this.tokens = [character.token];
    this.actors = [character.actor];

    // Set in other classes for easy access
    this.tokenActionHud.token = character.token;
    this.tokenActionHud.actor = character.actor;
    this.actionHandler.token = character.token;
    this.actionHandler.actor = character.actor;
    this.actionHandler.tokens = this.tokens;
    this.actionHandler.actors = this.actors;
    this.rollHandler.token = character.token;
    this.rollHandler.actor = character.actor;
    this.rollHandler.tokens = this.tokens;
    this.rollHandler.actors = this.actors;
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

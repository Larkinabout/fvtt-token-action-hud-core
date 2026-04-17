
import { CharacterHandler } from "../handlers/character-handler.mjs";
import { LayoutHandler } from "../handlers/layout-handler.mjs";
import { GroupHandler } from "../handlers/group-handler.mjs";
import { Logger, Utils } from "../core/utils.mjs";

export class HudManager {
  constructor(tokenActionHud, systemManager, dataHandler, socket) {
    this.tokenActionHud = tokenActionHud;
    this.dataHandler = dataHandler;
    this.socket = socket;
    this.layoutHandler = new LayoutHandler(systemManager, dataHandler);
    this.groupHandler = new GroupHandler(this, systemManager, dataHandler, this.layoutHandler);
    this.actionHandler = systemManager.getActionHandlerCore(this, this.dataHandler, this.groupHandler);
    this.rollHandler = systemManager.getRollHandlerCore(this);
    this.characterHandler = new CharacterHandler(this);
  }

  /* -------------------------------------------- */
  /* INITIALISE                             */
  /* -------------------------------------------- */

  /**
   * Initialise the HUD
   * @param {string} trigger Update trigger name (e.g. "controlToken")
   * @returns {boolean} Whether the HUD was initialised
   */
  async init(trigger) {
    this.characterHandler.init();

    if ( !this.characterHandler.isCharacter || !this.isHudEnabled) return false;

    const options = (trigger === "controlToken" && this.characterHandler.isSameActor) ? { saveActor: true } : {};

    await this.#buildHud(options);

    return true;
  }

  /* -------------------------------------------- */
  /* RESET                                        */
  /* -------------------------------------------- */

  /**
   * Soft reset variables
   * @public
   */
  softResetHud() {
    this.hud = null;
    this.hud = [];
    this.groupHandler.softReset();
    this.layoutHandler.softReset();
    this.actionHandler.softReset();
  }

  /* -------------------------------------------- */

  /**
   * Hard reset variables
   * @public
   */
  hardResetHud() {
    this.softResetHud();
    this.groupHandler.hardReset();
    this.layoutHandler.hardReset();
  }

  /* -------------------------------------------- */
  /* BUILD                                        */
  /* -------------------------------------------- */

  /**
   * Build the HUD
   * @private
   * @param {object} options
   */
  async #buildHud(options) {
    Logger.debug("Building HUD...", { actor: this.actor, token: this.token });

    if (this.previousActor?.id === this.actor?.id) {
      this.isSameActor = true;
    } else {
      this.previousActor = this.actor;
      this.isSameActor = false;
    }

    this.softResetHud();

    await this.layoutHandler.init();
    await this.groupHandler.init();

    if (!this.dataHandler.canGetData && !this.isGmInactiveUserNotified) {
      Logger.info("Cannot retrieve HUD layout without GM present", true);
      this.isGmInactiveUserNotified = true;
    }

    this.hud = await this.#prepareHud();

    await this.actionHandler.buildActionsCore();
    this.groupHandler.setHasActions();
    await this.groupHandler.saveGroups(options);

    Logger.debug("HUD built", { hud: this.hud, actor: this.actor, token: this.token });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the HUD
   * @private
   * @returns {object} HUD
   */
  async #prepareHud() {
    Logger.debug("Preparing HUD...", { actor: this.actor, token: this.token });

    const name = (Utils.getSetting("displayCharacterName"))
      ? this.characterHandler.characterName ?? game.i18n.localize("tokenActionHud.multiple")
      : "";
    const actorId = this.actor?.id ?? "multi";
    const tokenId = this.token?.id ?? "multi";
    const hud = { name, tokenId, actorId, groups: [] };

    const groups = await this.groupHandler.prepareGroups(hud);
    this.actionHandler.prepareActions(groups);

    Logger.debug("HUD prepared", { hud, actor: this.actor, token: this.token });
    return hud;
  }

  /* -------------------------------------------- */
  /* EVENTS                                       */
  /* -------------------------------------------- */

  /**
   * Handle HUD event
   * @param {string} eventType Event type (e.g., clickAction)
   * @param {Event} event
   */
  handleHudEvent(eventType, event) {
    const group = (["groupClick"].includes(eventType)) ? this.getGroup(event) : null;
    const action = (["clickAction", "hoverAction"].includes(eventType)) ? this.getAction(event) : null;

    this.#setKeyPresses(event);
    this.#setIsHover(event);

    try {
      switch (eventType) {
        case "groupClick":
          if (Hooks.call("tokenActionHudCoreGroupClick", event, group, this) === false) return;
          this.rollHandler.handleGroupClickCore(event, group);
          break;
        case "clickAction":
          if (Hooks.call("tokenActionHudCoreActionClick", event, action, this) === false) return;
          this.rollHandler.handleActionClickCore(event, action, this.actionHandler);
          break;
        case "hoverAction":
          this.rollHandler.handleActionHoverCore(event, action);
      }
    } catch(error) {
      Logger.error(event);
    }
  }

  /**
   * Set key presses from the event.
   * @private
   * @param {Event} event
   */
  #setKeyPresses(event) {
    this.#setIsRightClick(event);
    this.#setIsAlt(event);
    this.#setIsCtrl(event);
    this.#setIsShift(event);
  }

  /* -------------------------------------------- */

  /**
   * Set `isRightClick` from the event.
   * @private
   * @param {Event} event
   */
  #setIsRightClick(event) {
    const button = event?.originalEvent?.button || event.button;
    this.isRightClick = button === 2;
  }

  /* -------------------------------------------- */

  /**
   * Set `isAlt` from the event.
   * @private
   * @param {Event} event
   */
  #setIsAlt(event) {
    const keyboardManager = foundry?.helpers?.interaction?.KeyboardManager ?? KeyboardManager;
    const isModiferActive = game.keyboard.isModifierActive(keyboardManager.MODIFIER_KEYS.ALT);
    if (event.altKey && !isModiferActive) {
      Logger.debug("Emulating LEFT ALT key press");
      keyboardManager.emulateKeypress(false, "AltLeft", { altKey: true, force: true });
      game.keyboard.downKeys.add("AltLeft");
      this.isAlt = true;
    } else {
      this.isAlt = isModiferActive;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set `isCtrl` from the event.
   * @private
   * @param {Event} event
   */
  #setIsCtrl(event) {
    const keyboardManager = foundry?.helpers?.interaction?.KeyboardManager ?? KeyboardManager;
    const isModiferActive = game.keyboard.isModifierActive(keyboardManager.MODIFIER_KEYS.CONTROL);
    if (event.ctrlKey && !isModiferActive) {
      Logger.debug("Emulating LEFT CTRL key press");
      keyboardManager.emulateKeypress(false, "ControlLeft", { ctrlKey: true, force: true });
      game.keyboard.downKeys.add("ControlLeft");
      this.isCtrl = true;
    } else {
      this.isCtrl = isModiferActive;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set `isShift` from the event.
   * @private
   * @param {Event} event
   */
  #setIsShift(event) {
    const keyboardManager = foundry?.helpers?.interaction?.KeyboardManager ?? KeyboardManager;
    const isModiferActive = game.keyboard.isModifierActive(keyboardManager.MODIFIER_KEYS.SHIFT);
    if (event.shiftKey && !isModiferActive) {
      Logger.debug("Emulating LEFT SHIFT key press");
      keyboardManager.emulateKeypress(false, "ShiftLeft", { shiftKey: true, force: true });
      game.keyboard.downKeys.add("ShiftLeft");
      this.isShift = true;
    } else {
      this.isShift = isModiferActive;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set `isHover` based on event.
   * @private
   * @param {Event} event
   */
  #setIsHover(event) {
    this.isHover = ["mouseenter", "mouseover", "pointerenter"].includes(event.type);
  }

  /* -------------------------------------------- */
  /* LOOKUPS                                      */
  /* -------------------------------------------- */

  /**
   * Get the group from the nest ID
   * @param {Event} event
   * @returns {object} Group
   */
  getGroup(event) {
    const groupElement = Utils.getClosestGroupElement(event);
    const nestId = groupElement?.dataset?.nestId;
    return this.groupHandler.getGroup({ nestId }) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the action from the action ID on the button
   * @param {Event} event
   * @returns {object} Action
   */
  getAction(event) {
    if (!event) return {};
    const actionButtonElement = event.target.closest('[data-part="actionButton"]')
      ?? event.target.querySelector('[data-part="actionButton"]');
    const actionId = actionButtonElement?.dataset?.actionId;
    if (!actionId) return {};
    return this.actionHandler.availableActions.get(actionId) || {};
  }

  /* -------------------------------------------- */
  /* STATE                                        */
  /* -------------------------------------------- */

  /**
   * Whether the HUD is enabled for the current user
   * @private
   * @returns {boolean}
   */
  get isHudEnabled() {
    if (!Utils.getSetting("enable")) return false;
    if (game.user.isGM) return true;
    return Utils.checkAllow(game.user.role, Utils.getSetting("allow"));
  }

  /* -------------------------------------------- */
  /* CHARACTER SHORTCUTS                          */
  /* -------------------------------------------- */

  get characterName() {
    return this.characterHandler?.characterName;
  }

  get actor() {
    return this.characterHandler?.actor;
  }

  set actor(actor) {
    this.characterHandler.actor = actor;
  }

  get actors() {
    return this.characterHandler?.actors;
  }

  set actors(actors) {
    this.characterHandler.actors = actors;
  }

  get token() {
    return this.characterHandler?.token;
  }

  set token(token) {
    this.characterHandler.token = token;
  }

  get tokens() {
    return this.characterHandler?.tokens;
  }

  set tokens(tokens) {
    this.characterHandler.tokens = tokens;
  }
}

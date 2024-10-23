
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
    this.groupHandler = new GroupHandler(this, systemManager, dataHandler);
    this.actionHandler = systemManager.getActionHandlerCore(this, this.dataHandler, this.groupHandler);
    this.rollHandler = systemManager.getRollHandlerCore(this);
    this.characterHandler = new CharacterHandler(this);
  }

  /**
   * Initialise the HUD
   * @param {string} trigger The update trigger
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

  /**
   * Soft reset variables
   * @public
   */
  softResetHud() {
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

  /**
   * Build the HUD
   * @private
   * @param {object} options The options
   * @returns {object}       The HUD
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

    await Promise.all([
      this.layoutHandler.init(),
      this.groupHandler.init()
    ]);

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
   * @returns {object} The HUD
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

  /**
   * Handle HUD event
   * @param {string} eventType The event type
   * @param {object} event     The event
   */
  handleHudEvent(eventType, event) {
    const group = (["groupClick"].includes(eventType)) ? this.getGroup(event) : null;
    const action = (["clickAction", "hoverAction"].includes(eventType)) ? this.getAction(event) : null;

    this.#registerKeyPresses(event);

    try {
      switch (eventType) {
        case "groupClick":
          this.rollHandler.handleGroupClickCore(event, group);
          break;
        case "clickAction":
          this.rollHandler.handleActionClickCore(event, action);
          break;
        case "hoverAction":
          this.rollHandler.handleActionHoverCore(event, action);
      }
    } catch(error) {
      Logger.error(event);
    }
  }

  /**
   * Registers key presses
   * @private
   * @param {object} event The events
   */
  #registerKeyPresses(event) {
    this.isRightClick = this.#setIsRightClick(event);
    this.isCtrl = this.#setIsCtrl(event);
    this.isAlt = this.#setIsAlt(event);
    this.isShift = this.#setIsShift(event);
  }

  /* -------------------------------------------- */

  /**
   * Whether the button was right-clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  #setIsRightClick(event) {
    const button = event?.originalEvent?.button || event.button;
    return button === 2;
  }

  /* -------------------------------------------- */

  /**
   * Whether the ALT key was pressed when the button was clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  #setIsAlt(event) {
    const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.ALT);
    if (event.altKey && !isModiferActive) {
      Logger.debug("Emulating LEFT ALT key press");
      KeyboardManager.emulateKeypress(false, "AltLeft", { altKey: true, force: true });
      game.keyboard.downKeys.add("AltLeft");
      return true;
    }
    return isModiferActive;
  }

  /* -------------------------------------------- */

  /**
   * Whether the CTRL key was pressed when the button was clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  #setIsCtrl(event) {
    const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL);
    if (event.ctrlKey && !isModiferActive) {
      Logger.debug("Emulating LEFT CTRL key press");
      KeyboardManager.emulateKeypress(false, "ControlLeft", { ctrlKey: true, force: true });
      game.keyboard.downKeys.add("ControlLeft");
      return true;
    }
    return isModiferActive;
  }

  /* -------------------------------------------- */

  /**
   * Whether the SHIFT key was pressed when the button was clicked
   * @public
   * @param {object} event The event
   * @returns {boolean}
   */
  #setIsShift(event) {
    const isModiferActive = game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT);
    if (event.shiftKey && !isModiferActive) {
      Logger.debug("Emulating LEFT SHIFT key press");
      KeyboardManager.emulateKeypress(false, "ShiftLeft", { shiftKey: true, force: true });
      game.keyboard.downKeys.add("ShiftLeft");
      return true;
    }
    return isModiferActive;
  }

  /* -------------------------------------------- */

  /**
   * Get the group from the nest ID
   * @param {object} event The event
   * @returns {object}     The group
   */
  getGroup(event) {
    const groupElement = Utils.getClosestGroupElement(event);
    const nestId = groupElement?.dataset?.nestId;
    return this.groupHandler.getGroup({ nestId }) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Get the action from the action ID on the button
   * @param {object} event  The event
   * @returns {object}      The action
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

  /**
   * Whether the hud is enabled for the current user
   * @private
   * @returns {boolean} Whether the hud is enabled for the current user
   */
  get isHudEnabled() {
    if (!Utils.getSetting("enable")) return false;
    if (game.user.isGM) return true;
    return Utils.checkAllow(game.user.role, this.allowSetting);
  }

  /* -------------------------------------------- */
  /* Shortcuts to CharacterHandler properties     */
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

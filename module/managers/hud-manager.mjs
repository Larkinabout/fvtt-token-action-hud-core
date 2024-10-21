
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
    this.groupHandler = new GroupHandler(systemManager, dataHandler);
    this.actionHandler = systemManager.getActionHandlerCore(this.dataHandler, this.groupHandler);
    this.rollHandler = systemManager.getRollHandlerCore(this.groupHandler, this.actionHandler);
    this.characterHandler = new CharacterHandler(this);
  }

  /**
   * Initialise HUD
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

    const groups = this.groupHandler.prepareGroups(hud);
    this.actionHandler.prepareActions(groups);

    Logger.debug("HUD prepared", { hud, actor: this.actor, token: this.token });
    return hud;
  }

  /* -------------------------------------------- */

  /**
   * Handle HUD event
   * @param {string} eventType The event type
   * @param {object} event     The event
   * @param {object} options   The options
   */
  handleHudEvent(eventType, event, options) {
    try {
      switch (eventType) {
        case "groupClick":
          this.rollHandler.handleGroupClickCore(event, options.nestId);
          break;
        case "clickAction":
          this.rollHandler.handleActionClickCore(event);
          break;
        case "hoverAction":
          this.rollHandler.handleActionHoverCore(event);
      }
    } catch(error) {
      Logger.error(event);
    }
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
}

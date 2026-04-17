import { Utils } from "../core/utils.mjs";

/**
 * Handler for the HUD layout.
 */
export class LayoutHandler {
  constructor(systemManager, dataHandler) {
    this.systemManager = systemManager;
    this.dataHandler = dataHandler;
    this.defaultLayout = null;
    this.customLayout = null;
  }

  /* -------------------------------------------- */
  /* INITIALISE                                   */
  /* -------------------------------------------- */

  /**
   * Initialise the HUD layout.
   */
  async init() {
    await Promise.all([
      this.#setDefaultLayout(),
      this.#setCustomLayout()
    ]);
  }

  /* -------------------------------------------- */

  /**
   * Set the default layout.
   * @private
   */
  async #setDefaultLayout() {
    if (this.defaultLayout) return;
    const defaultLayout = this.systemManager.defaults?.layout;
    if (!defaultLayout) { this.defaultLayout = null; return; }
    this.defaultLayout = await Utils.getNestedGroups(defaultLayout);
  }

  /* -------------------------------------------- */

  /**
   * Set custom layout.
   * @private
   */
  async #setCustomLayout() {
    if (this.customLayout) return;
    const file = Utils.getUserFlag("userCustomLayout") || Utils.getSetting("customLayout") || null;
    this.customLayout = (file) ? await this.dataHandler.getDataAsGm({ file }) : null;
  }

  /* -------------------------------------------- */
  /* RESET                                        */
  /* -------------------------------------------- */

  /**
   * Soft reset variables.
   */
  softReset() {
    this.defaultLayout = null;
  }

  /* -------------------------------------------- */

  /**
   * Hard reset variables.
   */
  hardReset() {
    this.softReset();
    this.customLayout = null;
  }

  /* -------------------------------------------- */
  /* EXPORT                                       */
  /* -------------------------------------------- */

  /**
   * Export layout to file.
   * @public
   */
  async exportLayout() {
    const data = await this.dataHandler.getDataAsGm({ type: "user", id: game.userId }) ?? this.customLayout ?? this.defaultLayout;
    if (data) {
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", "token-action-hud-layout.json");
    }
  }

  /* -------------------------------------------- */
  /* STATE                                        */
  /* -------------------------------------------- */

  /**
   * Get the layout.
   * @returns {object} The layout
   */
  get layout() {
    return this.customLayout ?? this.defaultLayout;
  }
}

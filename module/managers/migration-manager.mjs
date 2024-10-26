import { MODULE } from "../core/constants.mjs";
import { Logger, Utils } from "../core/utils.mjs";

/**
 * Manages migrations between module versions
 */
export class MigrationManager {
  constructor(dataHandler, socket) {
    this.dataHandler = dataHandler;
    this.socket = socket;
  }

  /* -------------------------------------------- */

  /**
   * Initialise migrations
   * @public
   */
  async init() {
    if (!game.user.isGM) return;

    const moduleVersion = game.modules.get(MODULE.ID).version;
    const migrationVersion = Utils.getSetting("migrationVersion");
    if (moduleVersion === migrationVersion) return;

    let isSuccess = true;
    isSuccess = (!migrationVersion || foundry.utils.isNewerVersion("1.4.10", migrationVersion))
      ? await this.#unsetOldFlags()
      : true;
    isSuccess = (this.dataHandler.isPersistentStorage && (!migrationVersion || foundry.utils.isNewerVersion("1.4.11", migrationVersion)))
      ? await this.#migrateFiles()
      : true;

    if (isSuccess) {
      Utils.setSetting("migrationVersion", moduleVersion);
    }
  }

  /* -------------------------------------------- */

  /**
   * Unset old flags
   * @private
   * @returns {boolean} Whether the old flags were unset
   */
  async #unsetOldFlags() {
    try {
      const users = game.users.filter(user => user.getFlag(MODULE.ID, "categories"));
      for (const user of users) {
        user.unsetFlag(MODULE.ID, "categories");
        user.unsetFlag(MODULE.ID, "defaults");
      }

      const actors = game.actors.filter(actor => actor.getFlag(MODULE.ID, "categories"));
      for (const actor of actors) {
        actor.unsetFlag(MODULE.ID, "categories");
      }

      const tokens = game.canvas.tokens.objects.children.filter(token => token.actor?.getFlag(MODULE.ID, "categories"));
      for (const token of tokens) {
        token.actor?.unsetFlag(MODULE.ID, "categories");
      }

      for (const scene of game.scenes) {
        const tokens = scene.tokens.filter(token => token.actor?.getFlag(MODULE.ID, "categories"));
        for (const token of tokens) {
          token.actor?.unsetFlag(MODULE.ID, "categories");
        }
      }

      return true;
    } catch(err) {
      Logger.debug(err.message, err);

      return false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate files to storage
   * @returns {boolean} Whether the files were migrated to storage
   */
  async #migrateFiles() {
    try {
      Logger.info("Migrating files to persistent storage...", true);
      for (const user of game.users) {
        const data = await this.dataHandler.getDataMigrate("user", user.id);
        if (data) {
          await this.dataHandler.saveData("user", user.id, data);
        }
      }

      for (const actor of game.actors) {
        const data = await this.dataHandler.getDataMigrate("actor", actor.id);
        if (data) {
          await this.dataHandler.saveData("actor", actor.id, data);
        }
      }
      Logger.info("Successfully migrated files to persistent storage", true);
      return true;
    } catch{
      Logger.info("Failed to migrate files to persistent storage", true);
      return false;
    }
  }
}

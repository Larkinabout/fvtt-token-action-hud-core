import { MODULE } from "../core/constants.mjs";
import { Logger, Utils } from "../core/utils.mjs";

/* -------------------------------------------- */

/**
 * A class responsible for handling data-related activities.
 */
export class DataHandler {
  constructor(socket) {
    this.socket = socket;
  }

  /**
   * Initialise the data handler
   */
  async init() {
    await this.#createDirectories();
    await Promise.all([
      this.private = await this.isPrivate(),
      this.fileMap = await this.getFilePathsAsGm()
    ]);
  }

  /* -------------------------------------------- */

  /**
   * Whether persistent storage can be used
   * @returns {boolean} Whether persistent storage can be used
   */
  get isPersistentStorage() {
    return (foundry.utils.isNewerVersion(game.version, "11.305") && typeof ForgeVTT === "undefined");
  }

  /* -------------------------------------------- */

  /**
   * Create directories for storage of files
   * @private
   */
  async #createDirectories() {
    if (!game.user.isGM || !Utils.getSetting("enableCustomization")) return;

    const DATA_FOLDER = "data";
    const moduleDirectory = (this.isPersistentStorage)
      ? `modules/${MODULE.ID}/storage`
      : MODULE.ID;

    const directoriesToCreate = [
      moduleDirectory,
      `${moduleDirectory}/${game.world.id}`,
      `${moduleDirectory}/${game.world.id}/actor`,
      `${moduleDirectory}/${game.world.id}/user`
    ];

    for (const directory of directoriesToCreate) {
      await FilePicker.browse(DATA_FOLDER, directory).catch(async _ => {
        if (!(await FilePicker.createDirectory(DATA_FOLDER, directory, {}))) {
          Logger.debug(`Failed to create directory: ${directory}`);
        }
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Get base path to the layout files
   * @returns {string} The path
   */
  get path() {
    return (this.isPersistentStorage)
      ? `modules/${MODULE.ID}/storage/${game.world.id}/`
      : `${MODULE.ID}/${game.world.id}/`;
  }

  /* -------------------------------------------- */

  /**
   * Get file parts
   * @param {string} file The file
   * @returns {object}    The file parts
   */
  getFileParts(file) {
    const parts = file.split("/");
    const filename = parts.pop();
    const folder = parts.join("/");
    const id = filename.split(".")[0];
    return { folder, filename, id };
  }

  /* -------------------------------------------- */

  /**
   * Whether the module directory is set to private
   * @returns {boolean} Whether the module directory is set to private
   */
  async isPrivate() {
    if (game.user.isGM) return false;

    if (game.user.hasPermission("FILES_BROWSE")) {
      try {
        await FilePicker.browse("data", this.path);
        return false;
      } catch{
        return true;
      }
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Get file paths as GM
   * @returns {object} The file paths
   */
  async getFilePathsAsGm() {
    if ((!game.user.hasPermission("FILES_BROWSE") || this.private) && !Utils.isGmActive()) {
      Logger.info("Cannot get file paths without a GM present", true);
      return new Map(); // Return an empty map if no permissions and no GM
    }

    const files = game.user.hasPermission("FILES_BROWSE") && !this.private
      ? await this.getFilePaths()
      : await this.socket.executeAsGM("getFilePaths");

    return new Map(files.map(file => {
      const { id } = this.getFileParts(file);
      return [id, file];
    }));
  }

  /**
   * Get file paths using socket
   * @returns {Array} The file paths
   */
  static async getFilePathsWithSocket() {
    return await game.tokenActionHud?.dataHandler?.getFilePaths() ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Get file paths
   * @returns {Array} The file paths
   */
  async getFilePaths() {
    const [actorFiles, userFiles] = await Promise.all([
      FilePicker.browse("data", `${this.path}actor/`),
      FilePicker.browse("data", `${this.path}user/`)
    ]);

    return [...(actorFiles?.files ?? []), ...(userFiles?.files ?? [])];
  }

  /* -------------------------------------------- */

  /**
   * Whether the user can save data
   * @returns {boolean} Whether the user can save data
   */
  get canSaveData() {
    return ((game.user.hasPermission("FILES_UPLOAD") && !this.private) || Utils.isGmActive());
  }

  /* -------------------------------------------- */

  /**
   * Save data the GM
   * @public
   * @param {string} type The type: actor or user
   * @param {string} id   The actor or user id
   * @param {object} data The data
   */
  async saveDataAsGm(type, id, data) {
    if (game.user.hasPermission("FILES_UPLOAD") && !this.private) {
      await this.saveData(type, id, data);
    }

    if (!Utils.isGmActive()) {
      Logger.info("Cannot save data without a GM present", true);
      return;
    }

    await this.socket.executeAsGM("saveData", type, id, data);
  }

  /* -------------------------------------------- */

  static async saveDataWithSocket(type, id, data) {
    game.tokenActionHud.dataHandler.saveData(type, id, data);
  }

  /* -------------------------------------------- */

  /**
   * Save data
   * @param {string} type The type: actor or user
   * @param {string} id   The actor or user id
   * @param {object} data The data
   */
  async saveData(type, id, data) {
    try {
      // Get the folder path
      const folder = `${this.path}${type}`;

      // Generate the system-safe filename
      const fileName = encodeURI(`${id}.json`);

      // Create the file and contents
      const file = new File([JSON.stringify(data, null, "")], fileName, { type: "application/json" });

      // Upload the file
      const response = await FilePicker.upload("data", folder, file, {}, { notify: false });

      if (response.path) {
        if (!this.fileMap.has(id)) {
          this.fileMap.set(id, response.path);
        }
      } else {
        Logger.debug(`Failed to save data to: ${fileName}\nReason: ${response.error || "Unknown error"}`);
      }
    } catch(error) {
      Logger.error(`An error occurred while saving data for ${id}.json: ${error.message}`);
    }
  }

  /* -------------------------------------------- */

  /**
   * Whether the user can get data
   * @returns {boolean} Whether the user can get data
   */
  get canGetData() {
    return ((game.user.hasPermission("FILES_BROWSE") && !this.private) || Utils.isGmActive());
  }

  /* -------------------------------------------- */

  /**
   * Get data as GM
   * @public
   * @param {object} options The options: file, type, id
   * @returns {object}       The data
   */
  async getDataAsGm(options) {
    try {
      if ((!game.user.hasPermission("FILES_BROWSE") || this.private) && !Utils.isGmActive()) {
        Logger.info("Cannot get data without a GM present", true);
        return;
      }

      return (game.user.hasPermission("FILES_BROWSE"))
        ? await this.getData(options)
        : await this.socket.executeAsGM("getData", options);
    } catch(error) {
      Logger.error(`An error occurred while getting data: ${error.message}`);
      return null;
    }
  }

  /* -------------------------------------------- */

  static async getDataWithSocket(options) {
    game.tokenActionHud.dataHandler.getData(options);
  }

  /* -------------------------------------------- */

  /**
   * Get data
   * @param {string} options The options: file, type, id
   * @returns {object}       The data
   */
  async getData(options) {
    const { id, file } = options;

    // Check if the file is available in the fileMap
    let foundFile = this.fileMap.get(id) ?? null;

    // If not found, try to browse, otherwise return null
    if (!foundFile) {
      if (!file) return null;
      const { folder, filename } = this.getFileParts(file);
      const foundFolder = await FilePicker.browse("data", folder);
      foundFile = foundFolder.files.find(file => file.endsWith(filename));
      if (!foundFile) return null;
    }

    try {
      const ms = Date.now();
      const response = await fetch(`${foundFile}?ms=${ms}`);

      // Check if the fetch was successful
      if (response.ok) {
        return await response.json();
      } else {
        return null;
      }
    } catch(error) {
      console.error(error);
      return null;
    }
  }

  /* -------------------------------------------- */

  /**
   * Get data
   * @param {string} type The type: actor or user
   * @param {string} id   The actor or user id
   * @returns {object}    The data
   */
  async getDataMigrate(type, id) {
    const folderPath = `${MODULE.ID}/${game.world.id}/${type}`;
    const fileName = encodeURI(`${id}.json`);
    try {
      const foundFolderPath = await FilePicker.browse("data", folderPath);
      const foundFilePath = foundFolderPath.files.find(file => file.endsWith(fileName));
      if (foundFilePath) {
        const ms = Date.now();
        return await fetch(`${foundFilePath}?ms=${ms}`)
          .then(response => {
            if (response.ok) {
              return response.json();
            } else {
              return null;
            }
          })
          .catch(error => {
            console.error(error);
          });
      } else {
        return null;
      }
    } catch{
      return null;
    }
  }
}

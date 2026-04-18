import { CSS_STYLE, CUSTOM_STYLE, MODULE } from "./constants.mjs";

/**
 * A class responsible for logging messages to the console.
 */
export class Logger {
  /**
   * Log an info message to the console. If 'notify' is true, also send a notification.
   * @param {string} message
   * @param {boolean} notify Whether to send a notification
   */
  static info(message, notify = false) {
    if (notify) ui.notifications.info(`Token Action HUD | ${message}`);
    else console.log(`Token Action HUD Info | ${message}`);
  }

  /* -------------------------------------------- */

  /**
   * Log an error message to the console. If 'notify' is true, also send a notification.
   * @param {string} message
   * @param {boolean} notify Whether to send a notification
   */
  static error(message, notify = false) {
    if (notify) ui.notifications.error(`Token Action HUD | ${message}`, { permanent: true });
    else console.error(`Token Action HUD Error | ${message}`);
  }

  /* -------------------------------------------- */

  /**
   * Log a debug message and, optionally, data to the console.
   * @param {string} message
   * @param {object|null} data
   */
  static debug(message, data = null) {
    const isDebug = game.tokenActionHud?.setting?.debug ?? Utils.getSetting("debug");
    if (isDebug) {
      if (!data) {
        console.log(`Token Action HUD Debug | ${message}`);
        return;
      }
      const dataClone = Utils.deepClone(data);
      console.log(`Token Action HUD Debug | ${message}`, dataClone);
    }
  }
}

/* -------------------------------------------- */

/**
 * A class responsible for setting and aborting timers.
 */
export class Timer {
  constructor(milliseconds) {
    this.milliseconds = milliseconds;
    this.timer = null;
  }

  async start() {
    if (this.timer) this.abort();
    return new Promise(resolve => {
      this.timer = setTimeout(() => { resolve(); }, this.milliseconds ?? 100);
    });
  }

  async abort() {
    clearTimeout(this.timer);
    this.timer = null;
  }
}

/* -------------------------------------------- */

/**
 * A class of helper functions.
 */
export class Utils {

  /* -------------------------------------------- */
  /* HELPERS                                      */
  /* -------------------------------------------- */

  /**
   * Whether the user is allowed to use the HUD.
   * @public
   * @param {number} userRole
   * @param {number} allowSetting Allow setting value
   * @returns {boolean} Whether the user is allowed to use the HUD
   */
  static checkAllow(userRole, allowSetting) {
    return userRole >= allowSetting;
  }

  /* -------------------------------------------- */

  /**
   * Capitalize the first letter of every word.
   * @param {string} value
   * @returns {string} Capitalized value
   */
  static capitalize(value) {
    return value.replace(
      /\w\S*/g,
      text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
  }

  /* -------------------------------------------- */

  /**
   * Foundry VTT's deepClone function wrapped here to avoid code error highlighting due to missing definition.
   * @public
   * @param {object} original Original object
   * @param {object} options
   * @returns {object} Cloned object
   */
  static deepClone(original, options) {
    // eslint-disable-next-line no-undef
    return foundry.utils.deepClone(original, options);
  }

  /* -------------------------------------------- */
  /* GETTERS                                      */
  /* -------------------------------------------- */

  /**
   * Get actor from the token or actor.
   * @public
   * @param {string} actorId
   * @param {string} tokenId
   * @returns {object} Actor
   */
  static getActor(actorId, tokenId) {
    let token = null;
    if (tokenId) token = canvas.tokens.placeables.find(token => token.id === tokenId);
    if (token) return token.actor;
    return game.actors.get(actorId);
  }

  /**
   * Get closest group to the event target.
   * @param {Event} event
   * @returns {object} Closest group element
   */
  static getClosestGroupElement(event) {
    if (!event) return null;
    return event.target.closest("[data-part=\"subgroup\"]") || event.target.closest("[data-part=\"group\"]");
  }

  /* -------------------------------------------- */

  /**
   * Get actors of controlled tokens.
   * @public
   * @returns {Array} List of actors
   */
  static getControlledActors() {
    const tokens = game.canvas.tokens?.controlled ?? [];
    return tokens.map(token => token.actor);
  }

  /* -------------------------------------------- */

  /**
   * Get status effect from actor based on the status ID.
   * @param {object} actor
   * @param {string} statusId
   * @returns {object} Status effect
   */
  static getStatusEffect(actor, statusId) {
    return actor.effects.find(effect => effect.statuses.every(status => status === statusId));
  }

  /* -------------------------------------------- */

  /**
   * Get image from the entity.
   * @public
   * @param {object} entity Actor, item
   * @param {Array} defaultImages List of default images to exclude
   * @returns {string} Image URL
   */
  static getImage(entity, defaultImages = []) {
    defaultImages.push("icons/svg/mystery-man.svg");
    let result = "";
    if (game.tokenActionHud?.setting?.displayIcons) {
      result = (typeof entity === "string")
        ? entity
        : entity?.img ?? entity?.icon ?? "";
    }
    return !defaultImages.includes(result) ? result : "";
  }

  /* -------------------------------------------- */

  /**
   * Get item from the actor.
   * @public
   * @param {object} actor
   * @param {string} itemId
   * @returns {object} Item
   */
  static getItem(actor, itemId) {
    return actor.items.get(itemId);
  }

  /* -------------------------------------------- */

  /**
   * Get token.
   * @public
   * @param {string} tokenId
   * @returns {object} Token
   */
  static getToken(tokenId) {
    return canvas.tokens.placeables.find(token => token.id === tokenId);
  }

  /* -------------------------------------------- */

  /**
   * Get controlled tokens.
   * @public
   * @returns {Array} List of controlled tokens
   */
  static getControlledTokens() {
    return game.canvas.tokens?.controlled ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Get first controlled tokens.
   * @public
   * @returns {object|null} First controlled token
   */
  static getFirstControlledToken() {
    const controlledToken = game.canvas.tokens.controlled[0];
    if (controlledToken) {
      return controlledToken;
    }

    const character = game.user?.character;
    if (character) {
      return canvas.tokens.placeables.find(token => token.actor?.id === character.id);
    }

    return null;
  }

  /* -------------------------------------------- */
  /* SETTINGS / FLAGS                             */
  /* -------------------------------------------- */

  /**
   * Get setting value.
   * @public
   * @param {string} key Setting key
   * @param {string=null} defaultValue Setting default value
   * @returns {*} Setting value
   */
  static getSetting(key, defaultValue = null) {
    let value = defaultValue ?? null;
    try {
      value = game.settings.get(MODULE.ID, key);
    } catch{
      Logger.debug(`Setting '${key}' not found`);
    }
    return value;
  }

  /* -------------------------------------------- */

  /**
   * Set setting value.
   * @public
   * @param {string} key Setting key
   * @param {string} value Setting value
   */
  static async setSetting(key, value) {
    if (game.settings.settings.get(`${MODULE.ID}.${key}`)) {
      await game.settings.set(MODULE.ID, key, value);
      Logger.debug(`Setting '${key}' set to '${value}'`);
    } else if (key !== "debug") {
      Logger.debug(`Setting '${key}' not found`);
    }
  }

  /* -------------------------------------------- */

  /**
   * Get module actor flag.
   * @public
   * @param {string} key Flag key
   * @returns {*} Flag value
   */
  static getActorFlag(key) {
    return game.tokenActionHud.actor.getFlag(MODULE.ID, key);
  }

  /* -------------------------------------------- */

  /**
   * Set module actor flag.
   * @public
   * @param {string} key Flag key
   * @param {*} value Flag value
   */
  static async setActorFlag(key, value) {
    await game.tokenActionHud.actor.setFlag(MODULE.ID, key, value);
  }

  /* -------------------------------------------- */

  /**
   * Unset module actor flag.
   * @public
   * @param {string} key Flag key
   */
  static async unsetActorFlag(key) {
    await game.tokenActionHud.actor.unsetFlag(MODULE.ID, key);
  }

  /* -------------------------------------------- */

  /**
   * Get module user flag.
   * @public
   * @param {string} key Flag key
   * @returns {*}  Flag value
   */
  static getUserFlag(key) {
    return game.user.getFlag(MODULE.ID, key);
  }

  /* -------------------------------------------- */

  /**
   * Set module user flag.
   * @public
   * @param {string} key Flag key
   * @param {*} value Flag value
   */
  static async setUserFlag(key, value) {
    await game.user.setFlag(MODULE.ID, key, value);
  }

  /* -------------------------------------------- */

  /**
   * Unset module user flag.
   * @public
   * @param {string} key Flag key
   */
  static async unsetUserFlag(key) {
    await game.user.unsetFlag(MODULE.ID, key);
  }

  /* -------------------------------------------- */
  /* ENVIRONMENT                                  */
  /* -------------------------------------------- */

  /**
   * Language translation.
   * @public
   * @param {string} toTranslate Value to translate
   * @returns {string} Translated value
   */
  static i18n(toTranslate) {
    return game.i18n.localize(toTranslate);
  }

  /* -------------------------------------------- */

  /**
   * Whether a GM is active.
   * @public
   * @returns {boolean} Whether a GM is active
   */
  static isGmActive() {
    return game.users.some(user => user.isGM && user.active);
  }

  /* -------------------------------------------- */

  /**
   * Whether the given module is active.
   * @public
   * @param {string} moduleId
   * @returns {boolean} Whether the given module is active
   */
  static isModuleActive(moduleId) {
    const module = game.modules.get(moduleId);
    return module && module.active;
  }

  /* -------------------------------------------- */

  /**
   * Get the given module's title.
   * @public
   * @param {string} moduleId
   * @returns {string} Module title
   */
  static getModuleTitle(moduleId) {
    return game.modules.get(moduleId)?.title ?? "";
  }

  /* -------------------------------------------- */

  /**
   * Get the given module's version.
   * @public
   * @param {string} moduleId
   * @returns {string} Module version
   */
  static getModuleVersion(moduleId) {
    return game.modules.get(moduleId)?.version ?? "";
  }

  /* -------------------------------------------- */

  /**
   * Humanize keybinding.
   * @param {object} key Keybinding key
   * @returns {string} Humanized keybinding
   */
  static humanizeBinding(key) {
    const keyboardManager = foundry?.helpers?.interaction?.KeyboardManager ?? KeyboardManager;
    const binding = game.keybindings.get(MODULE.ID, key);
    if (!binding) return "";
    const stringParts = binding[0].modifiers.reduce((parts, part) => {
      if (keyboardManager.MODIFIER_CODES[part]?.includes(binding[0].key)) return parts;
      parts.unshift(keyboardManager.getKeycodeDisplayString(part));
      return parts;
    }, [keyboardManager.getKeycodeDisplayString(binding[0].key)]);
    return stringParts.join(" + ");
  }

  /* -------------------------------------------- */
  /* MATHS                                        */
  /* -------------------------------------------- */

  /**
   * Get the median.
   * @public
   * @param {Array} numbers List of numbers
   * @returns {number} Median
   */
  static median(numbers) {
    const mid = Math.floor(numbers.length / 2);
    const nums = [...numbers].sort((a, b) => a - b);
    return numbers.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  }

  /* -------------------------------------------- */

  /**
   * Get upper quartile average.
   * @param {Array} numbers List of numbers
   * @returns {number} Upper quartile average
   */
  static getUpperQuartileAverage(numbers) {
    const sortedNumbers = numbers.slice().sort((a, b) => a - b);
    const length = sortedNumbers.length;
    const startIndex = Math.ceil(length * 0.75);
    const endIndex = length - 1;

    let sum = 0;
    let count = 0;

    for (let i = startIndex; i <= endIndex; i++) {
      sum += sortedNumbers[i];
      count++;
    }

    const upperQuartileAverage = sum / count;

    return upperQuartileAverage;
  }

  /* -------------------------------------------- */

  /**
   * Get modifier (e.g., +5) from number.
   * @param {number} num
   * @returns {string} Modifier
   */
  static getModifier(num) {
    if (!num && num !== 0) return "";
    const sign = (num >= 0) ? "+" : "";
    return `${sign}${num}`;
  }

  /* -------------------------------------------- */
  /* SORTING                                      */
  /* -------------------------------------------- */

  /**
   * Sort items.
   * @public
   * @param {object} items
   * @returns {object} Sorted items
   */
  static sortItems(items) {
    return new Map([...items.entries()].sort((a, b) => a[1].sort.localeCompare(b[1].sort)));
  }

  /* -------------------------------------------- */

  /**
   * Sort items by name.
   * @public
   * @param {object} items
   * @returns {object} Sorted items
   */
  static sortItemsByName(items) {
    return new Map([...items.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)));
  }

  /* -------------------------------------------- */
  /* CSS                                          */
  /* -------------------------------------------- */

  /**
   * Enable stylesheet based on setting and disable all other stylesheets.
   * @public
   * @param {string} style Style setting value
   */
  static switchCSS(style) {
    const tahElement = document.querySelector("#token-action-hud-app");
    if (tahElement) {
      if (!CSS_STYLE[style]) style = "foundryVTT";
      const styleClass = foundry.utils.isNewerVersion(game.version, "12.999") && ["dockedLeft", "dockedCenterRight", "dockedRight"].includes(style)
        ? `${CSS_STYLE[style].class}-v13`
        : CSS_STYLE[style].class;

      if (tahElement.classList.contains(styleClass)) return;

      const PRESERVE = new Set(["tah-expanded", "faded-ui"]);
      const classesToRemove = [...tahElement.classList].filter(c => !PRESERVE.has(c));
      if (classesToRemove.length) tahElement.classList.remove(classesToRemove);
      tahElement.classList.add(styleClass);

      if (style === "custom") {
        Utils.applyCustomStyles(tahElement);
      } else {
        Utils.removeCustomStyles(tahElement);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply saved custom style CSS properties to the HUD element.
   * @public
   * @param {HTMLElement} element HUD element
   */
  static applyCustomStyles(element) {
    for (const [key, value] of Object.entries(CUSTOM_STYLE)) {
      const saved = Utils.getSetting(key);
      if (saved != null) {
        element.style.setProperty(value.cssProperty, saved);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Remove custom style CSS properties from the HUD element.
   * @public
   * @param {HTMLElement} element HUD element
   */
  static removeCustomStyles(element) {
    for (const value of Object.values(CUSTOM_STYLE)) {
      element.style.removeProperty(value.cssProperty);
    }
  }

  /* -------------------------------------------- */
  /* HANDLEBARS                                   */
  /* -------------------------------------------- */

  /**
   * Register Handlebar helpers.
   * @public
   */
  static registerHandlebars() {
    // Capitalise first character
    Handlebars.registerHelper("tokenActionHudCoreCap", function(string) {
      if (!string || string.length < 1) return "";
      return string[0].toUpperCase() + string.slice(1);
    });
    const reduceOp = function(args, reducer) {
      args = Array.from(args);
      args.pop(); // => options
      const first = args.shift();
      return args.reduce(reducer, first);
    };

    // Support operators
    Handlebars.registerHelper({
      tokenActionHudCoreTrue: function() { return reduceOp(arguments, a => a); }
    });

    // Add asterisk to toggleable actions
    Handlebars.registerHelper("tokenActionHudCoreActiveText", function(block) {
      if (game.tokenActionHud?.setting?.activeCssAsText) {
        return block.fn(this);
      }
      return block.inverse(this);
    });
  }

  /* -------------------------------------------- */
  /* VERSIONING                                   */
  /* -------------------------------------------- */

  /**
   * Get the major, minor and patch parts of the module version.
   * @public
   * @param {string} moduleVersion
   * @returns {object|null} Module version parts
   */
  static getModuleVersionParts(moduleVersion) {
    if (!moduleVersion) {
      Logger.debug("Module version not retrieved", { trigger: "getModuleVersionParts" });
      return null;
    }
    const moduleVersionParts = moduleVersion.split(".");
    return {
      major: moduleVersionParts[0],
      minor: moduleVersionParts[1],
      patch: moduleVersionParts[2]
    };
  }

  /* -------------------------------------------- */

  /**
   * Whether the system module is compatible with the core module version.
   * @public
   * @param {string} requiredCoreModuleVersion
   * @returns {boolean} Whether the system module is compatible with the core module version
   */
  static isSystemModuleCompatible(requiredCoreModuleVersion) {
    if (!requiredCoreModuleVersion) return true;

    // Get core module version in parts
    const requiredCoreModuleVersionParts = this.getModuleVersionParts(requiredCoreModuleVersion);
    const coreModuleVersionParts = this.getModuleVersionParts(game.modules.get(MODULE.ID).version);

    if (coreModuleVersionParts.major !== requiredCoreModuleVersionParts.major
      || (requiredCoreModuleVersionParts.minor && coreModuleVersionParts.minor !== requiredCoreModuleVersionParts.minor)
      || (requiredCoreModuleVersionParts.patch && coreModuleVersionParts.patch !== requiredCoreModuleVersionParts.patch)
    ) {
      const requiredVersion = `${requiredCoreModuleVersionParts.major}.${requiredCoreModuleVersionParts.minor ?? "X"}.${requiredCoreModuleVersionParts.patch ?? "X"}`;
      const installedVersion = game.modules.get(MODULE.ID).version;
      ui.notifications.error(
        `The installed Token Action HUD system module requires Token Action HUD Core module version ${requiredVersion}, but version ${installedVersion} is installed. Install Token Action HUD Core module version ${requiredVersion} to continue using Token Action HUD. Earlier versions of Token Action HUD Core are available on the module's package page on the Foundry VTT site.`,
        { permanent: true }
      );
      return false;
    }
    return true;
  }

  /* -------------------------------------------- */
  /* GROUP TRAVERSAL                              */
  /* -------------------------------------------- */

  /**
   * Get nested groups by criteria.
   * @public
   * @param {object} groups
   * @param {object} data Search data
   * @returns {object|null} Nested groups
   */
  static getNestedGroups(groups, data = {}) {
    let order = 0;
    if (!groups) return null;
    const groupId = data?.id;
    const groupType = data?.type;
    groups = (Array.isArray(groups)) ? groups : Object.values(groups);
    const foundGroups = {};
    for (const group of groups) {
      if ((!groupId || group.id === groupId) && (!groupType || group.type === groupType)) {
        order++;
        const level = group.nestId.split("_").length;
        foundGroups[group.nestId] = { ...group, order, level };
      }
      if (group.groups?.length > 0) {
        const groups = this.getNestedGroups(group.groups, data);
        if (groups) Object.assign(foundGroups, groups);
      }
    }
    return (Object.keys(foundGroups).length > 0) ? foundGroups : null;
  }

  /* -------------------------------------------- */

  /**
   * Get group by nest ID.
   * @public
   * @param {object} groups
   * @param {string} data Search data
   * @returns {object|null} Group
   */
  static async getGroupByNestId(groups, data = {}) {
    const nestId = (typeof data === "string" ? data : data?.nestId);
    const groupType = data?.type;
    if (!nestId) return null;

    const parts = nestId.split("_");
    return await findGroup(groups, parts);

    /* -------------------------------------------- */

    /**
     * Find group.
     * @param {object} groups
     * @param {Array} parts nestId parts
     * @returns {object} Group
     */
    async function findGroup(groups, parts) {
      if (!groups) return null;
      groups = (Array.isArray(groups)) ? groups : Object.values(groups);
      for (const group of groups) {
        if (group.id === parts[0]) {
          if (parts.length === 1) {
            if (!group.type || !groupType || group.type === groupType) return group;
            return;
          }
          parts.shift();
          if (!group.groups) continue;
          for (const groupStyle of Object.values(group.groups)) {
            if (groupStyle.length === 0) continue;
            const foundGroup = await findGroup(groupStyle, parts);
            if (foundGroup) return foundGroup;
          }
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete group by nest ID.
   * @public
   * @param {object} groups
   * @param {string} data Search data
   */
  static async deleteGroupByNestId(groups, data = {}) {
    const nestId = (typeof data === "string" ? data : data?.nestId);
    if (!nestId) return;

    const parts = nestId.split("_");
    await findAndDeleteGroup(groups, parts);
  }

  /* -------------------------------------------- */

  /**
   * Find and delete a group.
   * @param {object} groups
   * @param {Array} parts nestId parts
   */
  static async findAndDeleteGroup(groups, parts) {
    groups = (Array.isArray(groups)) ? groups : Object.values(groups);
    for (const [index, group] of groups.entries()) {
      if (group.id === parts[0]) {
        if (parts.length === 1) {
          groups.splice(index, 1);
          return;
        }
        if (group.groups.length === 0) return;
        parts.shift();
        const foundGroup = await findAndDeleteGroup(group.groups, parts);
        if (foundGroup) return;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Delete groups by ID
   * @public
   * @param {object} groups
   * @param {string} data Search data
   */
  static async deleteGroupsById(groups, data = {}) {
    const id = (typeof data === "string" ? data : data?.id);
    if (!id) return;

    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].id === id) {
        groups.splice(i, 1);
      } else if (groups[i].groups?.length > 0) {
        deleteGroupsById(groups[i].groups, data);
      }
    }
  }
}

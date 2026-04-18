import { COMPENDIUM_PACK_TYPES, CSS_STYLE, GROUP_TYPE } from "../core/constants.mjs";
import { Logger, Utils } from "../core/utils.mjs";
import { getTooltip } from "../handlers/tooltip-handler.mjs";

/**
 * Handler for the HUD groups.
 */
export class GroupHandler {
  constructor(hudManager, systemManager, dataHandler, layoutHandler) {
    this.hudManager = hudManager;
    this.systemManager = systemManager;
    this.dataHandler = dataHandler;
    this.layoutHandler = layoutHandler;
    this.defaultGroups = {};
    this.groups = {};
    this.actorGroups = {};
    this.userGroups = {};
  }

  /* -------------------------------------------- */
  /* CHARACTER SHORTCUTS                          */
  /* -------------------------------------------- */

  get actor() {
    return this.hudManager?.actor;
  }

  get actors() {
    return this.hudManager?.actors;
  }

  get token() {
    return this.hudManager?.token;
  }

  get tokens() {
    return this.hudManager?.tokens;
  }

  /* -------------------------------------------- */
  /* INITIALISE                                   */
  /* -------------------------------------------- */

  /**
   * Initialise the groups.
   */
  async init() {
    this.#setDefaultGroups();
    await Promise.all([
      this.#setSavedActorGroups(),
      this.#setSavedUserGroups()
    ]);
  }

  /* -------------------------------------------- */

  /**
   * Set the default groups.
   * @private
   */
  #setDefaultGroups() {
    const defaultGroups = this.systemManager.defaults?.groups;
    if (!defaultGroups) return;
    for (const defaultGroup of defaultGroups) {
      this.defaultGroups[defaultGroup.id] = defaultGroup;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set the saved groups from the actor flag.
   * @private
   */
  async #setSavedActorGroups() {
    if (!this.actor) return;

    if (!Utils.getSetting("enableCustomization")) {
      this.actorGroups = {};
      return;
    }

    if (this.isSameActor && Object.entries(this.actorGroups).length) return;

    if (!this.dataHandler.canGetData) {
      this.actorGroups = {};
      return;
    }

    Logger.debug("Retrieving groups from actor...", { actor: this.actor });
    this.actorGroups = {};
    const actorGroups = await this.dataHandler.getDataAsGm({ type: "actor", id: this.actor.id }) ?? null;
    if (!actorGroups) return;
    for (const group of Object.entries(actorGroups)) {
      group[1].nestId = group[0];
    }
    this.actorGroups = actorGroups;
    Logger.debug("Groups from actor retrieved", { actorGroups: this.actorGroups, actor: this.actor });
  }

  /* -------------------------------------------- */

  /**
   * Set the saved groups from the user flag.
   * @private
   */
  async #setSavedUserGroups() {
    const user = game.user;
    const layout = this.layoutHandler.layout;

    const getUserGroups = data => {
      const userGroups = Object.keys(data).length ? data : layout;
      for (const group of Object.entries(userGroups)) {
        group[1].nestId = group[0];
      }
      return userGroups;
    };

    if (!Utils.getSetting("enableCustomization")) {
      this.userGroups = getUserGroups(layout);
      return;
    }

    if (Object.entries(this.userGroups).length) return;

    if (!this.dataHandler.canGetData) {
      this.userGroups = getUserGroups(layout);
      return;
    }

    Logger.debug("Retrieving groups from user...", { user });
    this.userGroups = {};
    const savedUserData = await this.dataHandler.getDataAsGm({ type: "user", id: user.id }) ?? {};
    this.userGroups = getUserGroups(savedUserData);
    Logger.debug("Groups retrieved from user", { userGroups: this.userGroups, user });
  }


  /* -------------------------------------------- */
  /* RESET                                        */
  /* -------------------------------------------- */

  /**
   * Soft reset variables.
   */
  softReset() {
    this.defaultGroups = {};
    this.groups = null;
    this.groups = {};
  }

  /* -------------------------------------------- */

  /**
   * Hard reset variables.
   */
  hardReset() {
    this.softReset();
    this.actorGroups = {};
    this.userGroups = {};
  }

  /* -------------------------------------------- */
  /* PREPARE                                      */
  /* -------------------------------------------- */

  /**
   * Prepare groups in the HUD.
   * @param {object} hud
   * @returns {object} Prepared groups
   */
  async prepareGroups(hud) {
    const isDocked = !!CSS_STYLE[Utils.getSetting("style")]?.isDocked;

    if (Object.keys(this.userGroups).length) {
      const userGroups = this.getUserGroups();
      for (const userGroup of userGroups) {
        if (userGroup.level === 1) {
          const group = this.createGroup(userGroup);
          if (group.selected !== false) hud.groups.push(group);
          this.groups[group.nestId] = group;
        } else {
          const parentNestId = userGroup.nestId.split("_", userGroup.level - 1).join("_");
          const parentGroup = await Utils.getGroupByNestId(hud.groups, { nestId: parentNestId });
          if (parentGroup) {
            const group = this.createGroup(userGroup);
            if (group.selected !== false) {
              if (!isDocked && group.settings.style === "tab") {
                parentGroup.groups.tabs.push(group);
              } else {
                parentGroup.groups.lists.push(group);
              }
            }
            this.groups[group.nestId] = group;
          }
        }
      }
    }

    if (Object.keys(this.actorGroups).length) {
      const actorGroups = this.getActorGroups();

      for (const actorGroup of actorGroups) {
        const parentNestId = actorGroup.nestId.split("_", actorGroup.level - 1).join("_");
        const existingGroup = await Utils.getGroupByNestId(hud.groups, { nestId: actorGroup.nestId });
        if (existingGroup) {
          if (actorGroup.actions?.length) {
            existingGroup.actions = actorGroup.actions;
          }
        } else {
          const parentGroup = await Utils.getGroupByNestId(hud.groups, { nestId: parentNestId });

          if (parentGroup && actorGroup.type === "system-derived") {
            if (!parentGroup.groups) parentGroup.groups = { lists: [], tabs: [] };

            const group = this.createGroup(actorGroup, true);

            if (actorGroup.actions?.length) {
              group.actions = actorGroup.actions;
            }

            if (group.selected !== false) {
              if (!isDocked && group.settings.style === "tab") {
                parentGroup.groups.tabs.push(group);
              } else {
                parentGroup.groups.lists.push(group);
              }
            }

            this.groups[group.nestId] = group;
          }
        }
      }
    }

    return this.groups;
  }

  /* -------------------------------------------- */
  /* LOOKUPS                                      */
  /* -------------------------------------------- */

  /**
   * Get first matching group.
   * @public
   * @param {object} [data = {}] Group data
   * @param {string} [data.nestId] Nested group ID
   * @param {string} [data.id] Group ID
   * @param {number} [data.level] Group level
   * @param {string} [data.type] Group type
   * @returns {Array} Group
   */
  getGroup({ nestId, id, level, type } = {}) {
    if (nestId) return this.groups[nestId];

    return Object.values(this.groups).find(group =>
      (!id || group.id === id)
      && (!level || group.level === level)
      && (!type || group.type === type)
    );
  }

  /* -------------------------------------------- */

  /**
   * Get matching groups.
   * @public
   * @param {object} [data = {}] Group data
   * @param {string} [data.nestId] Nested group ID
   * @param {string} [data.id] Group ID
   * @param {number} [data.level] Group level
   * @param {string} [data.type] Group type
   * @param {boolean} [data.selected] Whether the group is selected
   * @returns {Array} List of matching groups
   */
  getGroups({ nestId, id, level, type, selected } = {}) {
    return Object.values(this.groups).filter(group =>
      (!nestId || group.nestId.startsWith(nestId))
      && (!id || group.id === id)
      && (!level || group.level === level)
      && (!type || group.type === type)
      && (!selected || group.selected === selected)
    );
  }

  /* -------------------------------------------- */

  /**
   * Get matching actor-related groups.
   * @public
   * @param {object} [data = {}] Group data
   * @param {string} [data.nestId] Nested group ID
   * @param {string} [data.id] Group ID
   * @param {number} [data.level] Group level
   * @param {string} [data.type] Group type
   * @returns {Array} List of groups
   */
  getActorGroups({ nestId, id, level, type } = {}) {
    return Object.values(this.actorGroups).filter(group =>
      (!nestId || group.nestId.startsWith(nestId))
      && (!id || group.id === id)
      && (!level || group.level === level)
      && (!type || group.type === type)
    ).sort((a, b) => (a.level - b.level || a.order - b.order));
  }

  /* -------------------------------------------- */

  /**
   * Get matching user-related groups.
   * @public
   * @param {object} [data = {}] Group data
   * @param {string} [data.nestId] Nested group ID
   * @param {string} [data.id] Group ID
   * @param {number} [data.level] Group level
   * @param {string} [data.type] Group type
   * @returns {Array} List of groups
   */
  getUserGroups({ nestId, id, level, type } = {}) {
    return Object.values(this.userGroups).filter(group =>
      (!nestId || group.nestId.startsWith(nestId))
      && (!id || group.id === id)
      && (!level || group.level === level)
      && (!type || group.type === type)
    ).sort((a, b) => (a.level - b.level || a.order - b.order));
  }

  /* -------------------------------------------- */

  /**
   * Get group IDs.
   * @returns {Array} List of group IDs
   */
  getGroupIds() {
    return Object.values(this.groups).map(group => group.id);
  }

  /* -------------------------------------------- */

  /**
   * Get group settings.
   * @public
   * @param {object} [groupData={}]
   * @returns {object|null} Group settings
   */
  getGroupSettings(groupData = {}) {
    return this.getGroup(groupData)?.settings ?? null;
  }

  /* -------------------------------------------- */
  /* CREATE / UPDATE                              */
  /* -------------------------------------------- */

  /**
   * Create group.
   * @public
   * @param {object} groupData
   * @param {boolean} keepData Whether to keep the data
   * @returns {object} Created group
   */
  createGroup(groupData, keepData = false) {
    const groupDataClone = Utils.deepClone(groupData);
    const nestIdParts = groupData.nestId.split("_");
    const level = nestIdParts.length ?? 1;

    const tooltip = getTooltip(groupData?.tooltip, groupDataClone?.name);

    if (!keepData) {
      groupDataClone.actions = [];
      groupDataClone.groups = { lists: [], tabs: [] };
    }

    const defaultSettings = {
      showTitle: true,
      style: (level === 1) ? "tab" : "list"
    };

    const groupSettings = groupDataClone.settings || {};
    groupSettings.showTitle ??= defaultSettings.showTitle;
    groupSettings.style ??= defaultSettings.style;

    groupDataClone.subtitleClass = (groupSettings.showTitle) ? "" : "tah-hidden";

    const groupSystem = groupDataClone.system || {};

    const commonProps = {
      actions: groupDataClone.actions,
      class: groupDataClone.class || groupDataClone.cssClass || "",
      groups: groupDataClone.groups,
      id: groupDataClone.id,
      info1: groupDataClone.info1 || "",
      info2: groupDataClone.info2 || "",
      info3: groupDataClone.info3 || "",
      level: groupDataClone.level || level || 1,
      listName: groupDataClone.listName || groupDataClone.name,
      name: groupDataClone.name,
      nestId: groupDataClone.nestId || groupDataClone.id,
      order: groupDataClone.order,
      selected: groupDataClone.selected ?? groupDataClone.isSelected ?? groupDataClone.defaultSelected ?? true,
      settings: groupSettings,
      system: groupSystem,
      tooltip,
      type: groupDataClone.type || GROUP_TYPE.CUSTOM
    };

    if (level > 1) {
      commonProps.subtitleClass = groupDataClone.subtitleClass || "";
    }

    return commonProps;
  }

  /* -------------------------------------------- */

  /**
   * Update groups
   * @public
   * @param {Array | object} groupsData         The groups data
   * @param {object} [parentGroupData = null] The parent group data
   */
  updateGroups(groupsData, parentGroupData) {
    if (!Array.isArray(groupsData)) groupsData = [groupsData];

    const level = (parentGroupData?.level ?? 0) + 1;
    const childGroupData = { level };
    if (parentGroupData?.nestId) childGroupData.nestId = parentGroupData.nestId;

    const existingGroups = this.getGroups(childGroupData);

    // Remove any groups that are no longer present
    for (const existingGroup of existingGroups) {
      if (existingGroup.type === "system-derived") {
        existingGroup.selected = false;
        existingGroup.order = 999;
      } else if (!groupsData.find(groupData => groupData.id === existingGroup.id)) {
        delete this.groups[existingGroup.nestId];
      }
    }

    // Add or update groups
    let order = 0;
    for (const groupData of groupsData) {
      groupData.nestId = (parentGroupData?.nestId)
        ? `${parentGroupData.nestId}_${groupData.id}`
        : groupData.id;
      groupData.selected = groupData.selected ?? true;
      groupData.order = order;

      const existingGroup = this.getGroup(groupData);

      if (existingGroup) {
        Object.assign(existingGroup, groupData);
      } else {
        const group = this.createGroup(groupData);
        this.groups[groupData.nestId] = group;
      }
      order++;
    }

    // Update parent group settings
    if (parentGroupData?.settings) {
      const existingParentGroup = this.getGroup(parentGroupData);
      if (existingParentGroup) {
        existingParentGroup.settings = parentGroupData.settings;
      }
    }
  }

  /* -------------------------------------------- */
  /* SAVE                                         */
  /* -------------------------------------------- */

  /**
   * Save group settings
   * @public
   * @param {object} groupData The group data
   */
  saveGroupSettings(groupData) {
    const group = this.getGroup(groupData);
    group.settings = { ...group.settings, ...groupData.settings };
    this.saveGroups({ saveActor: true, saveUser: true });
  }

  /* -------------------------------------------- */

  /**
   * Save groups
   * @public
   * @param {object} options The options
   */
  async saveGroups(options = { saveActor: false, saveUser: false }) {
    if (!Utils.getSetting("enableCustomization")) return;

    Logger.debug("Saving groups...");

    if (options?.saveActor) await this.saveActorGroups();
    if (options?.saveUser) await this.saveUserGroups();

    Logger.debug("Groups saved", { groups: this.groups });
  }

  /* -------------------------------------------- */

  /**
   * Save actor groups to file
   * @public
   */
  async saveActorGroups() {
    if (!this.actor || !Object.keys(this.groups).length) return;

    Logger.debug("Saving actor groups...");

    const actorGroups = {};
    this.actorGroups = {};

    for (const group of Object.values(this.groups)) {
      this.actorGroups[group.nestId] = group;
      actorGroups[group.nestId] = this.#getReducedGroupData(group, true);
    }

    if (this.dataHandler.canSaveData) {
      await this.dataHandler.saveDataAsGm("actor", this.actor.id, actorGroups);

      Logger.debug("Actor groups saved", { actorGroups });
    } else {
      Logger.debug("Actor groups not saved as no GM present");
    }
  }

  /* -------------------------------------------- */

  /**
   * Save user groups to file
   * @public
   */
  async saveUserGroups() {
    if (!Object.keys(this.groups).length) return;

    Logger.debug("Saving user groups...");

    const userGroups = {};
    this.userGroups = {};

    for (const group of Object.values(this.groups)) {
      if (group.type !== "system-derived") {
        this.userGroups[group.nestId] = group;
        userGroups[group.nestId] = this.#getReducedGroupData(group, false);
      }
    }

    if (this.dataHandler.canSaveData) {
      await this.dataHandler.saveDataAsGm("user", game.userId, userGroups);
      Logger.debug("User groups saved", { userGroups });
    } else {
      Logger.debug("User groups not saved as no GM present");
    }
  }

  /* -------------------------------------------- */

  /**
   * Get reduced groups data for saving to flags
   * @private
   * @param {object} data Group data
   * @param {string} data.id Group ID
   * @param {string} data.name Group name
   * @param {string} data.listName List name for the group
   * @param {number} data.level Group level
   * @param {number} data.order Order of the group
   * @param {boolean} data.selected Whether the group is selected
   * @param {object} data.settings Group settings
   * @param {string} data.type Group type
   * @param {Array}  data.actions List of actions for the group (if `keepActions` is true)
   * @param {boolean} keepActions  Whether to keep action data
   * @returns {object} Reduced group data
   */
  #getReducedGroupData({ id, name, listName, level, order, selected, settings, type, actions }, keepActions = false) {
    const data = { id, name, listName, level, order, selected, settings, type };

    if (keepActions) {
      data.actions = actions.map(({ id, isPreset, userSelected }) => { return { id, isPreset, userSelected }; });
    }

    return data;
  }

  /* -------------------------------------------- */
  /* AVAILABLE CHOICES                            */
  /* -------------------------------------------- */

  /**
   * Get available groups.
   * @public
   * @param {object} groupData
   * @returns {Array} List of groups
   */
  async getAvailableGroups(groupData) {
    const derivedGroups = await this.#getDerivedGroups(groupData);
    const systemGroups = await this.#getSystemGroups();
    const compendiumGroups = await this.#getCompendiumGroups();
    const macroGroups = await this.#getMacroGroups();
    return [...derivedGroups, ...systemGroups, ...compendiumGroups, ...macroGroups];
  }

  /* -------------------------------------------- */

  /**
   * Get derived groups.
   * @private
   * @param {object} data
   * @param {string} data.nestId
   * @returns {Array} List of derived groups
   */
  #getDerivedGroups({ nestId }) {
    const derivedGroups = this.getGroups({ nestId, type: GROUP_TYPE.SYSTEM_DERIVED });
    return derivedGroups?.map(group => this.#toChoice(group)) ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Get system groups.
   * @private
   * @returns {Array} List of system groups
   */
  #getSystemGroups() {
    return Object.values(this.defaultGroups).map(group => this.#toChoice(group));
  }

  /* -------------------------------------------- */

  /**
   * Get compendium groups.
   * @private
   * @returns {Array} List of compendium groups
   */
  #getCompendiumGroups() {
    const packs = game.packs.filter(pack =>
      COMPENDIUM_PACK_TYPES.includes(pack.documentName)
            && (foundry.utils.isNewerVersion(game.version, "10") ? pack.visible : (!pack.private || game.user.isGM))
    );
    const groups = packs.map(pack => {
      return {
        id: pack.metadata.id.replace(".", "-"),
        listName: `${game.i18n.localize("tokenActionHud.group")}: ${pack.metadata.label}`,
        name: pack.metadata.label,
        type: "core"
      };
    });
    return groups.map(group => this.#toChoice(group));
  }

  /* -------------------------------------------- */

  /**
   * Get macro groups.
   * @private
   * @returns {Array} List of macro groups
   */
  #getMacroGroups() {
    return [this.#toChoice({
      id: "macros",
      listName: `${game.i18n.localize("tokenActionHud.group")}: ${game.i18n.localize("tokenActionHud.macros")}`,
      name: game.i18n.localize("tokenActionHud.macros"),
      type: "core"
    })];
  }


  /**
   * Convert a group into a popover choice.
   * @private
   * @param {object} groupData
   * @returns {{id: string, name: string, listName: string, type: string}}
   */
  #toChoice(groupData) {
    const { id, name, type, listName } = groupData;
    return { id, name, listName: listName ?? name, type };
  }

  /* -------------------------------------------- */
  /* MUTATIONS                                    */
  /* -------------------------------------------- */

  /**
   * Add group to the HUD.
   * @public
   * @param {object} groupData
   * @param {object} parentGroupData
   * @param {boolean} [update = false] Whether to update an existing group
   */
  addGroup(groupData, parentGroupData, update = false) {
    groupData.type = groupData?.type ?? "system-derived";
    groupData.style = groupData?.style ?? "list";

    if (!parentGroupData?.id && !parentGroupData?.nestId) return;

    const parentGroups = this.getGroups(parentGroupData);
    if (!parentGroups?.length) return;

    for (const parentGroup of parentGroups) {
      const nestId = `${parentGroup.nestId}_${groupData.id}`;
      const existingGroups = this.getGroups({ ...groupData, nestId });

      if (existingGroups.length) {
        if (update) {
          for (const existingGroup of existingGroups) {
            // Temporary fix until info1-3 properties are grouped into info object
            if (groupData.info) {
              Object.assign(groupData, { ...groupData.info });
              delete groupData.info;
            }

            Object.assign(existingGroup, this.createGroup({ ...existingGroup, ...groupData }, true));
          }
        } else {
          for (const existingGroup of existingGroups) {
            const tooltip = getTooltip(groupData.tooltip, existingGroup.name);
            Object.assign(existingGroup, { tooltip });
          }
        }
      } else {
        const group = this.createGroup({ ...groupData, nestId });

        if (!parentGroup.groups) parentGroup.groups = { lists: [], tabs: [] };

        if (group.selected !== false) {
          const isDocked = !!CSS_STYLE[Utils.getSetting("style")]?.isDocked;
          if (!isDocked && group.settings.style === "tab") {
            parentGroup.groups.tabs.push(group);
          } else {
            parentGroup.groups.lists.push(group);
          }
        }
        this.groups[group.nestId] = group;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Update group in the HUD.
   * @public
   * @param {object} groupData
   * @param {object} [parentGroupData = null]
   */
  updateGroup(groupData, parentGroupData = null) {
    groupData.type = groupData?.type ?? "system-derived";

    const updateExistingGroups = existingGroups => {
      for (const existingGroup of existingGroups) {
        // Temporary fix until info1-3 properties are grouped into info object
        if (groupData.info) {
          Object.assign(groupData, { ...groupData.info });
          delete groupData.info;
        }

        Object.assign(existingGroup, this.createGroup({ ...existingGroup, ...groupData }, true));
      }
    };

    if (parentGroupData) {
      const parentGroups = this.getGroups(parentGroupData);
      for (const parentGroup of parentGroups) {
        const nestId = `${parentGroup.nestId}_${groupData.id}`;
        const existingGroups = this.getGroups({ ...groupData, nestId });

        updateExistingGroups(existingGroups);
      }
    } else {
      const existingGroups = this.getGroups(groupData);

      updateExistingGroups(existingGroups);
    }
  }

  /* -------------------------------------------- */

  /**
   * Remove group from HUD.
   * @public
   * @param {object} groupData
   */
  removeGroup(groupData) {
    if (!groupData?.nestId && groupData?.id) {
      Utils.deleteGroupsById(this.hud.groups, groupData.id);
    }

    const groups = this.getGroups(groupData);
    if (!groups?.length) return;

    for (const group of groups) {
      delete this.groups[group.nestId];
      if (groupData?.nestId) {
        Utils.deleteGroupByNestId(this.hud.groups, group.nestId);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Add info to group in the HUD.
   * @public
   * @param {string} groupData
   */
  addGroupInfo(groupData) {
    const groupId = groupData?.id;
    const groupInfo = groupData?.info;

    if (!groupId || !groupInfo) return;

    const groups = this.getGroups(groupData);

    groups.forEach(group => {
      group.info1 = groupInfo.info1;
      group.info2 = groupInfo.info2;
      group.info3 = groupInfo.info3;
    });
  }

  /* -------------------------------------------- */

  /**
   * Set property to indicate whether a group has actions within it.
   * @public
   */
  setHasActions() {
    Object.values(this.groups).forEach(group => {
      if (group.actions.some(action => action.selected)) {
        group.hasActions = true;
      } else {
        group.hasActions = false;
      }
    });
  }
}

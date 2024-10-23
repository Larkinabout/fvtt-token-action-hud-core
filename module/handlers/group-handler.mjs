import { COMPENDIUM_PACK_TYPES, GROUP_TYPE } from "../core/constants.mjs";
import { Logger, Utils } from "../core/utils.mjs";
import { getTooltip } from "../handlers/tooltip-handler.mjs";

/**
 * Handler for the HUD groups.
 */
export class GroupHandler {
  constructor(hudManager, systemManager, dataHandler) {
    this.hudManager = hudManager;
    this.systemManager = systemManager;
    this.dataHandler = dataHandler;
    this.defaultGroups = {};
    this.groups = {};
    this.actorGroups = {};
    this.userGroups = {};
  }

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

  /**
   * Initialise the groups
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
   * Soft reset variables
   */
  softReset() {
    this.defaultGroups = {};
    this.groups = {};
  }

  /* -------------------------------------------- */

  /**
   * Hard reset variables
   */
  hardReset() {
    this.softReset();
    this.actorGroups = {};
    this.userGroups = {};
  }

  /* -------------------------------------------- */

  /**
   * Set the default groups
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
   * Set the saved groups from the actor flag
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
   * Set the saved groups from the user flag
   * @private
   */
  async #setSavedUserGroups() {
    const user = game.user;
    const layout = this.customLayout ?? this.defaultLayout;

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

  /**
   * Prepare groups in the HUD.
   * @param {object} hud The HUD
   * @returns {object}   The prepared groups
   */
  async prepareGroups(hud) {
    if (Object.keys(this.userGroups).length) {
      const userGroups = this.getUserGroups();
      for (const userGroup of userGroups) {
        if (userGroup.level === 1) {
          const group = this.createGroup(userGroup);
          hud.groups.push(group);
          this.groups[group.nestId] = group;
        } else {
          const parentNestId = userGroup.nestId.split("_", userGroup.level - 1).join("_");
          const parentGroup = await Utils.getGroupByNestId(hud.groups, { nestId: parentNestId });
          if (parentGroup) {
            const group = this.createGroup(userGroup);
            if (group.settings.style === "tab") {
              parentGroup.groups.tabs.push(group);
            } else {
              parentGroup.groups.lists.push(group);
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
            const group = this.createGroup(actorGroup, true);
            if (actorGroup.actions?.length) {
              group.actions = actorGroup.actions;
            }

            if (group.settings.style === "tab") {
              parentGroup.groups.tabs.push(group);
            } else {
              parentGroup.groups.lists.push(group);
            }

            this.groups[group.nestId] = group;
          }
        }
      }
    }

    return this.groups;
  }

  /* -------------------------------------------- */

  /**
   * Get first matching group
   * @public
   * @param {object} [data = {}]   The group data
   * @param {string} [data.nestId] The nested group ID
   * @param {string} [data.id]     The group ID
   * @param {number} [data.level]  The group level
   * @param {string} [data.type]   The group type
   * @returns {Array}              The group
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
   * Get matching groups
   * @public
   * @param {object}  [data = {}]     The group data
   * @param {string}  [data.nestId]   The nested group ID
   * @param {string}  [data.id]       The group ID
   * @param {number}  [data.level]    The group level
   * @param {string}  [data.type]     The group type
   * @param {boolean} [data.selected] Whether the group is selected
   * @returns {Array}                 The matching groups
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
   * Get matching actor-related groups
   * @public
   * @param {object}  [data = {}]   The group data
   * @param {string}  [data.nestId] The nested group ID
   * @param {string}  [data.id]     The group ID
   * @param {number}  [data.level]  The group level
   * @param {string}  [data.type]   The group type
   * @returns {Array}               The groups
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
   * Get matching user-related groups
   * @public
   * @param {object}  [data = {}]   The group data
   * @param {string}  [data.nestId] The nested group ID
   * @param {string}  [data.id]     The group ID
   * @param {number}  [data.level]  The group level
   * @param {string}  [data.type]   The group type
   * @returns {Array}               The groups
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
   * Get group IDs
   * @returns {Array} The group IDs
   */
  getGroupIds() {
    return Object.values(this.groups).map(group => group.id);
  }

  /* -------------------------------------------- */

  /**
   * Get group settings
   * @public
   * @param {object} [groupData={}] The group data
   * @returns {object|null}         The group settings
   */
  getGroupSettings(groupData = {}) {
    return this.getGroup(groupData)?.settings ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Create group
   * @public
   * @param {object} groupData The group data
   * @param {boolean} keepData Whether to keep the data
   * @returns {object}         The group
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
   * @param {object}  data          The group data
   * @param {string}  data.id       The group ID
   * @param {string}  data.name     The group name
   * @param {string}  data.listName The list name for the group
   * @param {number}  data.level    The group level
   * @param {number}  data.order    The order of the group
   * @param {boolean} data.selected Whether the group is selected
   * @param {object}  data.settings The group settings
   * @param {string}  data.type     The group type
   * @param {Array}   data.actions  The list of actions for the group (if `keepActions` is true)
   * @param {boolean} keepActions   Whether to keep action data
   * @returns {object}              The reduced group data
   */
  #getReducedGroupData({ id, name, listName, level, order, selected, settings, type, actions }, keepActions = false) {
    const data = { id, name, listName, level, order, selected, settings, type };

    if (keepActions) {
      data.actions = actions.map(({ id, isPreset, userSelected }) => { return { id, isPreset, userSelected }; });
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get selected groups as Tagify entries
   * @public
   * @param {object} groupData The group data
   * @returns {object}         The selected groups
   */
  getSelectedGroupsAsTags(groupData = {}) {
    groupData.selected = true;
    groupData.level = (groupData.level || 0) + 1;
    const groups = this.getGroups(groupData);
    return groups?.map(group => this.#toTagify(group)) ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Get available groups as Tagify entries
   * @public
   * @param {object} groupData The group data
   * @returns {object}         The groups
   */
  async getAvailableGroupAsTags(groupData) {
    const derivedGroups = await this.#getDerivedGroupsAsTags(groupData);
    const systemGroups = await this.#getSystemGroupsAsTags();
    const compendiumGroups = await this.#getCompendiumGroupsAsTags();
    const macroGroups = await this.#getMacroGroupsAsTags();
    return [...derivedGroups, ...systemGroups, ...compendiumGroups, ...macroGroups];
  }

  /* -------------------------------------------- */

  /**
   * Get derived groups as Tagify entries
   * @private
   * @param {object} data        The group data
   * @param {object} data.nestId The group nest ID
   * @returns {object}           The derived groups
   */
  #getDerivedGroupsAsTags({ nestId }) {
    const derivedGroups = this.getGroups({ nestId, type: GROUP_TYPE.SYSTEM_DERIVED });
    return derivedGroups?.map(group => this.#toTagify(group)) ?? [];
  }

  /* -------------------------------------------- */

  /**
   * Get system groups as Tagify entries
   * @private
   * @returns {object} The system groups
   */
  #getSystemGroupsAsTags() {
    return Object.values(this.defaultGroups).map(group => this.#toTagify(group));
  }

  /* -------------------------------------------- */

  /**
   * Get compendium groups as Tagify entries
   * @private
   * @returns {object} The compendium groups
   */
  #getCompendiumGroupsAsTags() {
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
    return groups.map(group => this.#toTagify(group));
  }

  /**
   * Get macro groups as Tagify entries
   * @private
   * @returns {object} The macro groups
   */
  #getMacroGroupsAsTags() {
    return [this.#toTagify({
      id: "macros",
      listName: `${game.i18n.localize("tokenActionHud.group")}: ${game.i18n.localize("tokenActionHud.macros")}`,
      name: game.i18n.localize("tokenActionHud.macros"),
      type: "core"
    })];
  }

  /**
   * Add group to the HUD
   * @public
   * @param {object} groupData         The group data
   * @param {object} parentGroupData   The parent group data
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
        if (group.settings.style === "tab") {
          parentGroup.groups.tabs.push(group);
        } else {
          parentGroup.groups.lists.push(group);
        }
        this.groups[group.nestId] = group;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Update group in the HUD
   * @public
   * @param {object} groupData                The group data
   * @param {object} [parentGroupData = null] The parent group data
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
   * Remove group from HUD
   * @public
   * @param {object} groupData The group data
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
   * Add info to group in the HUD
   * @public
   * @param {string} groupData The group data
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
   * Set property to indicate whether a group has actions within it
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

  /* -------------------------------------------- */

  /**
   * Convert a group into a Tagify entry
   * @private
   * @param {object} groupData The group data
   * @returns {object}         The Tagify entry
   */
  #toTagify(groupData) {
    const { id, name, type, listName } = groupData;
    return { id, name, type, value: listName ?? name };
  }
}

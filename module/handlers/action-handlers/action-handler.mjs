import { DELIMITER } from "../../core/constants.mjs";
import { GenericActionHandler } from "./generic-action-handler.mjs";
import { CompendiumActionHandler } from "./compendium-action-handler.mjs";
import { MacroActionHandler } from "./macro-action-handler.mjs";
import { getTooltip } from "../tooltip-handler.mjs";
import { Logger, Utils } from "../../core/utils.mjs";

/**
 * Handler for the HUD actions.
 */
export class ActionHandler {
  constructor() {
    this.hudManager = {};
    this.groupHandler = {};
    this.genericActionHandler = new GenericActionHandler(this);
    this.compendiumActionHandler = new CompendiumActionHandler(this);
    this.macroActionHandler = new MacroActionHandler(this);
    this.actions = [];
    this.availableActions = new Map();
    this.delimiter = DELIMITER;
    this.actionHandlerExtenders = [];
  }

  /* -------------------------------------------- */

  /**
   * Soft reset variables
   */
  softReset() {
    this.genericActionHandler = new GenericActionHandler(this);
    this.actions = [];
    this.availableActions = new Map();
  }

  /* -------------------------------------------- */

  /**
   * Prepare actions
   * @param {object} groups The HUD groups
   */
  prepareActions(groups) {
    for (const group of Object.values(groups)) {
      if (group.actions?.length) {
        this.actions.push(...group.actions);
        for (const action of group.actions) {
          action.selected = false;
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Build actions
   */
  async buildActionsCore() {
    await Promise.all([
      this.#buildSystemActionsCore(),
      this.#buildGenericActionsCore(),
      this.#buildCompendiumActionsCore(),
      this.#buildMacroActionsCore()
    ]);
    await this.#buildExtendedActionsCore();
    this.#updateNonPresetActions();
    this.#setCharacterLimit();
  }

  /* -------------------------------------------- */

  /**
   * Build system-specific actions
   * @private
   */
  async #buildSystemActionsCore() {
    Logger.debug("Building system actions...", { actor: this.actor, token: this.token });
    const groupIds = this.groupHandler.getGroupIds();
    await this.buildSystemActions(groupIds);
    Logger.debug("System actions built", { hud: this.hud, actor: this.actor, token: this.token });
  }

  /* -------------------------------------------- */

  /**
   * Placeholder function for the system module
   * @override
   * @param {Array} groupIds The group IDs
   */
  async buildSystemActions(groupIds) {}

  /* -------------------------------------------- */

  /**
   * Build compendium-specific actions
   * @private
   */
  async #buildCompendiumActionsCore() {
    Logger.debug("Building compendium actions...");
    await this.compendiumActionHandler.buildActions();
    Logger.debug("Compendium actions built", { hud: this.hud });
  }

  /* -------------------------------------------- */

  /**
   * Build generic actions
   * @private
   */
  #buildGenericActionsCore() {
    Logger.debug("Building generic actions...", { actor: this.actor, token: this.token });
    this.genericActionHandler.buildActions();
    Logger.debug("Generic actions built", { hud: this.hud, actor: this.actor, token: this.token });
  }

  /* -------------------------------------------- */

  /**
   * Build macro-specific actions
   * @private
   */
  async #buildMacroActionsCore() {
    Logger.debug("Building macro actions...");
    await this.macroActionHandler.buildActions();
    Logger.debug("Macro actions built", { hud: this.hud });
  }

  /* -------------------------------------------- */

  /**
   * Build extended actions
   * @private
   */
  async #buildExtendedActionsCore() {
    await Promise.all(this.actionHandlerExtenders.map(
      async extender => await extender.extendActionHandler()
    ));
  }

  /* -------------------------------------------- */

  /**
   * Update non-preset actions
   * @private
   */
  #updateNonPresetActions() {
    const nonPresetActions = this.actions.filter(action => !action?.isPreset);

    for (const nonPresetAction of nonPresetActions) {
      const availableAction = this.availableActions.get(nonPresetAction.id);

      if (availableAction) {
        const systemSelected = availableAction.systemSelected ?? nonPresetAction.systemSelected;
        const userSelected = nonPresetAction.userSelected ?? availableAction.userSelected;
        Object.assign(nonPresetAction, this.#createAction({ ...availableAction, systemSelected, userSelected }));
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Set character limit for action names based on the 'Character per Word' setting
   * @private
   */
  #setCharacterLimit() {
    const groups = this.groupHandler.getGroups({ level: 1 });

    for (const group of groups) {
      const groupCharacterCount = group?.settings?.characterCount;

      const subgroups = this.groupHandler.getGroups({ nestId: group.nestId });

      for (const subgroup of subgroups) {
        const actions = subgroup.actions;
        if (!actions?.length) continue;

        const subgroupCharacterCount = subgroup?.settings?.characterCount;
        const characterCount = (subgroupCharacterCount >= 0)
          ? groupCharacterCount
          : subgroupCharacterCount;

        // Exit if character limit is not defined
        if ((!characterCount && characterCount !== 0) || characterCount < 0) continue;

        for (const action of actions) {
          if (action.name.length <= characterCount) continue;
          if (characterCount === 0) {
            action.name = "";
            continue;
          }
          // Set each word to the character limit
          action.name = action.name
            .split(" ")
            .map(word => word.slice(0, characterCount))
            .join(" ");
        }
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Get actions by ID
   * @public
   * @param {object} actionData The action data
   * @returns {Array}           The actions
   */
  getActions(actionData) {
    return this.actions.filter(action => action.id === actionData.id);
  }

  /* -------------------------------------------- */

  /**
   * Create action
   * @private
   * @param {object} actionData The action data
   * @returns {object}          The action
   */
  #createAction(actionData) {
    const fullName = actionData.fullName ?? actionData.name;
    const tooltip = getTooltip(actionData.tooltip, fullName);

    const infoProps = info => {
      if (!info) return {};
      return {
        ...(info.class && { class: info.class }),
        ...(info.icon && { icon: info.icon }),
        ...(info.text && { text: info.text }),
        ...(info.title && { title: info.title })
      };
    };

    return {
      id: actionData.id,
      name: actionData.name,
      fullName,
      listName: actionData.listName || actionData.name,
      ...(actionData.onClick && { onClick: actionData.onClick }),
      ...(actionData.onHover && { onClick: actionData.onHover }),
      ...(actionData.encodedValue && { encodedValue: actionData.encodedValue }),
      ...(actionData.cssClass && { cssClass: actionData.cssClass }),
      icons: actionData.icons || {},
      ...(actionData.icon1 && { icon1: actionData.icon1 }),
      ...(actionData.icon2 && { icon2: actionData.icon2 }),
      ...(actionData.icon3 && { icon3: actionData.icon3 }),
      ...(actionData.img && { img: actionData.img }),
      info1: infoProps(actionData.info1),
      info2: infoProps(actionData.info2),
      info3: infoProps(actionData.info3),
      system: actionData.system || {},
      isAction: true,
      ...(actionData.isItem && { isItem: actionData.isItem }),
      ...(actionData.isPreset && { isPreset: actionData.isPreset }),
      userSelected: actionData.userSelected ?? true,
      systemSelected: actionData.systemSelected ?? true,
      selected: actionData.systemSelected
        ? actionData.userSelected ?? actionData.systemSelected ?? true
        : false,
      tooltip,
      ...(actionData.useRawHtmlName && { useRawHtmlName: actionData.useRawHtmlName })
    };
  }

  /* -------------------------------------------- */

  /**
   * Add actions to the HUD
   * @public
   * @param {object} actionsData The actions data
   * @param {object} groupData   The group data
   */
  addActions(actionsData, groupData) {
    if (!actionsData.length) return;

    // Create actions
    const actions = new Map(actionsData.map(actionData => [actionData.id, this.#createAction(actionData)]));
    this.#addToAvailableActions(actions);

    if (!groupData?.id) return;

    if (!groupData?.type) { groupData.type = "system"; }

    const groups = this.groupHandler.getGroups(groupData);

    if (!groups) return;

    for (const group of groups) {
      // Get existing actions
      const existingActions = new Map(group.actions.map(action => [action.id, action]));

      const reorderedActions = [];

      // Loop the previously saved actions in the group
      existingActions.forEach((existingAction, existingActionId) => {
        const action = actions.get(existingActionId);
        if (action) {
          const systemSelected = action.systemSelected ?? existingAction.systemSelected;
          const userSelected = existingAction.userSelected ?? action.userSelected;
          const selected = (!systemSelected)
            ? false
            : userSelected ?? systemSelected ?? true;
          Object.assign(existingAction, { ...action, isPreset: true, selected, systemSelected, userSelected });
        } else if (!existingAction.selected && existingAction.isPreset) {
          const systemSelected = false;
          Object.assign(existingAction, this.#createAction({ ...existingAction, systemSelected }));
        }
      });

      // Loop the generated actions and add any not previously saved
      actions.forEach((action, actionId) => {
        const existingAction = existingActions.get(actionId);
        if (!existingAction) reorderedActions.push(this.#createAction({ ...action, isPreset: true }));
      });

      // Sort actions alphabetically
      if (
        groupData?.settings?.sort
        || (typeof groupData?.settings?.sort === "undefined" && Utils.getSetting("sortActions"))
      ) {
        reorderedActions.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Add actions to group
      group.actions.push(...reorderedActions);
    }
  }

  /* -------------------------------------------- */

  /**
   * Update actions
   * @public
   * @param {Array} actionsData The actions data
   * @param {object} groupData  The group data
   */
  updateActions(actionsData, groupData) {
    const group = this.groupHandler.getGroup(groupData);
    const actions = group.actions;

    const reorderedActions = [];

    // Set 'selected' to true for selected actions
    // Reorder actions based on order in dialog
    for (const actionData of actionsData) {
      if (actionData.id.includes("itemMacro")) continue;
      const existingAction = group.actions.find(action => action.id === actionData.id);
      if (existingAction) {
        const actionClone = { ...existingAction, userSelected: true };
        reorderedActions.push(actionClone);
      } else {
        const availableAction = this.availableActions.get(actionData.id);
        if (availableAction) {
          const actionClone = { ...availableAction, userSelected: true };
          reorderedActions.push(actionClone);
        }
      }
    }
    // Set 'selected' to false for unselected actions
    for (const action of actions) {
      if (!action.id || action?.id.includes("itemMacro")) continue;

      const actionData = actionsData.find(actionData => actionData.id === action.id);
      if (!actionData && action.isPreset) {
        const actionClone = { ...action, userSelected: false };
        reorderedActions.push(actionClone);
      }
    }

    // Sort actions alphabetically
    if (groupData?.settings?.sort
      || (typeof groupData?.settings?.sort === "undefined" && Utils.getSetting("sortActions"))) {
      reorderedActions.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Replace group actions
    group.actions = reorderedActions;
  }

  /* -------------------------------------------- */

  /**
   * Add to available actions
   * @private
   * @param {Array} actions The actions
   */
  #addToAvailableActions(actions) {
    actions.forEach((action, actionId) => {
      if (!this.availableActions.has(actionId)) this.availableActions.set(actionId, action);
    });
  }

  /* -------------------------------------------- */

  /**
   * Get available actions as Tagify entries
   * @public
   * @returns {Array} The available actions as Tagify entries
   */
  getAvailableActionsAsTags() {
    return [...this.availableActions.values()]
      .map(action => this.#toTagify(action))
      .sort((a, b) => a.value.localeCompare(b.value));
  }

  /* -------------------------------------------- */

  /**
   * Get selected actions as Tagify entries
   * @public
   * @param {object} groupData The group data
   * @returns {Array}          The selected actions as Tagify entries
   */
  getSelectedActionsAsTags(groupData) {
    const group = this.groupHandler.getGroup(groupData);
    if (!group) return [];
    return group.actions
      .filter(action => action.selected === true)
      .map(action => this.#toTagify(action));
  }

  /* -------------------------------------------- */

  /**
   * Add action handler extender
   * @public
   * @param {object} actionHandlerExtender The action handler extender
   */
  addActionHandlerExtender(actionHandlerExtender) {
    Logger.debug("Adding action handler extender...", { actionHandlerExtender });
    actionHandlerExtender.hudManager = this.hudManager;
    actionHandlerExtender.groupHandler = this.groupHandler;
    actionHandlerExtender.actionHandler = this;
    this.actionHandlerExtenders.push(actionHandlerExtender);
  }

  /* -------------------------------------------- */

  /**
   * Convert an action into a Tagify entry
   * @private
   * @param {object} actionData The action data
   * @returns {object}          The Tagify entry
   */
  #toTagify(actionData) {
    const { id, name, listName } = actionData;
    return { id, name, type: "action", value: listName ?? name };
  }

  /* -------------------------------------------- */
  /* Shortcuts to the HudManager properties       */
  /* -------------------------------------------- */

  /**
   * Get character name
   * @returns {string} The character name
   */
  get characterName() {
    return this.hudManager?.characterName;
  }

  /* -------------------------------------------- */

  /**
   * Get actor
   * @returns {object} The actor
   */
  get actor() {
    return this.hudManager?.actor;
  }

  /* -------------------------------------------- */

  /**
   * Set actor
   */
  set actor(actor) {
    this.hudManager.actor = actor;
  }

  /* -------------------------------------------- */

  /**
   * Get actors
   * @returns {Array} The actors
   */
  get actors() {
    return this.hudManager?.actors;
  }

  /* -------------------------------------------- */

  /**
   * Set actors
   * @param {Array} actors The actors
   */
  set actors(actors) {
    this.hudManager.actors = actors;
  }

  /* -------------------------------------------- */

  /**
   * Get token
   * @returns {object} The token
   */
  get token() {
    return this.hudManager?.token;
  }

  /* -------------------------------------------- */

  /**
   * Set token
   */
  set token(token) {
    this.hudManager.token = token;
  }

  /* -------------------------------------------- */

  /**
   * Get tokens
   * @returns {Array} The tokens
   */
  get tokens() {
    return this.hudManager?.tokens;
  }

  /* -------------------------------------------- */

  /**
   * Set tokens
   * @param {Array} tokens The tokens
   */
  set tokens(tokens) {
    this.hudManager.tokens = tokens;
  }

  /* -------------------------------------------- */

  /**
   * Whether the right mouse button was clicked
   * @returns {boolean} Whether the right mouse button was clicked
   */
  get isRightClick() {
    return this.hudManager?.isRightClick;
  }

  /* -------------------------------------------- */

  /**
   * Whether the ALT key was pressed
   * @returns {boolean} Whether the ALT key was pressed
   */
  get isAlt() {
    return this.hudManager?.isAlt;
  }

  /* -------------------------------------------- */

  /**
   * Whether the CTRL key was pressed
   * @returns {boolean} Whether the CTRL key was pressed
   */
  get isCtrl() {
    return this.hudManager?.isCtrl;
  }

  /* -------------------------------------------- */

  /**
   * Whether the SHIFT key was pressed
   * @returns {boolean} Whether the SHIFT key was pressed
   */
  get iShift() {
    return this.hudManager?.isShift;
  }
}

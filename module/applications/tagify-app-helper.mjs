import { TagifyApp } from "./tagify-app.mjs";
import { Utils } from "../core/utils.mjs";

/**
 * Generates data for the Tagify application.
 */
export class TagifyAppHelper {
  /**
   * Show the HUD dialog
   * @public
   * @param {class} groupHandler The GroupHandler instance
   */
  static async openEditHudApp(groupHandler) {
    // Set available and selected tags
    const tags = {};
    tags.available = [];
    tags.selected = await groupHandler.getSelectedGroupsAsTags();
    const grid = await Utils.getSetting("grid");

    // Set dialog data
    const dialogData = {
      title: game.i18n.localize("tokenActionHud.form.hud.hudTitle"),
      content: {
        topLabel: game.i18n.localize("tokenActionHud.form.hud.hudDetail"),
        placeholder: game.i18n.localize("tokenActionHud.form.hud.tagPlaceholder"),
        settings: { grid }
      }
    };

    // Set function on submit
    const dialogSubmit = async (choices, formData) => {
      const grid = formData?.grid;
      await groupHandler.updateGroups(choices, { level: 0 });
      await groupHandler.saveGroups({ saveActor: true, saveUser: true });
      await Utils.setSetting("grid", grid);
      Hooks.callAll("forceUpdateTokenActionHud");
    };

    // Show dialog
    TagifyApp.open("hud", null, tags, dialogData, dialogSubmit);
  }

  /* -------------------------------------------- */

  /**
   * Show group dialog
   * @public
   * @param {class} groupHandler The GroupHandler instance
   * @param {object} groupData   The group data
   */
  static async openEditGroupApp(groupHandler, groupData) {
    const { nestId, name, level } = groupData;

    // Set available and selected tags
    const tags = {};

    // Get available subcategories
    tags.available = await groupHandler.getAvailableGroupAsTags({ nestId, level });

    // Get selected subcategories
    tags.selected = await groupHandler.getSelectedGroupsAsTags({ nestId, level });

    // Set dialog data
    const dialogData = {
      title: `${game.i18n.localize("tokenActionHud.form.hud.groupTitle")}: ${name}`,
      content: {
        topLabel: game.i18n.localize("tokenActionHud.form.hud.groupDetail"),
        placeholder: game.i18n.localize("tokenActionHud.form.hud.tagPlaceholder"),
        settings: await groupHandler.getGroupSettings(groupData)
      }
    };

    // Set function on submit
    const dialogSubmit = async (choices, formData) => {
      choices = choices.map(choice => {
        choice.id =
                choice.id
                ?? choice.name.slugify({
                  replacement: "-",
                  strict: true
                });
        choice.type = choice.type ?? "custom";
        return {
          id: choice.id,
          listName: choice.listName,
          name: choice.name,
          type: choice.type
        };
      });

      const characterCount = formData?.characterCount;
      const customWidth = formData?.customWidth;
      const grid = formData?.grid;
      const image = formData?.image;
      const showTitle = formData?.showTitle;
      const sort = formData?.sort;
      groupData.settings = { characterCount, customWidth, grid, image, showTitle, sort };

      // Save selected subcategories to user action list
      await groupHandler.updateGroups(choices, groupData);
      await groupHandler.saveGroups({ saveActor: true, saveUser: true });
      Hooks.callAll("forceUpdateTokenActionHud");
    };

    TagifyApp.open(
      "topLevelGroup",
      nestId,
      tags,
      dialogData,
      dialogSubmit
    );
  }

  /* -------------------------------------------- */

  /**
   * Show action dialog
   * @public
   * @param {class} groupHandler  The GroupHandler instance
   * @param {class} actionHandler The ActionHandler instance
   * @param {object} groupData    The group data
   */
  static async openEditSubgroupApp(groupHandler, actionHandler, groupData) {
    const { nestId, name, level } = groupData;

    // Set available and selected tags
    const tags = {};

    // Get available groups and actions
    const availableActions = await actionHandler.getAvailableActionsAsTags(groupData);
    const availableGroups = await groupHandler.getAvailableGroupAsTags({ nestId, level });
    tags.available = [...availableActions, ...availableGroups];

    // Get selected actions and subcategories
    const selectedActions = await actionHandler.getSelectedActionsAsTags(groupData);
    const selectedGroups = await groupHandler.getSelectedGroupsAsTags({ nestId, level });
    tags.selected = [...selectedActions, ...selectedGroups];

    // Set dialog data
    const dialogData = {
      title: `${game.i18n.localize("tokenActionHud.form.hud.groupTitle")}: ${name} `,
      content: {
        topLabel: game.i18n.localize("tokenActionHud.form.hud.groupDetail"),
        placeholder: game.i18n.localize("tokenActionHud.form.hud.tagPlaceholder"),
        settings: await groupHandler.getGroupSettings(groupData)
      }
    };

    // Set function on submit
    const dialogSubmit = async (choices, formData) => {
      const selectedGroups = [];
      const selectedActions = [];
      for (const choice of choices) {
        if (choice.type === "action") {
          selectedActions.push(choice);
        } else {
          selectedGroups.push(choice);
        }
      }

      // Get advanced category options
      const characterCount = formData?.characterCount;
      const collapse = formData?.collapse;
      const customWidth = formData?.customWidth;
      const grid = formData?.grid;
      const image = formData?.image;
      const showTitle = formData?.showTitle;
      const sort = formData?.sort;
      const style = formData?._style;
      groupData.settings = { characterCount, collapse, customWidth, grid, image, showTitle, sort, style };

      // Save subcategories to user action list
      await groupHandler.updateGroups(selectedGroups, groupData);
      await actionHandler.updateActions(selectedActions, groupData);
      await groupHandler.saveGroups({ saveActor: true, saveUser: true });

      Hooks.callAll("forceUpdateTokenActionHud");
    };

    TagifyApp.open(
      "group",
      nestId,
      tags,
      dialogData,
      dialogSubmit
    );
  }
}

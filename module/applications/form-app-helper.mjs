import { HudFormApp, GroupFormApp, SubgroupFormApp } from "./form-app.mjs";
import { Utils } from "../core/utils.mjs";

/**
 * Opens settings forms for the HUD, groups, and subgroups, and performs
 * group/action deletion.
 */
export class FormAppHelper {
  /**
   * Show the HUD dialog
   * @public
   * @param {GroupHandler} groupHandler
   */
  static async openEditHudApp(groupHandler) {
    const grid = await Utils.getSetting("grid");

    const dialogData = {
      title: game.i18n.localize("tokenActionHud.form.hud.hudTitle"),
      content: { settings: { grid } },
      submit: async formData => {
        await Utils.setSetting("grid", formData?.grid);
        Hooks.callAll("forceUpdateTokenActionHud");
      }
    };

    new HudFormApp(dialogData).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Show group dialog.
   * @public
   * @param {GroupHandler} groupHandler
   * @param {object} groupData
   */
  static async openEditGroupApp(groupHandler, groupData) {
    const { nestId, name } = groupData;
    const currentSettings = await groupHandler.getGroupSettings(groupData) ?? {};

    const dialogData = {
      title: `${game.i18n.localize("tokenActionHud.form.hud.groupTitle")}: ${name}`,
      content: {
        settings: { ...currentSettings, name }
      },
      submit: async formData => {
        const group = groupHandler.getGroup({ nestId });
        if (!group) return;
        const newName = (formData?.name ?? "").trim();
        if (newName) {
          group.name = newName;
          group.listName = newName;
        }
        group.settings = {
          ...group.settings,
          characterCount: formData?.characterCount,
          customWidth: formData?.customWidth,
          grid: formData?.grid,
          image: formData?.image,
          showTitle: formData?.showTitle,
          sort: formData?.sort
        };
        await groupHandler.saveGroups({ saveActor: true, saveUser: true });
        Hooks.callAll("forceUpdateTokenActionHud");
      }
    };

    new GroupFormApp(dialogData).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Show dialog to add a new top-level group at a specific position.
   * @public
   * @param {GroupHandler} groupHandler
   * @param {number} position
   */
  static async openAddGroupApp(groupHandler, position) {
    const dialogData = {
      title: game.i18n.localize("tokenActionHud.form.newGroup.title"),
      content: {
        settings: {
          name: "",
          showTitle: true,
          image: "",
          customWidth: null,
          grid: false,
          characterCount: null
        }
      },
      submit: async formData => {
        const name = (formData?.name ?? "").trim();
        if (!name) return;

        const baseId = name.slugify({ replacement: "-", strict: true }) || "group";
        const existingIds = new Set(
          Object.values(groupHandler.groups)
            .filter(g => g.level === 1)
            .map(g => g.id)
        );
        let id = baseId;
        let suffix = 2;
        while (existingIds.has(id)) id = `${baseId}-${suffix++}`;

        const selected = Object.values(groupHandler.groups)
          .filter(g => g.level === 1 && g.selected)
          .sort((a, b) => a.order - b.order)
          .map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
        const newGroup = { id, listName: name, name, type: "custom" };
        const insertAt = Math.max(0, Math.min(position, selected.length));
        selected.splice(insertAt, 0, newGroup);

        await groupHandler.updateGroups(selected, { level: 0 });

        const newGroupData = groupHandler.getGroup({ nestId: id });
        if (newGroupData) {
          newGroupData.settings = {
            characterCount: formData?.characterCount,
            customWidth: formData?.customWidth,
            grid: formData?.grid,
            image: formData?.image,
            showTitle: formData?.showTitle
          };
        }

        await groupHandler.saveGroups({ saveActor: true, saveUser: true });
        Hooks.callAll("forceUpdateTokenActionHud");
      }
    };

    new GroupFormApp(dialogData).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Show subgroup dialog.
   * @public
   * @param {GroupHandler} groupHandler
   * @param {ActionHandler} actionHandler
   * @param {object} groupData
   */
  static async openEditSubgroupApp(groupHandler, actionHandler, groupData) {
    const { nestId, name } = groupData;
    const currentSettings = await groupHandler.getGroupSettings(groupData) ?? {};

    const dialogData = {
      title: `${game.i18n.localize("tokenActionHud.form.hud.groupTitle")}: ${name} `,
      content: {
        settings: { ...currentSettings, name }
      },
      submit: async formData => {
        const group = groupHandler.getGroup({ nestId });
        if (!group) return;
        const newName = (formData?.name ?? "").trim();
        if (newName) {
          group.name = newName;
          group.listName = newName;
        }
        group.settings = {
          ...group.settings,
          characterCount: formData?.characterCount,
          collapse: formData?.collapse,
          customWidth: formData?.customWidth,
          grid: formData?.grid,
          image: formData?.image,
          showTitle: formData?.showTitle,
          sort: formData?.sort,
          style: formData?._style
        };
        await groupHandler.saveGroups({ saveActor: true, saveUser: true });
        Hooks.callAll("forceUpdateTokenActionHud");
      }
    };

    new SubgroupFormApp(dialogData).render(true);
  }

  /* -------------------------------------------- */

  /**
   * Delete a group or subgroup from the HUD.
   * @public
   * @param {GroupHandler} groupHandler
   * @param {object} groupData
   * @param {string} groupData.nestId
   * @param {number} groupData.level
   */
  static async deleteGroup(groupHandler, { nestId, level }) {
    if (level === 1) {
      const siblings = Object.values(groupHandler.groups)
        .filter(g => g.level === 1 && g.selected && g.nestId !== nestId)
        .sort((a, b) => a.order - b.order)
        .map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      await groupHandler.updateGroups(siblings, { level: 0 });
    } else {
      const parentNestId = nestId.split("_").slice(0, -1).join("_");
      const parentGroupData = groupHandler.getGroup({ nestId: parentNestId });
      if (!parentGroupData) return;
      const allChildren = Object.values(groupHandler.groups)
        .filter(g => g.nestId.startsWith(`${parentNestId}_`) && g.level === level && g.selected && g.nestId !== nestId)
        .sort((a, b) => a.order - b.order);
      const lists = allChildren
        .filter(g => g.settings?.style !== "tab")
        .map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      const tabs = allChildren
        .filter(g => g.settings?.style === "tab")
        .map(g => ({ id: g.id, listName: g.listName, name: g.name, type: g.type }));
      await groupHandler.updateGroups([...lists, ...tabs], parentGroupData);
    }

    const descendantPrefix = `${nestId}_`;
    for (const key of Object.keys(groupHandler.groups)) {
      if (key === nestId || key.startsWith(descendantPrefix)) {
        delete groupHandler.groups[key];
      }
    }

    await groupHandler.saveGroups({ saveActor: true, saveUser: true });
    Hooks.callAll("forceUpdateTokenActionHud");
  }

  /* -------------------------------------------- */

  /**
   * Delete an action from a subgroup.
   * @public
   * @param {GroupHandler} groupHandler
   * @param {ActionHandler} actionHandler
   * @param {object} data
   * @param {string} data.nestId
   * @param {string} data.actionId
   */
  static async deleteAction(groupHandler, actionHandler, { nestId, actionId }) {
    const group = groupHandler.getGroup({ nestId });
    if (!group) return;
    const remaining = group.actions
      .filter(a => a.selected && a.id !== actionId)
      .map(a => ({ id: a.id, listName: a.listName, name: a.name, type: a.type }));
    actionHandler.updateActions(remaining, { nestId });
    await groupHandler.saveGroups({ saveActor: true, saveUser: true });
    Hooks.callAll("forceUpdateTokenActionHud");
  }
}

import { MODULE, TEMPLATE } from "../core/constants.mjs";
import { resetLayoutDialog } from "../dialogs/reset-layout.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base settings form for HUD / group / subgroup edit dialogs.
 */
export class FormApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(data) {
    super(data);
    this.content = data.content;
    this.submit = data.submit;
    this.options.window.title = data.title;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      resetActions: FormApp.resetActions,
      resetLayout: FormApp.resetLayout
    },
    classes: [`${MODULE.ID}-app`, "tah-dialog", "sheet"],
    id: "token-action-hud-dialog",
    form: {
      closeOnSubmit: true,
      handler: FormApp.submit
    },
    position: {
      width: 540,
      height: "auto"
    },
    tag: "form",
    window: {
      minimizable: true,
      resizable: true
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    return this.content;
  }

  /* -------------------------------------------- */

  /**
   * Reset the actor's HUD data. Only used by the HUD dialog's Reset Actions button.
   * @private
   */
  static async resetActions() {
    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("tokenActionHud.dialog.resetActions.title")
      },
      content: `<p>${game.i18n.localize("tokenActionHud.dialog.resetActions.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("tokenActionHud.dialog.button.yes"),
        callback: async () => {
          await game.tokenActionHud.resetActorData();
        }
      },
      no: {
        label: game.i18n.localize("tokenActionHud.dialog.button.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Reset the user's HUD layout to the default. Only used by the HUD
   * dialog's Reset Layout button.
   * @private
   */
  static async resetLayout() {
    await resetLayoutDialog();
  }

  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @param {Event} event
   * @param {object} form
   * @param {object} formData
   */
  static async submit(event, form, formData) {
    await this.submit(formData.object);
  }
}

/* -------------------------------------------- */

export class HudFormApp extends FormApp {
  static DEFAULT_OPTIONS = {
    window: { icon: "fa-solid fa-pen-to-square" }
  };

  static PARTS = {
    form: {
      template: TEMPLATE.formHud
    }
  };
}

/* -------------------------------------------- */

export class GroupFormApp extends FormApp {
  static DEFAULT_OPTIONS = {
    window: { icon: "fa-solid fa-layer-group" }
  };

  static PARTS = {
    form: {
      template: TEMPLATE.formGroup
    }
  };
}

/* -------------------------------------------- */

export class SubgroupFormApp extends FormApp {
  static DEFAULT_OPTIONS = {
    window: { icon: "fa-solid fa-list" }
  };

  static PARTS = {
    form: {
      template: TEMPLATE.formSubgroup
    }
  };
}

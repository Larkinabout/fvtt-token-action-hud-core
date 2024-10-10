import { MODULE, LAYOUT_SETTING, TEMPLATE } from "../constants.js";
import { resetLayoutDialog } from "../dialogs/reset-layout.js";
import { resetAllLayoutsDialog } from "../dialogs/reset-all-layouts.js";
import { Utils } from "../utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class TahSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(...args) {
    super(args);

    this.settings = {};
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      exportLayout: TahSettingsForm.exportLayout,
      resetLayout: resetLayoutDialog,
      resetAllLayouts: resetAllLayoutsDialog,
      reset: TahSettingsForm.reset
    },
    classes: [`${MODULE.ID}-app`, "sheet"],
    id: "token-action-hud-core-settings",
    form: {
      closeOnSubmit: true,
      handler: TahSettingsForm.submit
    },
    position: {
      width: 600,
      height: "auto"
    },
    tag: "form",
    window: {
      minimizable: true,
      resizable: true
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: TEMPLATE.settings
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    const settings = [];
    const context = { settings };

    for (const [key, setting] of Object.entries(this.settings)) {
      const { scope, hint, icon, label, name, type, inputType, range, choices, action } = setting;

      if (scope === "world" && !game.user.isGM) continue;

      const value = (setting?.scope)
        ? (scope === "user")
          ? await Utils.getUserFlag(key)
          : await Utils.getSetting(key)
        : "";
      const settingType = type instanceof Function ? type.name : "String";
      const isButton = inputType === "button";
      const isCheckbox = inputType === "checkbox";
      const isFilePicker = inputType === "filePicker";
      const filePickerType = (inputType === "filePicker") ? settingType ?? "any" : "";
      const isNumber = inputType === "number";
      const isRange = (inputType === "range") && range;
      const isSelect = choices !== undefined;
      settings.push({
        id: key,
        hint: game.i18n.localize(hint),
        icon,
        label: game.i18n.localize(label),
        name: game.i18n.localize(name),
        value,
        type,
        isButton,
        action,
        isCheckbox,
        isFilePicker,
        filePickerType,
        isNumber,
        isRange,
        isSelect
      });
    }
    return context;
  }

  /* -------------------------------------------- */

  static exportLayout() {
    if (!game.tokenActionHud) return;
    game.tokenActionHud.actionHandler.exportLayout();
  }

  static async submit(event, form, formData) {
    for (const [key, value] of Object.entries(formData.object)) {
      switch (this.settings[key].scope) {
        case "client":
        case "world":
          await Utils.setSetting(key, value); break;
        case "user":
          await Utils.setUserFlag(key, value); break;
      }

      await game.tokenActionHud.updateSettings(key, value);
    }

    game.tokenActionHud.update();
  }
}

/* -------------------------------------------- */

export class TahSettingsFormLayout extends TahSettingsForm {
  constructor() {
    super();
    this.settings = LAYOUT_SETTING;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    window: {
      title: "tokenActionHud.settings.layout.form.title"
    }
  };
}

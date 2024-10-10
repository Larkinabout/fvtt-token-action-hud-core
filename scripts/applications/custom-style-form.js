import { CUSTOM_STYLE, MODULE, TEMPLATE } from "../constants.js";
import { Utils } from "../utils.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CustomStyleForm extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(...args) {
    super(args);
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      reset: CustomStyleForm.reset
    },
    classes: [`${MODULE.ID}-app`, "sheet"],
    id: "token-action-hud-core-settings",
    form: {
      closeOnSubmit: true,
      handler: CustomStyleForm.submit
    },
    position: {
      width: 600,
      height: 680
    },
    tag: "form",
    window: {
      minimizable: true,
      resizable: true,
      title: "tokenActionHud.settings.customStyle.form.title"
    }
  };

  /* -------------------------------------------- */

  static PARTS = {
    form: {
      template: TEMPLATE.customStyleForm
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    this.context = {
      backgroundColor: Utils.getSetting("backgroundColor", CUSTOM_STYLE.backgroundColor.default),
      buttonHeight: Utils.getSetting("buttonHeight", CUSTOM_STYLE.buttonHeight.default),
      buttonBackgroundColor: Utils.getSetting("buttonBackgroundColor", CUSTOM_STYLE.buttonBackgroundColor.default),
      buttonHoverBackgroundColor: Utils.getSetting("buttonHoverBackgroundColor", CUSTOM_STYLE.buttonHoverBackgroundColor.default),
      buttonToggleActiveBackgroundColor: Utils.getSetting("buttonToggleActiveBackgroundColor", CUSTOM_STYLE.buttonToggleActiveBackgroundColor.default),
      buttonToggleHoverBackgroundColor: Utils.getSetting("buttonToggleHoverBackgroundColor", CUSTOM_STYLE.buttonToggleHoverBackgroundColor.default),
      buttonTextColor: Utils.getSetting("buttonTextColor", CUSTOM_STYLE.buttonTextColor.default),
      buttonHoverTextColor: Utils.getSetting("buttonHoverTextColor", CUSTOM_STYLE.buttonHoverTextColor.default),
      buttonToggleActiveTextColor: Utils.getSetting("buttonToggleActiveTextColor", CUSTOM_STYLE.buttonToggleActiveTextColor.default),
      buttonToggleHoverTextColor: Utils.getSetting("buttonToggleHoverTextColor", CUSTOM_STYLE.buttonToggleHoverTextColor.default),
      buttonBorderPrimaryColor: Utils.getSetting("buttonBorderPrimaryColor", CUSTOM_STYLE.buttonBorderPrimaryColor.default),
      buttonBorderSecondaryColor: Utils.getSetting("buttonBorderSecondaryColor", CUSTOM_STYLE.buttonBorderSecondaryColor.default),
      buttonHoverBorderPrimaryColor: Utils.getSetting("buttonHoverBorderPrimaryColor", CUSTOM_STYLE.buttonHoverBorderPrimaryColor.default),
      buttonHoverBorderSecondaryColor: Utils.getSetting("buttonHoverBorderSecondaryColor", CUSTOM_STYLE.buttonHoverBorderSecondaryColor.default),
      buttonToggleActiveBorderPrimaryColor: Utils.getSetting("buttonToggleActiveBorderPrimaryColor", CUSTOM_STYLE.buttonToggleActiveBorderPrimaryColor.default),
      buttonToggleActiveBorderSecondaryColor: Utils.getSetting("buttonToggleActiveBorderSecondaryColor", CUSTOM_STYLE.buttonToggleActiveBorderSecondaryColor.default),
      buttonToggleHoverBorderPrimaryColor: Utils.getSetting("buttonToggleHoverBorderPrimaryColor", CUSTOM_STYLE.buttonToggleHoverBorderPrimaryColor.default),
      buttonToggleHoverBorderSecondaryColor: Utils.getSetting("buttonToggleHoverBorderSecondaryColor", CUSTOM_STYLE.buttonToggleHoverBorderSecondaryColor.default),
      textPrimaryColor: Utils.getSetting("textPrimaryColor", CUSTOM_STYLE.textPrimaryColor.default),
      textSecondaryColor: Utils.getSetting("textSecondaryColor", CUSTOM_STYLE.textSecondaryColor.default),
      textTertiaryColor: Utils.getSetting("textTertiaryColor", CUSTOM_STYLE.textTertiaryColor.default),
      textHoverPrimaryColor: Utils.getSetting("textHoverPrimaryColor", CUSTOM_STYLE.textHoverPrimaryColor.default),
      textHoverSecondaryColor: Utils.getSetting("textHoverSecondaryColor", CUSTOM_STYLE.textHoverSecondaryColor.default),
      textHoverTertiaryColor: Utils.getSetting("textHoverTertiaryColor", CUSTOM_STYLE.textHoverTertiaryColor.default)
    };
    return this.context;
  }

  /* -------------------------------------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    if (typeof ColorPicker !== "undefined") { ColorPicker.install(); }
  }

  /* -------------------------------------------- */

  static async reset() {
    for (const [key, value] of Object.entries(CUSTOM_STYLE)) {
      Utils.setSetting(key, value.default);
      document.querySelector(":root").style.setProperty(value.cssProperty, value.default);
    }
    this.render(true);
  }

  /* -------------------------------------------- */

  static async submit(event, form, formData) {
    const isCustom = Utils.getSetting("style") === "custom";
    for (const [key, value] of Object.entries(formData.object)) {
      const customStyle = CUSTOM_STYLE[key];
      if (value !== this.context[key]) {
        Utils.setSetting(key, value);
        if (isCustom) {
          document.querySelector(":root").style.setProperty(customStyle.cssProperty, value);
        }
      }
    }
  }
}

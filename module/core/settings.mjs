import { CustomStyleForm } from "../applications/custom-style-form.mjs";
import { TahSettingsFormLayout } from "../applications/settings-form.mjs";
import { CUSTOM_STYLE, MODULE } from "./constants.mjs";
import { Logger, Utils } from "./utils.mjs";

/**
 * When a module setting is changed, update the HUD settings
 * @param {string} key The setting key
 * @param {*} value    The setting value
 */
function onChangeFunction(key, value) {
  if (game.tokenActionHud) game.tokenActionHud.updateCachedSettings(key, value);
}

/* -------------------------------------------- */

// Register key bindings
Hooks.on("init", async () => {
  game.keybindings.register(MODULE.ID, "enableDisableHud", {
    name: game.i18n.localize("tokenActionHud.enableDisableHud"),
    editable: [],
    onDown: () => { if (game.tokenActionHud) game.tokenActionHud.toggleHudEnable(); }
  });

  game.keybindings.register(MODULE.ID, "collapseExpandHud", {
    name: game.i18n.localize("tokenActionHud.collapseExpandHud"),
    editable: [],
    onDown: () => { if (game.tokenActionHud) game.tokenActionHud.toggleHudCollapse(); }
  });
});

/* -------------------------------------------- */

/**
 * Register module settings
 * @param {class} systemManager The system manager
 * @param {Array} rollHandlers  The available roll handlers
 * @param {object} styles       The styles
 */
export const registerSettingsCore = function(systemManager, rollHandlers, styles) {
  game.settings.registerMenu(MODULE.ID, "customStyle", {
    hint: game.i18n.localize("tokenActionHud.settings.customStyle.hint"),
    label: game.i18n.localize("tokenActionHud.settings.customStyle.label"),
    name: game.i18n.localize("tokenActionHud.settings.customStyle.name"),
    icon: "fas fa-palette",
    type: CustomStyleForm,
    restricted: false,
    scope: "client"
  });

  /* -------------------------------------------- */

  game.settings.registerMenu(MODULE.ID, "layout", {
    hint: game.i18n.localize("tokenActionHud.settings.layout.hint"),
    label: game.i18n.localize("tokenActionHud.settings.layout.label"),
    name: game.i18n.localize("tokenActionHud.settings.layout.name"),
    icon: "fas fa-table-layout",
    type: TahSettingsFormLayout,
    restricted: false,
    scope: "client"
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "startup", {
    name: "One-Time Startup Prompt",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "migrationVersion", {
    name: "Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0.0"
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "enable", {
    name: game.i18n.localize("tokenActionHud.settings.enable.name"),
    hint: game.i18n.localize("tokenActionHud.settings.enable.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("enable", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "rollHandler", {
    name: game.i18n.localize("tokenActionHud.settings.rollHandler.name"),
    hint: game.i18n.localize("tokenActionHud.settings.rollHandler.hint"),
    scope: "world",
    config: true,
    type: String,
    choices: rollHandlers,
    default: "core",
    onChange: value => {
      onChangeFunction("rollHandler", value);
    }
  });

  /* -------------------------------------------- */

  const styleChoices = Object.fromEntries(Object.entries(styles).map(([key, value]) => [key, value.name]));

  game.settings.register(MODULE.ID, "style", {
    name: game.i18n.localize("tokenActionHud.settings.style.name"),
    hint: game.i18n.localize("tokenActionHud.settings.style.hint"),
    scope: "client",
    config: true,
    type: String,
    default: "foundryVTT",
    choices: styleChoices,
    onChange: value => {
      Utils.switchCSS(value);
      onChangeFunction("style", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "customLayout", {
    name: game.i18n.localize("tokenActionHud.settings.customLayout.name"),
    hint: game.i18n.localize("tokenActionHud.settings.customLayout.hint"),
    scope: "world",
    config: false,
    type: String
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "userCustomLayout", {
    name: game.i18n.localize("tokenActionHud.settings.userCustomLayout.name"),
    hint: game.i18n.localize("tokenActionHud.settings.userCustomLayout.hint"),
    scope: "client",
    config: false,
    type: String
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "allow", {
    name: game.i18n.localize("tokenActionHud.settings.allow.name"),
    hint: game.i18n.localize("tokenActionHud.settings.allow.hint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      4: game.i18n.localize("tokenActionHud.settings.allow.choice.4"),
      3: game.i18n.localize("tokenActionHud.settings.allow.choice.3"),
      2: game.i18n.localize("tokenActionHud.settings.allow.choice.2"),
      1: game.i18n.localize("tokenActionHud.settings.allow.choice.1")
    },
    default: 1,
    requiresReload: true
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "enableCustomization", {
    name: game.i18n.localize("tokenActionHud.settings.enableCustomization.name"),
    hint: game.i18n.localize("tokenActionHud.settings.enableCustomization.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("enableCustomization", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "enableCompendiumActions", {
    name: game.i18n.localize("tokenActionHud.settings.enableCompendiumActions.name"),
    hint: game.i18n.localize("tokenActionHud.settings.enableCompendiumActions.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("enableCompendiumActions", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "enableMacroActions", {
    name: game.i18n.localize("tokenActionHud.settings.enableMacroActions.name"),
    hint: game.i18n.localize("tokenActionHud.settings.enableMacroActions.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("enableMacroActions", value);
    }
  });

   /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "direction", {
    name: game.i18n.localize("tokenActionHud.settings.direction.name"),
    hint: game.i18n.localize("tokenActionHud.settings.direction.hint"),
    scope: "client",
    config: true,
    type: String,
    default: "auto",
    choices: {
      auto: game.i18n.localize("tokenActionHud.settings.direction.choice.auto"),
      up: game.i18n.localize("tokenActionHud.settings.direction.choice.up"),
      down: game.i18n.localize("tokenActionHud.settings.direction.choice.down")
    },
    onChange: value => {
      onChangeFunction("direction", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "grid", {
    name: game.i18n.localize("tokenActionHud.settings.grid.name"),
    hint: game.i18n.localize("tokenActionHud.settings.grid.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      onChangeFunction("grid", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "scale", {
    name: game.i18n.localize("tokenActionHud.settings.scale.name"),
    hint: game.i18n.localize("tokenActionHud.settings.scale.hint"),
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 0.5,
      max: 2,
      step: 0.05
    },
    default: 1,
    onChange: value => {
      onChangeFunction("scale", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "drag", {
    name: game.i18n.localize("tokenActionHud.settings.drag.name"),
    hint: game.i18n.localize("tokenActionHud.settings.drag.hint"),
    scope: "client",
    config: true,
    type: String,
    default: "whenUnlocked",
    choices: {
      always: game.i18n.localize("tokenActionHud.settings.drag.choices.always"),
      whenUnlocked: game.i18n.localize("tokenActionHud.settings.drag.choices.whenUnlocked"),
      never: game.i18n.localize("tokenActionHud.settings.drag.choices.never")
    },
    onChange: value => {
      onChangeFunction("drag", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "alwaysShowHud", {
    name: game.i18n.localize("tokenActionHud.settings.alwaysShowHud.name"),
    hint: game.i18n.localize("tokenActionHud.settings.alwaysShowHud.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("alwaysShowHud", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "clickOpenCategory", {
    name: game.i18n.localize("tokenActionHud.settings.clickOpenCategory.name"),
    hint: game.i18n.localize("tokenActionHud.settings.clickOpenCategory.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      onChangeFunction("clickOpenCategory", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "collapsibleSubgroups", {
    name: game.i18n.localize("tokenActionHud.settings.collapsibleSubgroups.name"),
    hint: game.i18n.localize("tokenActionHud.settings.collapsibleSubgroups.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("collapsibleSubgroups", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "displayCharacterName", {
    name: game.i18n.localize("tokenActionHud.settings.displayCharacterName.name"),
    hint: game.i18n.localize("tokenActionHud.settings.displayCharacterName.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("displayCharacterName", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "sortActions", {
    name: game.i18n.localize("tokenActionHud.settings.sortActions.name"),
    hint: game.i18n.localize("tokenActionHud.settings.sortActions.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      onChangeFunction("sortActions", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "displayIcons", {
    name: game.i18n.localize("tokenActionHud.settings.displayIcons.name"),
    hint: game.i18n.localize("tokenActionHud.settings.displayIcons.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      onChangeFunction("displayIcons", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "tooltips", {
    name: game.i18n.localize("tokenActionHud.settings.tooltips.name"),
    hint: game.i18n.localize("tokenActionHud.settings.tooltips.hint"),
    scope: "client",
    config: true,
    type: String,
    default: "full",
    choices: {
      full: game.i18n.localize("tokenActionHud.settings.tooltips.choices.full"),
      nameOnly: game.i18n.localize("tokenActionHud.settings.tooltips.choices.nameOnly"),
      none: game.i18n.localize("tokenActionHud.settings.tooltips.choices.none")
    },
    onChange: value => {
      onChangeFunction("tooltips", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "tooltipDelay", {
    name: game.i18n.localize("tokenActionHud.settings.tooltipDelay.name"),
    hint: game.i18n.localize("tokenActionHud.settings.tooltipDelay.hint"),
    scope: "client",
    config: true,
    type: Number,
    default: 1500,
    onChange: value => {
      setTooltipDelay(value);
    }
  });

  /* -------------------------------------------- */

  const tooltipDelay = Utils.getSetting("tooltipDelay") || 1500;
  setTooltipDelay(tooltipDelay);

  /**
   * Set the tooltip delay
   * @param {number} ms Delay amount in milliseconds
   */
  function setTooltipDelay(ms) {
    const root = document.querySelector(":root");
    root.style.setProperty("--tah-tooltip-delay", `${ms}ms`);
  }

  /* -------------------------------------------- */

  if (Utils.isModuleActive("itemacro") && !Utils.isModuleActive("midi-qol")) {
    game.settings.register(MODULE.ID, "itemMacro", {
      name: game.i18n.localize("tokenActionHud.settings.itemMacro.name"),
      hint: game.i18n.localize("tokenActionHud.settings.itemMacro.hint"),
      scope: "client",
      config: true,
      type: String,
      choices: {
        both: game.i18n.localize("tokenActionHud.settings.itemMacro.choices.both"),
        itemMacro: game.i18n.localize("tokenActionHud.settings.itemMacro.choices.itemMacro"),
        original: game.i18n.localize("tokenActionHud.settings.itemMacro.choices.original")
      },
      default: "both",
      onChange: value => {
        onChangeFunction("itemMacro", value);
      }
    });
  }

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "activeCssAsText", {
    name: game.i18n.localize("tokenActionHud.settings.activeCssAsText.name"),
    hint: game.i18n.localize("tokenActionHud.settings.activeCssAsText.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      onChangeFunction("activeCssAsText", value);
    }
  });

  /* -------------------------------------------- */

  game.settings.register(MODULE.ID, "debug", {
    name: game.i18n.localize("tokenActionHud.settings.debug.name"),
    hint: game.i18n.localize("tokenActionHud.settings.debug.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      onChangeFunction("debug", value);
    }
  });

  /* -------------------------------------------- */

  registerCustomStyleSettings();

  systemManager.registerSettings(onChangeFunction);

  Logger.debug("Available roll handlers", { rollHandlers });
};

/* -------------------------------------------- */

/**
 * Register color settings
 */
function registerCustomStyleSettings() {
  for (const [key, value] of Object.entries(CUSTOM_STYLE)) {
    game.settings.register(MODULE.ID, key, {
      scope: "client",
      config: false,
      type: value.type,
      default: value.default
    });
  }
}

import { CustomStyleForm } from './forms/custom-style-form.js'
import { TahSettingsFormLayout } from './forms/settings-form.js'
import { CUSTOM_STYLE, MODULE } from './constants.js'
import { Logger, Utils } from './utils.js'

function onChangeFunction (setting, value) { if (game.tokenActionHud) game.tokenActionHud.updateSettings(setting, value) }

// Register key bindings
Hooks.on('init', async () => {
    game.keybindings.register(MODULE.ID, 'toggleHud', {
        name: Utils.i18n('tokenActionHud.toggleHud'),
        editable: [],
        onDown: () => { game.tokenActionHud.toggleHud() }
    })
})

/**
 * Register module settings
 * @param {object} systemManager The SystemManager class
 * @param {array} rollHandlers   The available roll handlers
 */
export const registerSettingsCore = function (systemManager, rollHandlers, styles) {
    game.settings.registerMenu(MODULE.ID, 'customStyle', {
        hint: Utils.i18n('tokenActionHud.settings.customStyle.hint'),
        label: Utils.i18n('tokenActionHud.settings.customStyle.label'),
        name: Utils.i18n('tokenActionHud.settings.customStyle.name'),
        icon: 'fas fa-palette',
        type: CustomStyleForm,
        restricted: false,
        scope: 'client'
    })

    game.settings.registerMenu(MODULE.ID, 'layout', {
        hint: Utils.i18n('tokenActionHud.settings.layout.hint'),
        label: Utils.i18n('tokenActionHud.settings.layout.label'),
        name: Utils.i18n('tokenActionHud.settings.layout.name'),
        icon: 'fas fa-table-layout',
        type: TahSettingsFormLayout,
        restricted: false,
        scope: 'client'
    })

    game.settings.register(MODULE.ID, 'startup', {
        name: 'One-Time Startup Prompt',
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    })

    game.settings.register(MODULE.ID, 'migrationVersion', {
        name: 'Migration Version',
        scope: 'world',
        config: false,
        type: String,
        default: '0.0'
    })

    const styleChoices = Object.fromEntries(Object.entries(styles).map(([key, value]) => [key, value.name]))

    game.settings.register(MODULE.ID, 'style', {
        name: Utils.i18n('tokenActionHud.settings.style.name'),
        hint: Utils.i18n('tokenActionHud.settings.style.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'foundryVTT',
        choices: styleChoices,
        onChange: (value) => {
            Utils.switchCSS(value)
        }
    })

    game.settings.register(MODULE.ID, 'customLayout', {
        name: Utils.i18n('tokenActionHud.settings.customLayout.name'),
        hint: Utils.i18n('tokenActionHud.settings.customLayout.hint'),
        scope: 'world',
        config: false,
        type: String
    })

    game.settings.register(MODULE.ID, 'userCustomLayout', {
        name: Utils.i18n('tokenActionHud.settings.userCustomLayout.name'),
        hint: Utils.i18n('tokenActionHud.settings.userCustomLayout.hint'),
        scope: 'client',
        config: false,
        type: String
    })

    game.settings.register(MODULE.ID, 'direction', {
        name: Utils.i18n('tokenActionHud.settings.direction.name'),
        hint: Utils.i18n('tokenActionHud.settings.direction.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'auto',
        choices: {
            auto: Utils.i18n('tokenActionHud.settings.direction.choice.auto'),
            up: Utils.i18n('tokenActionHud.settings.direction.choice.up'),
            down: Utils.i18n('tokenActionHud.settings.direction.choice.down')
        },
        onChange: (value) => {
            onChangeFunction('direction', value)
        }
    })

    game.settings.register(MODULE.ID, 'grid', {
        name: Utils.i18n('tokenActionHud.settings.grid.name'),
        hint: Utils.i18n('tokenActionHud.settings.grid.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction('grid', value)
        }
    })

    game.settings.register(MODULE.ID, 'scale', {
        name: Utils.i18n('tokenActionHud.settings.scale.name'),
        hint: Utils.i18n('tokenActionHud.settings.scale.hint'),
        scope: 'client',
        config: true,
        type: Number,
        range: {
            min: 0.5,
            max: 2,
            step: 0.05
        },
        default: 1,
        onChange: (value) => {
            onChangeFunction('scale', value)
        }
    })

    game.settings.register(MODULE.ID, 'drag', {
        name: Utils.i18n('tokenActionHud.settings.drag.name'),
        hint: Utils.i18n('tokenActionHud.settings.drag.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'whenUnlocked',
        choices: {
            always: Utils.i18n('tokenActionHud.settings.drag.choices.always'),
            whenUnlocked: Utils.i18n('tokenActionHud.settings.drag.choices.whenUnlocked'),
            never: Utils.i18n('tokenActionHud.settings.drag.choices.never')
        },
        onChange: (value) => {
            onChangeFunction('drag', value)
        }
    })

    game.settings.register(MODULE.ID, 'enable', {
        name: Utils.i18n('tokenActionHud.settings.enable.name'),
        hint: Utils.i18n('tokenActionHud.settings.enable.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction('enable', value)
        }
    })

    game.settings.register(MODULE.ID, 'rollHandler', {
        name: Utils.i18n('tokenActionHud.settings.rollHandler.name'),
        hint: Utils.i18n('tokenActionHud.settings.rollHandler.hint'),
        scope: 'world',
        config: true,
        type: String,
        choices: rollHandlers,
        default: 'core',
        onChange: (value) => {
            onChangeFunction('rollHandler', value)
        }
    })

    game.settings.register(MODULE.ID, 'allow', {
        name: Utils.i18n('tokenActionHud.settings.allow.name'),
        hint: Utils.i18n('tokenActionHud.settings.allow.hint'),
        scope: 'world',
        config: true,
        type: String,
        choices: {
            4: Utils.i18n('tokenActionHud.settings.allow.choice.4'),
            3: Utils.i18n('tokenActionHud.settings.allow.choice.3'),
            2: Utils.i18n('tokenActionHud.settings.allow.choice.2'),
            1: Utils.i18n('tokenActionHud.settings.allow.choice.1')
        },
        default: 1,
        requiresReload: true
    })

    game.settings.register(MODULE.ID, 'enableCustomization', {
        name: Utils.i18n('tokenActionHud.settings.enableCustomization.name'),
        hint: Utils.i18n('tokenActionHud.settings.enableCustomization.hint'),
        scope: 'world',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction('enableCustomization', value)
        }
    })

    game.settings.register(MODULE.ID, 'alwaysShowHud', {
        name: Utils.i18n('tokenActionHud.settings.alwaysShowHud.name'),
        hint: Utils.i18n('tokenActionHud.settings.alwaysShowHud.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction('alwaysShowHud', value)
        }
    })

    game.settings.register(MODULE.ID, 'displayCharacterName', {
        name: Utils.i18n('tokenActionHud.settings.displayCharacterName.name'),
        hint: Utils.i18n('tokenActionHud.settings.displayCharacterName.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction('displayCharacterName', value)
        }
    })

    game.settings.register(MODULE.ID, 'sortActions', {
        name: Utils.i18n('tokenActionHud.settings.sortActions.name'),
        hint: Utils.i18n('tokenActionHud.settings.sortActions.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction('sortActions', value)
        }
    })

    game.settings.register(MODULE.ID, 'displayIcons', {
        name: Utils.i18n('tokenActionHud.settings.displayIcons.name'),
        hint: Utils.i18n('tokenActionHud.settings.displayIcons.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction('displayIcons', value)
        }
    })

    game.settings.register(MODULE.ID, 'tooltips', {
        name: Utils.i18n('tokenActionHud.settings.tooltips.name'),
        hint: Utils.i18n('tokenActionHud.settings.tooltips.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'full',
        choices: {
            full: Utils.i18n('tokenActionHud.settings.tooltips.choices.full'),
            nameOnly: Utils.i18n('tokenActionHud.settings.tooltips.choices.nameOnly'),
            none: Utils.i18n('tokenActionHud.settings.tooltips.choices.none')
        },
        onChange: (value) => {
            onChangeFunction('tooltips', value)
        }
    })

    game.settings.register(MODULE.ID, 'tooltipDelay', {
        name: Utils.i18n('tokenActionHud.settings.tooltipDelay.name'),
        hint: Utils.i18n('tokenActionHud.settings.tooltipDelay.hint'),
        scope: 'client',
        config: true,
        type: Number,
        default: 1500,
        onChange: (value) => {
            setTooltipDelay(value)
        }
    })

    const tooltipDelay = Utils.getSetting('tooltipDelay') || 1500
    setTooltipDelay(tooltipDelay)

    function setTooltipDelay (ms) {
        const root = document.querySelector(':root')
        root.style.setProperty('--tah-tooltip-delay', `${ms}ms`)
    }

    game.settings.register(MODULE.ID, 'clickOpenCategory', {
        name: Utils.i18n('tokenActionHud.settings.clickOpenCategory.name'),
        hint: Utils.i18n('tokenActionHud.settings.clickOpenCategory.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction('clickOpenCategory', value)
        }
    })

    if (Utils.isModuleActive('itemacro') && !Utils.isModuleActive('midi-qol')) {
        game.settings.register(MODULE.ID, 'itemMacro', {
            name: Utils.i18n('tokenActionHud.settings.itemMacro.name'),
            hint: Utils.i18n('tokenActionHud.settings.itemMacro.hint'),
            scope: 'client',
            config: true,
            type: String,
            choices: {
                both: Utils.i18n('tokenActionHud.settings.itemMacro.choices.both'),
                itemMacro: Utils.i18n('tokenActionHud.settings.itemMacro.choices.itemMacro'),
                original: Utils.i18n('tokenActionHud.settings.itemMacro.choices.original')
            },
            default: 'both',
            onChange: (value) => {
                onChangeFunction('itemMacro', value)
            }
        })
    }

    game.settings.register(MODULE.ID, 'activeCssAsText', {
        name: Utils.i18n('tokenActionHud.settings.activeCssAsText.name'),
        hint: Utils.i18n('tokenActionHud.settings.activeCssAsText.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction('activeCssAsText', value)
        }
    })

    game.settings.register(MODULE.ID, 'debug', {
        name: Utils.i18n('tokenActionHud.settings.debug.name'),
        hint: Utils.i18n('tokenActionHud.settings.debug.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction('debug', value)
        }
    })

    registerCustomStyleSettings()

    if (systemManager.registerSettings.toString().slice(-2) !== '{}') {
        systemManager.registerSettings(onChangeFunction)
    } else {
        globalThis.logger.warn('Token Action HUD | SystemHandler.doRegisterSettings is deprecated. Use SystemHandler.registerSettings')
        systemManager.doRegisterSettings(onChangeFunction)
    }

    Logger.debug('Available roll handlers', { rollHandlers })
}

/**
 * Register color settings
 */
function registerCustomStyleSettings () {
    for (const [key, value] of Object.entries(CUSTOM_STYLE)) {
        game.settings.register(MODULE.ID, key, {
            scope: 'client',
            config: false,
            type: value.type,
            default: value.default
        })
    }
}

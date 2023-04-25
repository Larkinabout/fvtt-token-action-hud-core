import { MODULE, STYLE_CLASS } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

function onChangeFunction (value) { if (game.tokenActionHud) game.tokenActionHud.updateSettings() }

// Register key bindings
Hooks.on('init', async () => {
    game.keybindings.register(MODULE.ID, 'toggleHud', {
        name: Utils.i18n('tokenActionHud.toggleHud'),
        editable: [{ key: 'KeyH', modifiers: [] }],
        onDown: () => { game.tokenActionHud.toggleHud() }
    })
})

/**
 * Register module settings
 * @param {object} systemManager The SystemManager class
 * @param {array} rollHandlers   The available roll handlers
 */
export const registerSettings = function (systemManager, rollHandlers) {
    game.settings.register(MODULE.ID, 'startup', {
        name: 'One-Time Startup Prompt',
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
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
            onChangeFunction(value)
        }
    })

    game.settings.register(MODULE.ID, 'style', {
        name: Utils.i18n('tokenActionHud.settings.style.name'),
        hint: Utils.i18n('tokenActionHud.settings.style.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'foundryVTT',
        choices: {
            compact: 'Compact',
            dorakoUI: 'Dorako UI',
            foundryVTT: 'Foundry VTT',
            highContrast: 'High Contrast',
            pathfinder: 'Pathfinder'
        },
        onChange: (value) => {
            Utils.switchCSS(value)
        }
    })

    game.settings.register(MODULE.ID, 'direction', {
        name: Utils.i18n('tokenActionHud.settings.direction.name'),
        hint: Utils.i18n('tokenActionHud.settings.direction.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'auto',
        choices: {
            auto: Utils.i18n('tokenActionHud.settings.direction.choices.auto'),
            up: Utils.i18n('tokenActionHud.settings.direction.choices.up'),
            down: Utils.i18n('tokenActionHud.settings.direction.choices.down')
        },
        onChange: (value) => {
            onChangeFunction(value)
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
            onChangeFunction(value)
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
            onChangeFunction(value)
        }
    })

    game.settings.register(MODULE.ID, 'drag', {
        name: Utils.i18n('tokenActionHud.settings.drag.name'),
        hint: Utils.i18n('tokenActionHud.settings.drag.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction(value)
        }
    })

    initColorSettings()

    game.settings.register(MODULE.ID, 'enable', {
        name: Utils.i18n('tokenActionHud.settings.enable.name'),
        hint: Utils.i18n('tokenActionHud.settings.enable.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction(value)
        }
    })

    game.settings.register(MODULE.ID, 'allow', {
        name: Utils.i18n('tokenActionHud.settings.allow.name'),
        hint: Utils.i18n('tokenActionHud.settings.allow.hint'),
        scope: 'world',
        config: true,
        type: String,
        choices: {
            4: Utils.i18n('tokenActionHud.settings.allow.choices.4'),
            3: Utils.i18n('tokenActionHud.settings.allow.choices.3'),
            2: Utils.i18n('tokenActionHud.settings.allow.choices.2'),
            1: Utils.i18n('tokenActionHud.settings.allow.choices.1')
        },
        default: 1,
        requiresReload: true
    })

    game.settings.register(MODULE.ID, 'alwaysShowHud', {
        name: Utils.i18n('tokenActionHud.settings.alwaysShowHud.name'),
        hint: Utils.i18n('tokenActionHud.settings.alwaysShowHud.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction(value)
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
            onChangeFunction(value)
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
            onChangeFunction(value)
        }
    })

    game.settings.register(MODULE.ID, 'clickOpenCategory', {
        name: Utils.i18n('tokenActionHud.settings.clickOpenCategory.name'),
        hint: Utils.i18n('tokenActionHud.settings.clickOpenCategory.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            onChangeFunction(value)
        }
    })

    game.settings.register(MODULE.ID, 'renderItemOnRightClick', {
        name: Utils.i18n('tokenActionHud.settings.renderItemOnRightClick.name'),
        hint: Utils.i18n('tokenActionHud.settings.renderItemOnRightClick.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            onChangeFunction(value)
        }
    })

    if (game.modules.get('itemacro')?.active) {
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
                onChangeFunction(value)
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
            onChangeFunction(value)
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
            onChangeFunction(value)
        }
    })

    game.settings.register(MODULE.ID, 'reset', {
        name: Utils.i18n('tokenActionHud.settings.reset.name'),
        hint: Utils.i18n('tokenActionHud.settings.reset.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            if (value) {
                Utils.setSetting('reset', false)
                game.tokenActionHud.reset()
            }
        }
    })

    systemManager.doRegisterSettings(onChangeFunction)

    Logger.debug('Available roll handlers', { rollHandlers })
}

/**
 * Initiate color settings
 */
function initColorSettings () {
    // Determine color picker module
    let module = null
    if (game.modules.get('lib-themer')?.active) {
        module = 'lib-themer'
    } else if (game.modules.get('color-picker')?.active) {
        module = 'color-picker'
    } else if (game.modules.get('colorsettings')?.active) {
        module = 'colorsettings'
    }

    // Register settings based on module
    switch (module) {
    case 'lib-themer':
        Hooks.once('lib-themer.Ready', (API) => {
            API.register({
                id: MODULE.ID,
                title: game.modules.get(MODULE.ID).title,
                '--tah-background': {
                    name: 'tokenActionHud.settings.background.name',
                    hint: 'tokenActionHud.settings.background.hint',
                    type: 'color',
                    default: '#00000000'
                },
                '--tah-button-background-color-editable': {
                    name: 'tokenActionHud.settings.buttonBackgroundColor.name',
                    hint: 'tokenActionHud.settings.buttonBackgroundColor.hint',
                    type: 'color',
                    default: '#00000080',
                    colors: {
                        buttons: true
                    }
                }
            })
        })
        break
    case 'color-picker':
        if (typeof ColorPicker === 'object') {
            registerColorSettings(module)
        } else {
            Hooks.once('colorPickerReady', () => {
                registerColorSettings(module)
            })
        }
        break
    case 'colorsettings':
        Hooks.once('ready', () => {
            try {
                window.Ardittristan.ColorSetting.tester
                registerColorSettings(module)
            } catch {}
        })
        break
    }
}

/**
 * Register color settings
 * @param {*} module The color picker module
 */
function registerColorSettings (module) {
    const backgroundColor = {
        key: 'background',
        name: Utils.i18n('tokenActionHud.settings.background.name'),
        hint: Utils.i18n('tokenActionHud.settings.background.hint'),
        scope: 'client',
        restricted: false,
        default: '#00000000',
        onChange: (value) => {
            document
                .querySelector(':root')
                .style.setProperty('--tah-background', value)
            onChangeFunction(value)
        }
    }

    const buttonBackgroundColor = {
        key: 'buttonBackgroundColor',
        name: Utils.i18n('tokenActionHud.settings.buttonBackgroundColor.name'),
        hint: Utils.i18n('tokenActionHud.settings.buttonBackgroundColor.hint'),
        scope: 'client',
        restricted: true,
        default: '#00000080',
        onChange: (value) => {
            document.querySelector(':root').style.setProperty('--tah-button-background-color-editable', value)
            onChangeFunction(value)
        }
    }

    // Color Picker module
    if (module === 'color-picker') {
        const pickerOptions = {
            format: 'hexa',
            alphaChannel: true
        }

        ColorPicker.register(
            MODULE.ID,
            backgroundColor.key,
            {
                name: backgroundColor.name,
                hint: backgroundColor.hint,
                scope: backgroundColor.scope,
                restricted: backgroundColor.restricted,
                default: backgroundColor.default,
                onChange: backgroundColor.onChange
            },
            pickerOptions
        )

        ColorPicker.register(
            MODULE.ID,
            buttonBackgroundColor.key,
            {
                name: buttonBackgroundColor.name,
                hint: buttonBackgroundColor.hint,
                scope: buttonBackgroundColor.scope,
                restricted: buttonBackgroundColor.restricted,
                default: buttonBackgroundColor.default,
                onChange: buttonBackgroundColor.onChange
            },
            pickerOptions
        )

    // Color Settings module
    } else if (module === 'colorsettings') {
        new window.Ardittristan.ColorSetting(MODULE.ID, backgroundColor.key, {
            name: backgroundColor.name,
            hint: backgroundColor.hint,
            scope: backgroundColor.scope,
            restricted: backgroundColor.restricted,
            defaultColor: backgroundColor.default,
            onChange: backgroundColor.onChange,
            insertAfter: `${MODULE.ID}.scale`
        })

        new window.Ardittristan.ColorSetting(MODULE.ID, buttonBackgroundColor.key, {
            name: buttonBackgroundColor.name,
            hint: buttonBackgroundColor.hint,
            scope: buttonBackgroundColor.scope,
            restricted: buttonBackgroundColor.restricted,
            defaultColor: buttonBackgroundColor.default,
            onChange: buttonBackgroundColor.onChange,
            insertAfter: `${MODULE.ID}.${backgroundColor.key}`
        })
    }

    document
        .querySelector(':root')
        .style.setProperty(
            '--tah-background',
            Utils.getSetting('background') ?? '#00000000'
        )
    document
        .querySelector(':root')
        .style.setProperty(
            '--tah-button-background-color-editable',
            Utils.getSetting('buttonBackgroundColor') ?? '#000000b3'
        )
}

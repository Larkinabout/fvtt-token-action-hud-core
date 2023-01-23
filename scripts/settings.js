import { Logger, getSetting, setSetting, switchCSS } from './utilities/utils.js'

const updateFunc = (value) => {
    if (game.tokenActionHud) game.tokenActionHud.updateSettings()
}
let appName

export const registerSettings = function (app, systemManager, rollHandlers) {
    appName = app

    game.settings.register(appName, 'startup', {
        name: 'One-Time Startup Prompt',
        scope: 'world',
        config: false,
        type: Boolean,
        default: false
    })

    game.settings.register(appName, 'rollHandler', {
        name: game.i18n.localize('tokenActionHud.settings.rollHandler.name'),
        hint: game.i18n.localize('tokenActionHud.settings.rollHandler.hint'),
        scope: 'world',
        config: true,
        type: String,
        choices: rollHandlers,
        default: 'core',
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'style', {
        name: game.i18n.localize('tokenActionHud.settings.style.name'),
        hint: game.i18n.localize('tokenActionHud.settings.style.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'foundryVTT',
        choices: {
            compact: 'Compact',
            foundryVTT: 'Foundry VTT',
            dorakoUI: 'Dorako UI'
        },
        onChange: (value) => {
            switchCSS(value)
        }
    })

    game.settings.register(appName, 'direction', {
        name: game.i18n.localize('tokenActionHud.settings.direction.name'),
        hint: game.i18n.localize('tokenActionHud.settings.direction.hint'),
        scope: 'client',
        config: true,
        type: String,
        default: 'down',
        choices: {
            up: game.i18n.localize('tokenActionHud.settings.direction.choices.up'),
            down: game.i18n.localize('tokenActionHud.settings.direction.choices.down')
        },
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'scale', {
        name: game.i18n.localize('tokenActionHud.settings.scale.name'),
        hint: game.i18n.localize('tokenActionHud.settings.scale.hint'),
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
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'drag', {
        name: game.i18n.localize('tokenActionHud.settings.drag.name'),
        hint: game.i18n.localize('tokenActionHud.settings.drag.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    initColorSettings(appName)

    game.settings.register(appName, 'enable', {
        name: game.i18n.localize('tokenActionHud.settings.enable.name'),
        hint: game.i18n.localize('tokenActionHud.settings.enable.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'allow', {
        name: game.i18n.localize('tokenActionHud.settings.allow.name'),
        hint: game.i18n.localize('tokenActionHud.settings.allow.hint'),
        scope: 'world',
        config: true,
        type: String,
        choices: {
            4: game.i18n.localize('tokenActionHud.settings.allow.choices.4'),
            3: game.i18n.localize('tokenActionHud.settings.allow.choices.3'),
            2: game.i18n.localize('tokenActionHud.settings.allow.choices.2'),
            1: game.i18n.localize('tokenActionHud.settings.allow.choices.1')
        },
        default: 1,
        onChange: foundry.utils.debounce(() => window.location.reload(), 100)
    })

    game.settings.register(appName, 'alwaysShowHud', {
        name: game.i18n.localize('tokenActionHud.settings.alwaysShowHud.name'),
        hint: game.i18n.localize('tokenActionHud.settings.alwaysShowHud.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'displayCharacterName', {
        name: game.i18n.localize('tokenActionHud.settings.displayCharacterName.name'),
        hint: game.i18n.localize('tokenActionHud.settings.displayCharacterName.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'displayIcons', {
        name: game.i18n.localize('tokenActionHud.settings.displayIcons.name'),
        hint: game.i18n.localize('tokenActionHud.settings.displayIcons.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'clickOpenCategory', {
        name: game.i18n.localize('tokenActionHud.settings.clickOpenCategory.name'),
        hint: game.i18n.localize('tokenActionHud.settings.clickOpenCategory.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'renderItemOnRightClick', {
        name: game.i18n.localize(
            'tokenActionHud.settings.renderItemOnRightClick.name'
        ),
        hint: game.i18n.localize(
            'tokenActionHud.settings.renderItemOnRightClick.hint'
        ),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    if (game.modules.get('itemacro')?.active) {
        game.settings.register(appName, 'itemMacro', {
            name: game.i18n.localize('tokenActionHud.settings.itemMacro.name'),
            hint: game.i18n.localize('tokenActionHud.settings.itemMacro.hint'),
            scope: 'client',
            config: true,
            type: String,
            choices: {
                both: game.i18n.localize('tokenActionHud.settings.itemMacro.choices.both'),
                itemMacro: game.i18n.localize('tokenActionHud.settings.itemMacro.choices.itemMacro'),
                original: game.i18n.localize('tokenActionHud.settings.itemMacro.choices.original')
            },
            default: 'both',
            onChange: (value) => {
                updateFunc(value)
            }
        })
    }

    game.settings.register(appName, 'activeCssAsText', {
        name: game.i18n.localize('tokenActionHud.settings.activeCssAsText.name'),
        hint: game.i18n.localize('tokenActionHud.settings.activeCssAsText.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'debug', {
        name: game.i18n.localize('tokenActionHud.settings.debug.name'),
        hint: game.i18n.localize('tokenActionHud.settings.debug.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            updateFunc(value)
        }
    })

    game.settings.register(appName, 'reset', {
        name: game.i18n.localize('tokenActionHud.settings.reset.name'),
        hint: game.i18n.localize('tokenActionHud.settings.reset.hint'),
        scope: 'client',
        config: true,
        type: Boolean,
        default: false,
        onChange: (value) => {
            if (value) {
                setSetting('reset', false)
                game.tokenActionHud.reset()
            }
        }
    })

    systemManager.doRegisterSettings(updateFunc)

    Logger.debug('Available roll handlers', { rollHandlers })
}

export function initColorSettings (appName) {
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
                id: appName,
                title: game.modules.get(appName).title,
                '--tah-background': {
                    name: 'tokenActionHud.settings.background.name',
                    hint: 'tokenActionHud.settings.background.hint',
                    type: 'color',
                    default: '#00000000'
                },
                '--tah-button-background': {
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
            registerColorSettings(appName, module)
        } else {
            Hooks.once('colorPickerReady', () => {
                registerColorSettings(appName, module)
            })
        }
        break
    case 'colorsettings':
        Hooks.once('ready', () => {
            try {
                window.Ardittristan.ColorSetting.tester
                registerColorSettings(appName, module)
            } catch {}
        })
        break
    }
}

function registerColorSettings (appName, module) {
    const backgroundColor = {
        key: 'background',
        name: game.i18n.localize('tokenActionHud.settings.background.name'),
        hint: game.i18n.localize('tokenActionHud.settings.background.hint'),
        scope: 'client',
        restricted: false,
        default: '#00000000',
        onChange: (value) => {
            document
                .querySelector(':root')
                .style.setProperty('--tah-background', value)
            updateFunc(value)
        }
    }

    const buttonBackgroundColor = {
        key: 'buttonBackgroundColor',
        name: game.i18n.localize(
            'tokenActionHud.settings.buttonBackgroundColor.name'
        ),
        hint: game.i18n.localize(
            'tokenActionHud.settings.buttonBackgroundColor.hint'
        ),
        scope: 'client',
        restricted: true,
        default: '#00000080',
        onChange: (value) => {
            document.querySelector(':root').style.setProperty('--tah-button-background', value)
            updateFunc(value)
        }
    }

    const buttonBorderColor = {
        key: 'buttonBorderColor',
        name: game.i18n.localize('tokenActionHud.settings.buttonBorderColor.name'),
        hint: game.i18n.localize('tokenActionHud.settings.buttonBorderColor.hint'),
        scope: 'client',
        restricted: true,
        default: '#000000ff',
        onChange: (value) => {
            document
                .querySelector(':root')
                .style.setProperty('--tah-button-outline', value)
            updateFunc(value)
        }
    }

    // Color Picker module
    if (module === 'color-picker') {
        const pickerOptions = {
            format: 'hexa',
            alphaChannel: true
        }

        ColorPicker.register(
            appName,
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
            appName,
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

        ColorPicker.register(
            appName,
            buttonBorderColor.key,
            {
                name: buttonBorderColor.name,
                hint: buttonBorderColor.hint,
                scope: buttonBorderColor.scope,
                restricted: buttonBorderColor.restricted,
                default: buttonBorderColor.default,
                onChange: buttonBorderColor.onChange
            },
            pickerOptions
        )

    // Color Settings module
    } else if (module === 'colorsettings') {
        new window.Ardittristan.ColorSetting(appName, backgroundColor.key, {
            name: backgroundColor.name,
            hint: backgroundColor.hint,
            scope: backgroundColor.scope,
            restricted: backgroundColor.restricted,
            defaultColor: backgroundColor.default,
            onChange: backgroundColor.onChange,
            insertAfter: `${appName}.scale`
        })

        new window.Ardittristan.ColorSetting(appName, buttonBackgroundColor.key, {
            name: buttonBackgroundColor.name,
            hint: buttonBackgroundColor.hint,
            scope: buttonBackgroundColor.scope,
            restricted: buttonBackgroundColor.restricted,
            defaultColor: buttonBackgroundColor.default,
            onChange: buttonBackgroundColor.onChange,
            insertAfter: `${appName}.${backgroundColor.key}`
        })

        new window.Ardittristan.ColorSetting(appName, buttonBorderColor.key, {
            name: buttonBorderColor.name,
            hint: buttonBorderColor.hint,
            scope: buttonBorderColor.scope,
            restricted: buttonBorderColor.restricted,
            defaultColor: buttonBorderColor.default,
            onChange: buttonBorderColor.onChange,
            insertAfter: `${appName}.${buttonBackgroundColor.key}`
        })
    }

    document
        .querySelector(':root')
        .style.setProperty(
            '--tah-background',
            getSetting('background') ?? '#00000000'
        )
    document
        .querySelector(':root')
        .style.setProperty(
            '--tah-button-background',
            getSetting('buttonBackgroundColor') ?? '#00000080'
        )
    document
        .querySelector(':root')
        .style.setProperty(
            '--tah-button-outline',
            getSetting('buttonBorderColor') ?? '#000000ff'
        )
}

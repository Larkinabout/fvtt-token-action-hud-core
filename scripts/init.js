import { TokenActionHud } from './token-action-hud.js'
import { getSetting, importClass, registerHandlebars, setSetting, switchCSS } from './utilities/utils.js'

let systemManager
const appName = 'token-action-hud-core'

Hooks.on('ready', async () => {
    const systemId = game.system.id
    const systemModuleId = `token-action-hud-${systemId}`
    const coreModuleVersion = game.modules.get(appName).version
    const systemModuleConfigFile = `../../${systemModuleId}/scripts/config.js`
    const systemModuleCoreModuleVersion = await import(systemModuleConfigFile).then((module) => { return module.coreModuleVersion })

    if (coreModuleVersion !== systemModuleCoreModuleVersion) {
        ui.notifications.error(
            `The installed Token Action Hud system module requires Token Action Hud core module version ${systemModuleCoreModuleVersion}.`
        )
        return
    }

    // Import SystemManager class from the Token Action Hud system module
    const systemManagerFile = `../../../${systemModuleId}/scripts/system-manager.js`
    const SystemManager = await importClass(systemManagerFile)

    // If the Token Action Hud system module is not installed, display an error and abort
    if (!SystemManager) {
        ui.notifications.error(
            'Token Action Hud system module not found.'
        )
        return
    }

    // If the Token Action Hud system module is not enabled, display an error and abort
    const tokenActionHudSystemModuleId = `token-action-hud-${systemId}`
    if (!game.modules.get(tokenActionHudSystemModuleId)?.active) {
        ui.notifications.error(
            'Token Action Hud system module is not active.'
        )
        return
    }

    // Create new SystemManager and register core and system module settings
    systemManager = new SystemManager(appName)
    systemManager.registerSettings()

    // Set stylesheet to 'style' core module setting
    switchCSS(getSetting('style'))

    // Register Handlebar helpers
    registerHandlebars()

    // Load templates
    loadTemplates([
        'modules/token-action-hud-core/templates/category.hbs',
        'modules/token-action-hud-core/templates/subcategory.hbs',
        'modules/token-action-hud-core/templates/action.hbs',
        'modules/token-action-hud-core/templates/tagdialog.hbs'
    ])

    Hooks.callAll('tokenActionHudInitialized')
})

Hooks.on('canvasReady', async () => {
    Hooks.on('tokenActionHudInitialized', async () => {
        // If no supported color picker modules are active, for the first time only, display a notification
        if (game.user.isGM) {
            if (
                !(game.modules.get('lib-themer')?.active ?? false) &&
                !(game.modules.get('color-picker')?.active ?? false) &&
                !(game.modules.get('colorsettings')?.active ?? false)
            ) {
                const firstStartup = getSetting('startup') === false
                if (firstStartup) {
                    ui.notifications.notify(
                        "Token Action Hud: To set colors within this module's settings, install and enable one of the following 'Color Picker', 'Color Settings' or 'libThemer' modules."
                    )
                    setSetting('startup', true)
                }
            }
        }

        // If no Token Action Hud application exists, create a new TokenActionHud and initialise
        const user = game.user
        if (!game.tokenActionHud) {
            game.tokenActionHud = new TokenActionHud(systemManager)
            await game.tokenActionHud.init(user)
        }

        // Set tokens variable
        game.tokenActionHud.setTokens(canvas.tokens)

        // Registers hooks to trigger a Token Action Hud update
        Hooks.on('controlToken', (token, controlled) => {
            game.tokenActionHud.update()
        })

        Hooks.on('updateToken', (token, data, diff) => {
            // If it's an X or Y change, assume the token is just moving
            if (Object.hasOwn(diff, 'y') || Object.hasOwn(diff, 'x')) return
            if (game.tokenActionHud.isValidTokenChange(token, data)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('deleteToken', (scene, token, change, userId) => {
            if (game.tokenActionHud.isValidTokenChange(token)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('updateActor', (actor, data) => {
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor, data)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('deleteActor', (actor, data) => {
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor, data)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('deleteItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('createItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('updateItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('renderTokenActionHud', () => {
            game.tokenActionHud.applySettings()
            //game.tokenActionHud.setPosition()
        })

        Hooks.on('renderCompendium', (source, html) => {
            const metadata = source?.metadata
            if (game.tokenActionHud.isLinkedCompendium(`${metadata?.package}.${metadata?.name}`)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('deleteCompendium', (source, html) => {
            const metadata = source?.metadata
            if (game.tokenActionHud.isLinkedCompendium(`${metadata?.package}.${metadata?.name}`)) {
                game.tokenActionHud.update()
            }
        })

        Hooks.on('createCombat', (combat) => {
            game.tokenActionHud.update()
        })

        Hooks.on('deleteCombat', (combat) => {
            game.tokenActionHud.update()
        })

        Hooks.on('updateCombat', (combat) => {
            game.tokenActionHud.update()
        })

        Hooks.on('updateCombatant', (combat, combatant) => {
            game.tokenActionHud.update()
        })

        Hooks.on('forceUpdateTokenActionHud', () => {
            game.tokenActionHud.update()
        })

        Hooks.on('createActiveEffect', () => {
            game.tokenActionHud.update()
        })

        Hooks.on('deleteActiveEffect', () => {
            game.tokenActionHud.update()
        })

        game.tokenActionHud.update()
    })
})

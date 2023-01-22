import { TokenActionHud } from './token-action-hud.js'
import { getModuleVersionParts, getSetting, registerHandlebars, setSetting, switchCSS } from './utilities/utils.js'

let systemManager
const appName = 'token-action-hud-core'

Hooks.on('ready', async () => {
    const systemId = game.system.id
    const systemModuleId = `token-action-hud-${systemId}`
    const coreModuleVersion = getModuleVersionParts(game.modules.get(appName).version)
    const systemModuleCoreVersionFile = `../../${systemModuleId}/enums/core-version.js`
    const systemModuleCoreModuleVersion = await import(systemModuleCoreVersionFile).then(module => module.coreModuleVersion)

    if (coreModuleVersion.major !== systemModuleCoreModuleVersion.major || coreModuleVersion.minor !== systemModuleCoreModuleVersion.minor) {
        ui.notifications.error(
            `The installed Token Action Hud system module requires Token Action Hud core module version ${systemModuleCoreModuleVersion.full}.`
        )
        return
    }

    // Import SystemManager class from the Token Action Hud system module
    // For distribution
    const systemModulePath = `../../${systemModuleId}/scripts/${systemModuleId}.min.js`

    // For development
    // const systemModulePath = `../../${systemModuleId}/scripts/system-manager.js`

    const systemModule = await import(systemModulePath)
    const SystemManager = systemModule.SystemManager

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

        // If no Token Action Hud application exists, create a new TokenActionHud and initialise it
        const user = game.user
        if (!game.tokenActionHud) {
            game.tokenActionHud = new TokenActionHud(systemManager)
            await game.tokenActionHud.init(user)
        }

        // Set tokens variable
        game.tokenActionHud.setTokens(canvas.tokens)

        // Registers hooks to trigger a Token Action Hud update
        Hooks.on('controlToken', (token, controlled) => {
            // Exit if same actor or token
            const actorId = game.tokenActionHud.actionHandler.actorId
            if (controlled && actorId === token.document.actor.id) return
            if (!controlled && actorId === game.user.character.id) return

            async function delayUpdate (token, controlled) {
                const trigger = { trigger: { type: 'hook', name: 'controlToken', data: [token, controlled] } }
                if (!controlled) await new Promise(resolve => setTimeout(resolve, 50))
                if (controlled || (!controlled && !game.canvas.tokens.controlled.length)) game.tokenActionHud.update(trigger)
            }

            delayUpdate(token, controlled)
        })

        Hooks.on('updateToken', (token, data, diff) => {
            // If it's an X or Y change, assume the token is just moving
            if (Object.hasOwn(diff, 'y') || Object.hasOwn('diff', 'x')) return
            if (game.tokenActionHud.isValidTokenChange(token, data)) {
                const trigger = { trigger: { type: 'hook', name: 'updateToken', data: [token, data, diff] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteToken', (scene, token, change, userId) => {
            if (game.tokenActionHud.isValidTokenChange(token)) {
                const trigger = { trigger: { type: 'hook', name: 'deleteToken', data: [scene, token, change, userId] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('updateActor', (actor, data) => {
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor, data)) {
                const trigger = { trigger: { type: 'hook', name: 'updateActor', data: [actor, data] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteActor', (actor, data) => {
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor, data)) {
                const trigger = { trigger: { type: 'hook', name: 'deleteActor', data: [actor, data] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                const trigger = { trigger: { type: 'hook', name: 'deleteItem', data: [item] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('createItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                const trigger = { trigger: { type: 'hook', name: 'createItem', data: [item] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('updateItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                const trigger = { trigger: { type: 'hook', name: 'updateItem', data: [item] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('renderTokenActionHud', () => {
            game.tokenActionHud.applySettings()
        })

        Hooks.on('renderCompendium', (source, html) => {
            const metadata = source?.metadata
            if (game.tokenActionHud.isLinkedCompendium(`${metadata?.package}.${metadata?.name}`)) {
                const trigger = { trigger: { type: 'hook', name: 'renderCompendium', data: [source, html] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteCompendium', (source, html) => {
            const metadata = source?.metadata
            if (game.tokenActionHud.isLinkedCompendium(`${metadata?.package}.${metadata?.name}`)) {
                const trigger = { trigger: { type: 'hook', name: 'deleteCompendium', data: [source, html] } }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('createCombat', (combat) => {
            const trigger = { trigger: { type: 'hook', name: 'createCombat', data: [combat] } }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('deleteCombat', (combat) => {
            const trigger = { trigger: { type: 'hook', name: 'deleteCombat', data: [combat] } }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('updateCombat', (combat) => {
            const trigger = { trigger: { type: 'hook', name: 'updateCombat', data: [combat] } }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('updateCombatant', (combat, combatant) => {
            const trigger = { trigger: { type: 'hook', name: 'updateCombatant', data: [combat, combatant] } }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('forceUpdateTokenActionHud', () => {
            const trigger = { trigger: { type: 'hook', name: 'forceUpdateTokenActionHud' } }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('createActiveEffect', () => {
            const trigger = { trigger: { type: 'hook', name: 'createActiveEffect' } }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('deleteActiveEffect', () => {
            const trigger = { trigger: { type: 'hook', name: 'deleteActiveEffect' } }
            game.tokenActionHud.update(trigger)
        })

        const trigger = { trigger: { type: 'hook', name: 'canvasReady' } }
        game.tokenActionHud.update(trigger)
    })
})

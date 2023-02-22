import { MigrationManager } from './migration-manager.js'
import { TokenActionHud } from './token-action-hud.js'
import { MODULE } from './constants.js'
import { Timer, Utils } from './utilities/utils.js'

let systemManager
let isControlTokenPending = false
const controlTokenTimer = new Timer(20)

Hooks.on('tokenActionHudSystemReady', async (module) => {
    // Exit if core module version is not compatible with the system module
    const isCompatible = await Utils.checkModuleCompatibility(module.api.requiredCoreModuleVersion)
    if (!isCompatible) return

    // Create new SystemManager and register core and system module settings
    systemManager = new module.api.SystemManager(MODULE.ID)
    systemManager.registerSettings()

    // Initialise MigrationManager
    const migrationManager = new MigrationManager(module.id)
    await migrationManager.init()

    // Set stylesheet to 'style' core module setting
    Utils.switchCSS(Utils.getSetting('style'))

    // Register Handlebar helpers
    Utils.registerHandlebars()

    // Load templates
    loadTemplates([
        `modules/${MODULE.ID}/templates/category.hbs`,
        `modules/${MODULE.ID}/templates/subcategory.hbs`,
        `modules/${MODULE.ID}/templates/action.hbs`,
        `modules/${MODULE.ID}/templates/tagdialog.hbs`
    ])

    Hooks.callAll('tokenActionHudCoreReady')
})

Hooks.on('canvasReady', async () => {
    Hooks.on('tokenActionHudCoreReady', async () => {
        // If no supported color picker modules are active, for the first time only, display a notification
        if (game.user.isGM) {
            if (
                !(game.modules.get('lib-themer')?.active ?? false) &&
                !(game.modules.get('color-picker')?.active ?? false) &&
                !(game.modules.get('colorsettings')?.active ?? false)
            ) {
                const firstStartup = Utils.getSetting('startup') === false
                if (firstStartup) {
                    ui.notifications.notify(
                        "Token Action Hud: To set colors within this module's settings, install and enable one of the following 'Color Picker', 'Color Settings' or 'libThemer' modules."
                    )
                    Utils.setSetting('startup', true)
                }
            }
        }

        // If no Token Action Hud application exists, create a new TokenActionHud and initialise it
        if (!game.tokenActionHud) {
            game.tokenActionHud = new TokenActionHud(systemManager)
            await game.tokenActionHud.init()
        }

        // Set tokens variable
        game.tokenActionHud.setTokens(canvas.tokens)

        // Registers hooks to trigger a Token Action Hud update
        Hooks.on('controlToken', async (token, controlled) => {
            const trigger = { trigger: { type: 'hook', name: 'controlToken', data: [token, controlled] } }
            game.tokenActionHud.update(trigger)
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

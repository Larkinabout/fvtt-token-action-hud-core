import { ActionHandler } from './action-handlers/action-handler.js'
import { ActionListExtender } from './action-handlers/action-list-extender.js'
import { DataHandler } from './data-handler.js'
import { MigrationManager } from './migration-manager.js'
import { PreRollHandler } from './roll-handlers/pre-roll-handler.js'
import { RollHandler } from './roll-handlers/roll-handler.js'
import { SystemManager } from './system-manager.js'
import { TokenActionHud } from './token-action-hud.js'
import { MODULE } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

let systemManager
let module
let socket

Hooks.once('socketlib.ready', () => {
    socket = socketlib.registerModule(MODULE.ID)
    socket.register('createDirectories', DataHandler.createDirectories)
    socket.register('saveData', DataHandler.saveData)
    socket.register('getData', DataHandler.getData)
})

Hooks.on('ready', async () => {
    module = game.modules.get(MODULE.ID)
    module.api = {
        ActionListExtender,
        ActionHandler,
        Logger,
        PreRollHandler,
        RollHandler,
        SystemManager,
        Utils
    }

    Hooks.callAll('tokenActionHudCoreApiReady', module)
})

Hooks.on('tokenActionHudSystemReady', async (systemModule) => {
    // Exit if core module version is not compatible with the system module
    const isCompatible = await Utils.checkModuleCompatibility(systemModule.api.requiredCoreModuleVersion)
    if (!isCompatible) return

    // Create directories for json data
    await socket.executeAsGM('createDirectories')

    // Create new SystemManager and register core and system module settings
    systemManager = new systemModule.api.SystemManager(MODULE.ID)
    systemManager.registerSettings()

    // Initialise MigrationManager
    const migrationManager = new MigrationManager(systemModule.id)
    await migrationManager.init()

    // Set stylesheet to 'style' core module setting
    Utils.switchCSS(Utils.getSetting('style'))

    // Register Handlebar helpers
    Utils.registerHandlebars()

    // Load templates
    loadTemplates([
        `modules/${MODULE.ID}/templates/custom-style-form.hbs`,
        `modules/${MODULE.ID}/templates/group.hbs`,
        `modules/${MODULE.ID}/templates/list-group.hbs`,
        `modules/${MODULE.ID}/templates/tab-group.hbs`,
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
                !(game.modules.get('color-picker')?.active ?? false)
            ) {
                const firstStartup = Utils.getSetting('startup') === false
                if (firstStartup) {
                    ui.notifications.notify(
                        "Token Action Hud: To enable color pickers in this module's settings, install the 'Color Picker' module."
                    )
                    Utils.setSetting('startup', true)
                }
            }
        }

        // If no Token Action Hud application exists, create a new TokenActionHud and initialise it
        if (!game.tokenActionHud) {
            game.tokenActionHud = new TokenActionHud(module, systemManager)
            game.tokenActionHud.socket = socket
            await game.tokenActionHud.init()
        }

        // Set tokens variable
        game.tokenActionHud.setTokens(canvas.tokens)

        // Registers hooks to trigger a Token Action Hud update
        Hooks.on('controlToken', async (token, controlled) => {
            const trigger = { type: 'hook', name: 'controlToken', data: [token, controlled] }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('updateToken', (token, data, diff) => {
            // If it's an X or Y change, assume the token is just moving
            if (Object.hasOwn(data, 'y') || Object.hasOwn(data, 'x')) return
            if (game.tokenActionHud.isValidTokenChange(token, data)) {
                const trigger = { type: 'hook', name: 'updateToken', data: [token, data, diff] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteToken', (scene, token, change, userId) => {
            if (game.tokenActionHud.isValidTokenChange(token)) {
                const trigger = { type: 'hook', name: 'deleteToken', data: [scene, token, change, userId] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('updateActor', (actor, data) => {
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor, data)) {
                const trigger = { type: 'hook', name: 'updateActor', data: [actor, data] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteActor', (actor, data) => {
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor, data)) {
                const trigger = { type: 'hook', name: 'deleteActor', data: [actor, data] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                const trigger = { type: 'hook', name: 'deleteItem', data: [item] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('createItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                const trigger = { type: 'hook', name: 'createItem', data: [item] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('updateItem', (item) => {
            const actor = item.actor
            if (game.tokenActionHud.isValidActorOrItemUpdate(actor)) {
                const trigger = { type: 'hook', name: 'updateItem', data: [item] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('renderTokenActionHud', () => {
            game.tokenActionHud.postRender()
        })

        Hooks.on('renderCompendium', (source, html) => {
            const metadata = source?.metadata
            if (game.tokenActionHud.isLinkedCompendium(`${metadata?.package}.${metadata?.name}`)) {
                const trigger = { type: 'hook', name: 'renderCompendium', data: [source, html] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('deleteCompendium', (source, html) => {
            const metadata = source?.metadata
            if (game.tokenActionHud.isLinkedCompendium(`${metadata?.package}.${metadata?.name}`)) {
                const trigger = { type: 'hook', name: 'deleteCompendium', data: [source, html] }
                game.tokenActionHud.update(trigger)
            }
        })

        Hooks.on('createCombat', (combat) => {
            const trigger = { type: 'hook', name: 'createCombat', data: [combat] }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('deleteCombat', (combat) => {
            const trigger = { type: 'hook', name: 'deleteCombat', data: [combat] }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('updateCombat', (combat) => {
            const trigger = { type: 'hook', name: 'updateCombat', data: [combat] }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('updateCombatant', (combat, combatant) => {
            const trigger = { type: 'hook', name: 'updateCombatant', data: [combat, combatant] }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('forceUpdateTokenActionHud', () => {
            const trigger = { type: 'hook', name: 'forceUpdateTokenActionHud' }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('createActiveEffect', () => {
            const trigger = { type: 'hook', name: 'createActiveEffect' }
            game.tokenActionHud.update(trigger)
        })

        Hooks.on('deleteActiveEffect', () => {
            const trigger = { type: 'hook', name: 'deleteActiveEffect' }
            game.tokenActionHud.update(trigger)
        })

        const trigger = { type: 'hook', name: 'canvasReady' }
        game.tokenActionHud.update(trigger)
    })
})

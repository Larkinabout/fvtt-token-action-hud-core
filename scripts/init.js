import { ActionHandler } from './action-handlers/action-handler.js'
import { ActionListExtender } from './action-handlers/action-list-extender.js'
import { DataHandler } from './data-handler.js'
import { MigrationManager } from './migration-manager.js'
import { PreRollHandler } from './roll-handlers/pre-roll-handler.js'
import { RollHandler } from './roll-handlers/roll-handler.js'
import { SystemManager } from './system-manager.js'
import { TokenActionHud } from './token-action-hud.js'
import { MODULE, TEMPLATE } from './constants.js'
import { Logger, Timer, Utils } from './utils.js'

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
        DataHandler,
        Logger,
        PreRollHandler,
        RollHandler,
        SystemManager,
        Timer,
        Utils
    }

    Hooks.callAll('tokenActionHudCoreApiReady', module)
})

Hooks.on('tokenActionHudSystemReady', async (systemModule) => {
    // Exit if core module version is not compatible with the system module
    const isCompatible = await Utils.checkModuleCompatibility(systemModule.api.requiredCoreModuleVersion)
    if (!isCompatible) return

    if (!game.modules.get('socketlib') || !game.modules.get('socketlib')?.active) {
        Logger.error(
            'This module requires the \'socketlib\' module to be installed and enabled.',
            true
        )
        return
    }

    // Create new SystemManager and register core and system module settings
    systemManager = new systemModule.api.SystemManager(MODULE.ID)
    systemManager.registerSettings()

    // Set stylesheet to 'style' core module setting
    Utils.switchCSS(Utils.getSetting('style'))

    // Register Handlebar helpers
    Utils.registerHandlebars()

    // Load templates
    loadTemplates([
        TEMPLATE.action,
        TEMPLATE.customStyleForm,
        TEMPLATE.group,
        TEMPLATE.hud,
        TEMPLATE.listGroup,
        TEMPLATE.settings,
        TEMPLATE.tabGroup,
        TEMPLATE.tagDialogGroup,
        TEMPLATE.tagDialogHud,
        TEMPLATE.tagDialogTopLevelGroup
    ])

    Hooks.callAll('tokenActionHudCoreReady')
})

Hooks.on('tokenActionHudCoreReady', async () => {
    // If no supported color picker modules are active, for the first time only, display a notification
    if (game.user.isGM) {
        if (
            !(game.modules.get('color-picker')?.active ?? false)
        ) {
            const firstStartup = Utils.getSetting('startup') === false
            if (firstStartup) {
                Logger.info(
                    'To enable color pickers in this module\'s settings, install the \'Color Picker\' module.',
                    true
                )
                Utils.setSetting('startup', true)
            }
        }
    }

    // Create directories for json data
    const enableCustomizationSetting = Utils.getSetting('enableCustomization')
    if (enableCustomizationSetting && game.user.isGM) { await DataHandler.createDirectories() }

    // Initialise MigrationManager
    const migrationManager = new MigrationManager(socket)
    await migrationManager.init()

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

    Hooks.on('updateCombatant', (combatant, data, options, userId) => {
        if (!game.tokenActionHud.isSelectedActor(combatant.actor)) return
        const trigger = { type: 'hook', name: 'updateCombatant', data: [combat, combatant] }
        game.tokenActionHud.update(trigger)
    })

    Hooks.on('forceUpdateTokenActionHud', () => {
        const trigger = { type: 'hook', name: 'forceUpdateTokenActionHud' }
        game.tokenActionHud.update(trigger)
    })

    Hooks.on('createActiveEffect', (activeEffect, options, userId) => {
        if (!game.tokenActionHud.isSelectedActor(activeEffect.parent)) return
        const trigger = { type: 'hook', name: 'createActiveEffect' }
        game.tokenActionHud.update(trigger)
    })

    Hooks.on('deleteActiveEffect', (activeEffect, options, userId) => {
        if (!game.tokenActionHud.isSelectedActor(activeEffect.parent)) return
        const trigger = { type: 'hook', name: 'deleteActiveEffect' }
        game.tokenActionHud.update(trigger)
    })

    Hooks.on('closeSettingsConfig', () => {
        const trigger = { type: 'hook', name: 'closeSettingsConfig' }
        game.tokenActionHud.update(trigger)
    })

    const trigger = { type: 'hook', name: 'canvasReady' }
    game.tokenActionHud.update(trigger)
})

/**
  * Move the HUD below the scene context menus
  */
Hooks.on('renderSceneNavigation', (data, html) => {
    html.find('li.scene.nav-item').contextmenu((ev) => {
        sendHudToBottom()
    })
})

/**
  * Move the HUD below the hotbar context menus
  */
Hooks.on('renderHotbar', (data, html) => {
    html.find('li.macro').contextmenu((ev) => {
        sendHudToBottom()
    })
})

/**
 * Send HUD to bottom
 */
function sendHudToBottom () {
    if (!game.tokenActionHud?.element[0]) return
    game.tokenActionHud.element[0].style.zIndex = 0
}

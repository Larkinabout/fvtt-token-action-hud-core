import { ActionHandler } from './action-handlers/action-handler.js'
import { ActionHandlerExtender } from './action-handlers/action-handler-extender.js'
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
    socket.register('getFilePaths', DataHandler.getFilePaths)
    socket.register('getData', DataHandler.getData)
    socket.register('saveData', DataHandler.saveData)
    socket.register('reset', TokenActionHud.reset)
})

Hooks.on('ready', async () => {
    module = game.modules.get(MODULE.ID)
    const ActionListExtender = ActionHandlerExtender
    module.api = {
        ActionListExtender,
        ActionHandlerExtender,
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

    const socketlibModule = game.modules.get('socketlib')
    if (!socketlibModule || !socketlibModule.active) {
        Logger.error(
            'This module requires the \'socketlib\' module to be installed and enabled.',
            true
        )
        return
    }

    // Create new SystemManager and register core and system module settings
    systemManager = new systemModule.api.SystemManager(MODULE.ID)
    systemManager.registerStylesCore()
    systemManager.registerSettingsCore()
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
    if (game.user.isGM && !(game.modules.get('color-picker')?.active ?? false)) {
        const firstStartup = Utils.getSetting('startup') === false
        if (firstStartup) {
            Logger.info(
                'To enable color pickers in this module\'s settings, install the \'Color Picker\' module.',
                true
            )
            Utils.setSetting('startup', true)
        }
    }

    // Create directories for json data
    const enableCustomizationSetting = Utils.getSetting('enableCustomization')
    if (game.user.isGM && enableCustomizationSetting) {
        await DataHandler.createDirectories()
    }

    // Initialise MigrationManager
    const migrationManager = new MigrationManager(socket)
    await migrationManager.init()

    // If no Token Action Hud application exists, create a new TokenActionHud and initialise it
    if (!game.tokenActionHud) {
        game.tokenActionHud = new TokenActionHud(module, systemManager)
        game.tokenActionHud.socket = socket
        await game.tokenActionHud.init()
    }

    // Register hooks
    Hooks.on('renderTokenActionHud', () => game.tokenActionHud.postRender())
    Hooks.on('deleteActor', (actor, data) => handleHookEvent({ actor, data }, 'deleteActor'))
    Hooks.on('updateActor', (actor, data) => handleHookEvent({ actor, data }, 'updateActor'))
    Hooks.on('createActiveEffect', (activeEffect, options, userId) => handleHookEvent({ activeEffect, options, userId }, 'createActiveEffect'))
    Hooks.on('deleteActiveEffect', (activeEffect, options, userId) => handleHookEvent({ activeEffect, options, userId }, 'deleteActiveEffect'))
    Hooks.on('createCombat', (combat) => handleHookEvent({ combat }, 'createCombat'))
    Hooks.on('deleteCombat', (combat) => handleHookEvent({ combat }, 'deleteCombat'))
    Hooks.on('updateCombat', (combat) => handleHookEvent({ combat }, 'updateCombat'))
    Hooks.on('updateCombatant', (combatant, data, options, userId) => handleHookEvent({ combatant, data, options, userId }, 'updateCombatant'))
    Hooks.on('deleteCompendium', (source, html) => handleHookEvent({ source, html }, 'deleteCompendium'))
    Hooks.on('renderCompendium', (source, html) => handleHookEvent({ source, html }, 'renderCompendium'))
    Hooks.on('updateCompendium', (source, html) => handleHookEvent({ source, html }, 'updateCompendium'))
    Hooks.on('createItem', (item) => handleHookEvent({ item }, 'createItem'))
    Hooks.on('deleteItem', (item) => handleHookEvent({ item }, 'deleteItem'))
    Hooks.on('updateItem', (item) => handleHookEvent({ item }, 'updateItem'))
    Hooks.on('deleteMacro', () => handleHookEvent({}, 'deleteMacro'))
    Hooks.on('updateMacro', () => handleHookEvent({}, 'updateMacro'))
    Hooks.on('controlToken', (token, controlled) => handleHookEvent({ token, controlled }, 'controlToken'))
    Hooks.on('deleteToken', (scene, token, change, userId) => handleHookEvent({ scene, token, change, userId }, 'deleteToken'))
    Hooks.on('updateToken', (token, data, diff) => handleHookEvent({ token, data, diff }, 'updateToken'))
    Hooks.on('closeSettingsConfig', () => handleHookEvent({}, 'closeSettingsConfig'))
    Hooks.on('forceUpdateTokenActionHud', () => handleHookEvent({}, 'forceUpdateTokenActionHud'))

    function handleHookEvent (hookData, hookName) {
        const trigger = { type: 'hook', name: hookName, data: hookData }
        switch (hookName) {
        case 'deleteActor':
        case 'updateActor':
            if (!game.tokenActionHud.isValidActorOrItemUpdate(hookData.actor, hookData.data)) return
            break
        case 'createActiveEffect':
        case 'deleteActiveEffect':
            if (!game.tokenActionHud.isSelectedActor(hookData.activeEffect.parent)) return
            break
        case 'updateCombatant':
            if (!game.tokenActionHud.isSelectedActor(hookData.combatant.actor)) return
            break
        case 'deleteCompendium':
        case 'updateCompendium':
            if (!game.tokenActionHud.actionHandler.compendiumActionHandler.isLinkedCompendium(hookData.source?.metadata?.id)) return
            game.tokenActionHud.actionHandler.compendiumActionHandler.compendiumActions = new Map()
            break
        case 'createItem':
        case 'deleteItem':
        case 'updateItem':
            if (!game.tokenActionHud.isValidActorOrItemUpdate(hookData.item?.actor)) return
            break
        case 'deleteMacro':
        case 'updateMacro':
            game.tokenActionHud.actionHandler.macroActionHandler.macroActions = null
            break
        case 'updateToken':
            // If it's an X or Y change, assume the token is just moving
            if (Object.hasOwn(hookData.data, 'y') || Object.hasOwn(hookData.data, 'x' || Object.hasOwn(hookData.data, 'rotation'))) return
            // If it's a flag change
            if (Object.hasOwn(hookData.data, 'flags') && Object.keys(hookData.data).length <= 2) return
            if (!game.tokenActionHud.isValidTokenChange(hookData.token, hookData.data)) return
            break
        }
        game.tokenActionHud.update(trigger)
    }

    const trigger = { type: 'hook', name: 'canvasReady' }
    game.tokenActionHud.update(trigger)
})

/**
  * Move the HUD below the scene context menus
  */
Hooks.on('renderSceneNavigation', (data, html) => {
    html.find('li.scene.nav-item').contextmenu((ev) => sendHudToBottom())
})

/**
  * Move the HUD below the hotbar context menus
  */
Hooks.on('renderHotbar', (data, html) => {
    html.find('li.macro').contextmenu((ev) => sendHudToBottom())
})

/**
 * Send HUD to bottom
 */
function sendHudToBottom () {
    if (!game.tokenActionHud?.element[0]) return
    game.tokenActionHud.element[0].style.zIndex = 0
}

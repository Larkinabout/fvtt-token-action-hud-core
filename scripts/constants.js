/**
 * Module-based constants
 */
export const MODULE = {
    ID: 'token-action-hud-core',
    NAME: 'Token Action HUD'
}

/**
 * Delimiter character
 */
export const DELIMITER = '|'

/**
 * Action type
 */
export const ACTION_TYPE = {
    compendiumEntry: 'tokenActionHud.compendiumEntry',
    compendiumMacro: 'tokenActionHud.compendiumMacro',
    compendiumPlaylist: 'tokenActionHud.compendiumPlaylist',
    macro: 'tokenActionHud.macro'
}

/**
 * Compendium action types
 */
export const COMPENDIUM_ACTION_TYPES = ['compendiumEntry', 'compendiumMacro', 'compendiumPlaylist', 'macro']

/**
 * Compendium pack types
 */
export const COMPENDIUM_PACK_TYPES = ['JournalEntry', 'Macro', 'RollTable']

/**
 * Group types
 */
export const GROUP_TYPE = {
    COMPENDIUM: 'compendium',
    CUSTOM: 'custom',
    SYSTEM: 'system',
    SYSTEM_DERIVED: 'system-derived'
}

export const ITEM_MACRO_ICON = {
    ICON: 'fas fa-sd-card',
    TOOLTIP: 'Item Macro'
}

export const STYLE_CLASS = {
    compact: {
        class: 'tah-style-foundry-vtt',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    dorakoUI: { class: 'tah-style-dorako-ui' },
    foundryVTT: {
        class: 'tah-style-foundry-vtt',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    highContrast: {
        class: 'tah-style-high-contrast',
        primaryColor: '#ffff00',
        secondaryColor: '#ffff00',
        tertiaryColor: '#0C7BDC'
    },
    pathfinder: { class: 'tah-style-pathfinder' }
}

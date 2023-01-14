const namespace = 'token-action-hud-core'

/**
 * Console logger
 */
export class Logger {
    static info (...args) {
        console.log('Token Action HUD Info |', ...args)
    }

    static error (...args) {
        console.error('Token Action HUD Error |', ...args)
    }

    static debug (...args) {
        const isDebug = (game.tokenActionHud) ? game.tokenActionHud.isDebug : getSetting('debug')
        if (isDebug) { console.log('Token Action HUD Debug |', ...args) }
    }
}

/**
 * Whether tbe user is allowed to use the HUD
 * @param {number} userRole The user's role
 * @returns {boolean}
 */
export function checkAllow (userRole) {
    const allowShow = getSetting('allow')
    if (userRole >= allowShow) return true
    return false
}

/**
 * Get setting value
 * @param {string} key The key
 * @param {string=null} defaultValue The default value
 * @returns The setting value
 */
export function getSetting (key, defaultValue = null) {
    let value = defaultValue ?? null
    try {
        value = game.settings.get(namespace, key)
    } catch {
        Logger.debug(`Setting '${key}' not found`)
    }
    return value
}

/**
 * Set setting value
 * @param {string} key The key
 * @param {string} value The value
 */
export async function setSetting (key, value) {
    if (game.settings.settings.get(`${namespace}.${key}`)) {
        value = await game.settings.set(namespace, key, value)
        Logger.debug(`Setting '${key}' set to '${value}'`)
    } else {
        Logger.debug(`Setting '${key}' not found`)
    }
}

/**
 * Enable stylesheet based on setting and disable all other stylesheets
 * @param {string} settingValue 'style' module setting value
 */
export function switchCSS (settingValue) {
    const styles = [
        { setting: 'compact', file: 'tah-compact' },
        { setting: 'foundryVTT', file: 'tah-foundry-vtt' },
        { setting: 'dorakoUI', file: 'tah-dorako' }
    ]

    for (const style of styles) {
        const href = ['modules/token-action-hud-core/', `styles/${style.file}`]
        if (style.setting === settingValue) {
            Object.values(document.styleSheets).find(
                (ss) => ss.href?.includes(href[0]) && ss.href?.includes(href[1])
            ).disabled = false
        } else {
            Object.values(document.styleSheets).find(
                (ss) => ss.href?.includes(href[0]) && ss.href?.includes(href[1])
            ).disabled = true
        }
    }
}

/**
 * Register Handlebar helpers
 */
export function registerHandlebars () {
    // Capitalise first character
    Handlebars.registerHelper('cap', function (string) {
        if (!string || string.length < 1) return ''
        return string[0].toUpperCase() + string.slice(1)
    })

    const reduceOp = function (args, reducer) {
        args = Array.from(args)
        args.pop() // => options
        const first = args.shift()
        return args.reduce(reducer, first)
    }

    // Support operators
    Handlebars.registerHelper({
        eq: function () { return reduceOp(arguments, (a, b) => a === b) },
        ne: function () { return reduceOp(arguments, (a, b) => a !== b) },
        lt: function () { return reduceOp(arguments, (a, b) => a < b) },
        gt: function () { return reduceOp(arguments, (a, b) => a > b) },
        lte: function () { return reduceOp(arguments, (a, b) => a <= b) },
        gte: function () { return reduceOp(arguments, (a, b) => a >= b) },
        and: function () { return reduceOp(arguments, (a, b) => a && b) },
        or: function () { return reduceOp(arguments, (a, b) => a || b) }
    })

    // Add asterisk to toggleable actions
    Handlebars.registerHelper('activeText', function (block) {
        if (getSetting('activeCssAsText')) {
            return block.fn(this)
        }
        return block.inverse(this)
    })
}

/**
 * Loop nested subcategories and return flattened
 * @param {object} subcategories
 * @param {object} searchCriteria
 * @returns {object}
 */
export function getSubcategories (subcategories, searchCriteria = {}) {
    if (!subcategories) return
    const subcategoryId = searchCriteria?.id
    const subcategoryType = searchCriteria?.type
    subcategories = (Array.isArray(subcategories)) ? subcategories : Object.values(subcategories)
    let foundSubcategories = []
    for (const subcategory of subcategories) {
        if ((!subcategoryId || subcategory.id === subcategoryId) && (!subcategoryType || subcategory.type === subcategoryType)) foundSubcategories.push(subcategory)
        if (subcategory.subcategories.length > 0) {
            const subcategories = getSubcategories(subcategory.subcategories, searchCriteria)
            if (subcategories) foundSubcategories = foundSubcategories.concat(subcategories.filter(subcategory => subcategory !== undefined))
        }
    }
    return (foundSubcategories.length) ? foundSubcategories : null
}

/**
 * Loop nested subcategories, find subcategories matching nestId, and return flattened
 * @param {object} subcategories
 * @param {string} searchCriteria
 * @returns {object}
 */
export async function getSubcategoryByNestId (subcategories, searchCriteria = {}) {
    const nestId = (typeof searchCriteria === 'string' ? searchCriteria : searchCriteria?.nestId)
    const subcategoryType = searchCriteria?.type ?? 'system'
    if (!nestId) return

    const parts = nestId.split('_')
    return await findSubcategory(subcategories, parts)

    async function findSubcategory (subcategories, parts) {
        subcategories = (Array.isArray(subcategories)) ? subcategories : Object.values(subcategories)
        for (const subcategory of subcategories) {
            if (subcategory.id === parts[0]) {
                if (parts.length === 1) {
                    if (!subcategory.type || subcategory.type === subcategoryType) return subcategory
                    return
                }
                if (subcategory.subcategories.length === 0) return
                parts.shift()
                const foundSubcategory = await findSubcategory(subcategory.subcategories, parts)
                if (foundSubcategory) return foundSubcategory
            }
        }
    }
}

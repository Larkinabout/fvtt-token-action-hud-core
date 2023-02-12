import { MODULE } from '../constants.js'

/**
 * Console logger
 */
export class Logger {
    static info (message, notify = false) {
        if (notify) ui.notifications.info(`Token Action HUD | ${message}`)
        else console.log(`Token Action HUD Info | ${message}`)
    }

    static error (message, notify = false) {
        if (notify) ui.notifications.error(`Token Action HUD | ${message}`)
        else console.error(`Token Action HUD Error | ${message}`)
    }

    static debug (message, data) {
        const isDebug = (game.tokenActionHud) ? game.tokenActionHud.isDebug : Utils.getSetting('debug')
        if (isDebug) {
            if (!data) {
                console.log(`Token Action HUD Debug | ${message}`)
                return
            }
            const dataClone = Utils.deepClone(data)
            console.log(`Token Action HUD Debug | ${message}`, dataClone)
        }
    }
}

/**
 * Timer for setting and aborting timeouts
 */
export class Timer {
    contructor (milliseconds) {
        this.milliseconds = milliseconds
        this.timer = null
    }

    async start () {
        if (this.timer) this.abort()
        return new Promise(resolve => {
            this.timer = setTimeout(resolve, this.milliseconds)
        })
    }

    async abort () {
        clearTimeout(this.timer)
        this.timer = null
    }
}

export class Utils {
    /**
    * Whether the user is allowed to use the HUD
    * @param {number} userRole The user's role
    * @returns {boolean}
    */
    static checkAllow (userRole) {
        const allowShow = this.getSetting('allow')
        if (userRole >= allowShow) return true
        return false
    }

    /**
     * Foundry VTT's deepClone function wrapped here to avoid code error highlighting due to missing definition.
     * @param {*} original
     * @param {*} options
     */
    static deepClone (original, options) {
        // eslint-disable-next-line no-undef
        return deepClone(original, options)
    }

    /**
     * Get actor from the token or actor object
     * @param {string} actorId The actor id
     * @param {string} tokenId The token id
     * @returns {object}       The actor
     */
    static getActor (actorId, tokenId) {
        let token = null
        if (tokenId) token = canvas.tokens.placeables.find((token) => token.id === tokenId)
        if (token) return token.actor
        return game.actors.get(actorId)
    }

    /**
     * Get image from entity
     * @param {object} entity       The entity, e.g., actor, item
     * @param {array} defaultImages Any default images to exclude
     * @returns {string}            The image URL
     */
    static getImage (entity, defaultImages = []) {
        defaultImages.push('icons/svg/mystery-man.svg')
        let result = ''
        if (game.tokenActionHud.isDisplayIcons) result = (typeof entity === 'string') ? entity : entity?.img ?? entity?.icon ?? ''
        return !defaultImages.includes(result) ? result : ''
    }

    /**
     * Get item from the actor object
     * @param {object} actor  The actor
     * @param {string} itemId The item id
     * @returns {object}      The item
     */
    static getItem (actor, itemId) {
        return actor.items.get(itemId)
    }

    /**
     * Get token
     * @param {string} tokenId The token id
     * @returns {object}       The token
     */
    static getToken (tokenId) {
        return canvas.tokens.placeables.find((token) => token.id === tokenId)
    }

    /**
     * Get controlled tokens
     * @returns {array} The controlled tokens
     */
    static getControlledTokens () {
        return game.canvas.tokens.controlled
    }

    /**
     * Get first controlled tokens
     * @returns {object} The first controlled token
     */
    static getFirstControlledToken () {
        return game.canvas.tokens.controlled[0]
    }

    /**
     * Get setting value
     * @param {string} key               The setting key
     * @param {string=null} defaultValue The setting default value
     * @returns {*}                      The setting value
     */
    static getSetting (key, defaultValue = null) {
        let value = defaultValue ?? null
        try {
            value = game.settings.get(MODULE.ID, key)
        } catch {
            Logger.debug(`Setting '${key}' not found`)
        }
        return value
    }

    /**
     * Set setting value
     * @param {string} key   The setting key
     * @param {string} value The setting value
     */
    static async setSetting (key, value) {
        if (game.settings.settings.get(`${MODULE.ID}.${key}`)) {
            await game.settings.set(MODULE.ID, key, value)
            Logger.debug(`Setting '${key}' set to '${value}'`)
        } else {
            Logger.debug(`Setting '${key}' not found`)
        }
    }

    /**
     * Get module user flag
     * @param {string} key The flag key
     * @returns {*}        The flag value
     */
    static getUserFlag (key) {
        return game.user.getFlag(MODULE.ID, key)
    }

    /**
     * Set module user flag
     * @param {string} key The flag key
     * @param {*} value    The flag value
     */
    static async setUserFlag (key, value) {
        await game.user.setFlag(MODULE.ID, key, value)
    }

    /**
     * Unset module user flag
     * @param {string} key The flag key
     */
    static async unsetUserFlag (key) {
        await game.user.unsetFlag(MODULE.ID, key)
    }

    /**
     * Language translation
     * @param {string} toTranslate The value to translate
     * @returns {string}           The translated value
     */
    static i18n (toTranslate) {
        return game.i18n.localize(toTranslate)
    }

    /**
     * Whether the given module is active
     * @param {string} moduleId The module id
     * @returns {boolean}
     */
    static isModuleActive (moduleId) {
        const module = game.modules.get(moduleId)
        return module && module.active
    }

    /**
     * Get the given module's title
     * @param {string} moduleId The module id
     * @returns {string}        The module title
     */
    static getModuleTitle (moduleId) {
        return game.modules.get(moduleId)?.title ?? ''
    }

    /**
     * Get the median
     * @param {array} numbers The array of numbers
     * @returns {number}      The median
     */
    static median (numbers) {
        const mid = Math.floor(numbers.length / 2)
        const nums = [...numbers].sort((a, b) => a - b)
        return numbers.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
    }

    /**
     * Enable stylesheet based on setting and disable all other stylesheets
     * @param {string} settingValue The 'style' setting value
     */
    static switchCSS (settingValue) {
        const styles = [
            { setting: 'compact', file: 'tah-compact' },
            { setting: 'foundryVTT', file: 'tah-foundry-vtt' },
            { setting: 'dorakoUI', file: 'tah-dorako' },
            { setting: 'pathfinder', file: 'tah-pathfinder' }
        ]

        for (const style of styles) {
            const href = [`modules/${MODULE.ID}/`, `styles/${style.file}`]
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
    static registerHandlebars () {
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
            or: function () { return reduceOp(arguments, (a, b) => a || b) },
            tf: function () { return reduceOp(arguments, (a) => a) }
        })

        // Add asterisk to toggleable actions
        Handlebars.registerHelper('activeText', function (block) {
            if (Utils.getSetting('activeCssAsText')) {
                return block.fn(this)
            }
            return block.inverse(this)
        })
    }

    /**
     * Get the major, minor and patch parts of the module version
     * @param {*} moduleVersion The module version
     * @returns {object}        The module version parts
     */
    static getModuleVersionParts (moduleVersion) {
        if (!moduleVersion) {
            Logger.debug('Module version not retrieved', { trigger: 'getModuleVersionParts' })
            return
        }
        const moduleVersionParts = moduleVersion.split('.')
        return {
            major: moduleVersionParts[0],
            minor: moduleVersionParts[1],
            patch: moduleVersionParts[2]
        }
    }

    /**
     * Whether the system module is compatible with the core module version
     * @param {object} systemModuleCoreModuleVersion The system module's required core module version
     * @returns {boolean}
     */
    static async checkModuleCompatibility (requiredCoreModuleVersion) {
        // Get core module version in parts
        const requiredCoreModuleVersionParts = this.getModuleVersionParts(requiredCoreModuleVersion)
        const coreModuleVersionParts = this.getModuleVersionParts(game.modules.get(MODULE.ID).version)

        if (coreModuleVersionParts.major !== requiredCoreModuleVersionParts.major ||
            coreModuleVersionParts.minor !== requiredCoreModuleVersionParts.minor ||
            (requiredCoreModuleVersionParts.patch && coreModuleVersionParts.patch !== requiredCoreModuleVersionParts.patch)
        ) {
            ui.notifications.error(
                `The installed Token Action Hud system module requires Token Action Hud core module version ${requiredCoreModuleVersion}. Install the required version to continue using Token Action HUD.`
            )
            return false
        }
        return true
    }

    /**
     * Loop nested subcategories and return flattened
     * @param {object} subcategories  The subcategories
     * @param {object} searchCriteria The search criteria
     * @returns {object}
     */
    static getSubcategories (subcategories, searchCriteria = {}) {
        if (!subcategories) return
        const subcategoryId = searchCriteria?.id
        const subcategoryType = searchCriteria?.type
        subcategories = (Array.isArray(subcategories)) ? subcategories : Object.values(subcategories)
        let foundSubcategories = []
        for (const subcategory of subcategories) {
            if ((!subcategoryId || subcategory.id === subcategoryId) && (!subcategoryType || subcategory.type === subcategoryType)) foundSubcategories.push(subcategory)
            if (subcategory.subcategories.length > 0) {
                const subcategories = this.getSubcategories(subcategory.subcategories, searchCriteria)
                if (subcategories) foundSubcategories = foundSubcategories.concat(subcategories.filter(subcategory => subcategory !== undefined))
            }
        }
        return (foundSubcategories.length > 0) ? foundSubcategories : null
    }

    /**
     * Loop nested subcategories, find subcategories matching nestId, and return flattened
     * @param {object} subcategories
     * @param {string} searchCriteria
     * @returns {object}
     */
    static async getSubcategoryByNestId (subcategories, searchCriteria = {}) {
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
}

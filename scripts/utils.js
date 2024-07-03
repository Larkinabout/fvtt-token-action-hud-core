import { CSS_STYLE, CUSTOM_STYLE, MODULE } from './constants.js'

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
        const isDebug = (game.tokenActionHud) ? game.tokenActionHud.debugSetting : Utils.getSetting('debug')
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
    constructor (milliseconds) {
        this.milliseconds = milliseconds
        this.timer = null
    }

    async start () {
        if (this.timer) this.abort()
        return new Promise(resolve => {
            this.timer = setTimeout(() => { resolve() }, this.milliseconds ?? 100)
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
    * @public
    * @param {number} userRole The user's role
    * @returns {boolean}
    */
    static checkAllow (userRole, allowSetting) {
        if (userRole >= allowSetting) return true
        return false
    }

    /**
     * Foundry VTT's deepClone function wrapped here to avoid code error highlighting due to missing definition.
     * @public
     * @param {*} original
     * @param {*} options
     */
    static deepClone (original, options) {
        // eslint-disable-next-line no-undef
        return foundry.utils.deepClone(original, options)
    }

    /**
     * Get actor from the token or actor object
     * @public
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
     * Get status effect from actor based on the status id
     * @param {object} actor    The actor
     * @param {string} statusId The status id
     * @returns {object}        The status effect
     */
    static getStatusEffect (actor, statusId) {
        if (foundry.utils.isNewerVersion(game.version, '10')) {
            return actor.effects.find((effect) => effect.statuses.every((status) => status === statusId))
        } else {
            // V10
            return actor.effects.find((effect) => effect.flags?.core?.statusId === statusId)
        }
    }

    /**
     * Get image from entity
     * @public
     * @param {object} entity       The entity, e.g., actor, item
     * @param {array} defaultImages Any default images to exclude
     * @returns {string}            The image URL
     */
    static getImage (entity, defaultImages = []) {
        defaultImages.push('icons/svg/mystery-man.svg')
        let result = ''
        if (game.tokenActionHud.displayIconsSetting) result = (typeof entity === 'string') ? entity : entity?.img ?? entity?.icon ?? ''
        return !defaultImages.includes(result) ? result : ''
    }

    /**
     * Get item from the actor object
     * @public
     * @param {object} actor  The actor
     * @param {string} itemId The item id
     * @returns {object}      The item
     */
    static getItem (actor, itemId) {
        return actor.items.get(itemId)
    }

    /**
     * Get token
     * @public
     * @param {string} tokenId The token id
     * @returns {object}       The token
     */
    static getToken (tokenId) {
        return canvas.tokens.placeables.find((token) => token.id === tokenId)
    }

    /**
     * Get controlled tokens
     * @public
     * @returns {array} The controlled tokens
     */
    static getControlledTokens () {
        return game.canvas.tokens?.controlled ?? []
    }

    /**
     * Get first controlled tokens
     * @public
     * @returns {object} The first controlled token
     */
    static getFirstControlledToken () {
        const controlledToken = game.canvas.tokens.controlled[0]
        if (controlledToken) {
            return controlledToken
        }
        const character = game.user?.character
        if (character) {
            return canvas.tokens.placeables.find(token => token.actor?.id === character.id)
        }
    }

    /**
     * Get setting value
     * @public
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
     * @public
     * @param {string} key   The setting key
     * @param {string} value The setting value
     */
    static async setSetting (key, value) {
        if (game.settings.settings.get(`${MODULE.ID}.${key}`)) {
            await game.settings.set(MODULE.ID, key, value)
            Logger.debug(`Setting '${key}' set to '${value}'`)
        } else {
            if (key !== 'debug') {
                Logger.debug(`Setting '${key}' not found`)
            }
        }
    }

    /**
     * Get module actor flag
     * @public
     * @param {string} key The flag key
     * @returns {*}        The flag value
     */
    static getActorFlag (key) {
        return game.tokenActionHud.actor.getFlag(MODULE.ID, key)
    }

    /**
     * Set module actor flag
     * @public
     * @param {string} key The flag key
     * @param {*} value    The flag value
     */
    static async setActorFlag (key, value) {
        await game.tokenActionHud.actor.setFlag(MODULE.ID, key, value)
    }

    /**
     * Unset module actor flag
     * @public
     * @param {string} key The flag key
     */
    static async unsetActorFlag (key) {
        await game.tokenActionHud.actor.unsetFlag(MODULE.ID, key)
    }

    /**
     * Get module user flag
     * @public
     * @param {string} key The flag key
     * @returns {*}        The flag value
     */
    static getUserFlag (key) {
        return game.user.getFlag(MODULE.ID, key)
    }

    /**
     * Set module user flag
     * @public
     * @param {string} key The flag key
     * @param {*} value    The flag value
     */
    static async setUserFlag (key, value) {
        await game.user.setFlag(MODULE.ID, key, value)
    }

    /**
     * Unset module user flag
     * @public
     * @param {string} key The flag key
     */
    static async unsetUserFlag (key) {
        await game.user.unsetFlag(MODULE.ID, key)
    }

    /**
     * Language translation
     * @public
     * @param {string} toTranslate The value to translate
     * @returns {string}           The translated value
     */
    static i18n (toTranslate) {
        return game.i18n.localize(toTranslate)
    }

    /**
     * Whether a GM is active
     * @public
     * @returns {boolean} Whether a GM is active
     */
    static isGmActive () {
        return game.users.some(user => user.isGM && user.active)
    }

    /**
     * Whether the given module is active
     * @public
     * @param {string} moduleId The module id
     * @returns {boolean}       Whether the given module is active
     */
    static isModuleActive (moduleId) {
        const module = game.modules.get(moduleId)
        return module && module.active
    }

    /**
     * Get the given module's title
     * @public
     * @param {string} moduleId The module id
     * @returns {string}        The module title
     */
    static getModuleTitle (moduleId) {
        return game.modules.get(moduleId)?.title ?? ''
    }

    /**
     * Get the given module's version
     * @public
     * @param {string} moduleId The module id
     * @returns {string}        The module version
     */
    static getModuleVersion (moduleId) {
        return game.modules.get(moduleId)?.version ?? ''
    }

    /**
     * Humanize keybinding
     * @param {object} key The keybinding key
     * @returns {string}   The humanized keybinding
     */
    static humanizeBinding (key) {
        const binding = game.keybindings.get(MODULE.ID, key)
        if (!binding) return ''
        const stringParts = binding[0].modifiers.reduce((parts, part) => {
            if (KeyboardManager.MODIFIER_CODES[part]?.includes(binding[0].key)) return parts
            parts.unshift(KeyboardManager.getKeycodeDisplayString(part))
            return parts
        }, [KeyboardManager.getKeycodeDisplayString(binding[0].key)])
        return stringParts.join(' + ')
    }

    /**
     * Get the median
     * @public
     * @param {array} numbers The array of numbers
     * @returns {number}      The median
     */
    static median (numbers) {
        const mid = Math.floor(numbers.length / 2)
        const nums = [...numbers].sort((a, b) => a - b)
        return numbers.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
    }

    /**
     * Get upper quartile average
     * @param {array} numbers The numbers
     * @returns {number}      The upper quartile average
     */
    static getUpperQuartileAverage (numbers) {
        const sortedNumbers = numbers.slice().sort((a, b) => a - b)
        const length = sortedNumbers.length
        const startIndex = Math.ceil(length * 0.75)
        const endIndex = length - 1

        let sum = 0
        let count = 0

        for (let i = startIndex; i <= endIndex; i++) {
            sum += sortedNumbers[i]
            count++
        }

        const upperQuartileAverage = sum / count

        return upperQuartileAverage
    }

    /**
     * Get modifier
     * @param {number} value The value
     * @returns {string}     The modifier
     */
    static getModifier (value) {
        if (!value && value !== 0) return ''
        const sign = (value >= 0) ? '+' : ''
        return `${sign}${value}`
    }

    /**
     * Sort items
     * @public
     * @param {object} items The items
     * @returns {object}     The sorted items
     */
    static sortItems (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].sort.localeCompare(b[1].sort)))
    }

    /**
     * Sort items by name
     * @public
     * @param {object} items The items
     * @returns {object}     The sorted items
     */
    static sortItemsByName (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))
    }

    /**
     * Enable stylesheet based on setting and disable all other stylesheets
     * @public
     * @param {string} style The 'style' setting value
     */
    static switchCSS (style) {
        for (const [key, value] of Object.entries(CSS_STYLE)) {
            const href = [`modules/${value.moduleId}/`, `${value.file}`]
            if (key === style) {
                Object.values(document.styleSheets).find(
                    (ss) => ss.href?.includes(href[0]) && ss.href?.includes(href[1])
                ).disabled = false
            } else {
                Object.values(document.styleSheets).find(
                    (ss) => ss.href?.includes(href[0]) && ss.href?.includes(href[1])
                ).disabled = true
            }
        }

        if (style === 'custom') {
            for (const [key, value] of Object.entries(CUSTOM_STYLE)) {
                const setting = Utils.getSetting(key)
                if (setting) {
                    document.querySelector(':root').style.setProperty(value.cssProperty, setting)
                }
            }
        }

        const tahElement = document.querySelector('#token-action-hud')
        if (tahElement) {
            tahElement.classList.remove(...tahElement.classList)
            tahElement.classList.add(CSS_STYLE[style].class)
        }
    }

    /**
     * Register Handlebar helpers
     * @public
     */
    static registerHandlebars () {
        // Capitalise first character
        Handlebars.registerHelper('tokenActionHudCoreCap', function (string) {
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
            tokenActionHudCoreTrue: function () { return reduceOp(arguments, (a) => a) }
        })

        // Add asterisk to toggleable actions
        Handlebars.registerHelper('tokenActionHudCoreActiveText', function (block) {
            if (game.tokenActionHud.activeCssAsTextSetting) {
                return block.fn(this)
            }
            return block.inverse(this)
        })
    }

    /**
     * Get the major, minor and patch parts of the module version
     * @public
     * @param {string} moduleVersion The module version
     * @returns {object}             The module version parts
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
     * @public
     * @param {object} systemModuleCoreModuleVersion The system module's required core module version
     * @returns {boolean}
     */
    static checkModuleCompatibility (requiredCoreModuleVersion) {
        // Get core module version in parts
        const requiredCoreModuleVersionParts = this.getModuleVersionParts(requiredCoreModuleVersion)
        const coreModuleVersionParts = this.getModuleVersionParts(game.modules.get(MODULE.ID).version)

        if (coreModuleVersionParts.major !== requiredCoreModuleVersionParts.major ||
            coreModuleVersionParts.minor !== requiredCoreModuleVersionParts.minor ||
            (requiredCoreModuleVersionParts.patch && coreModuleVersionParts.patch !== requiredCoreModuleVersionParts.patch)
        ) {
            ui.notifications.error(
                `The installed Token Action HUD system module requires Token Action HUD Core module version ${requiredCoreModuleVersion}. Install the required version to continue using Token Action HUD.`
            )
            return false
        }
        return true
    }

    /**
     * Get subcategories by criteria
     * @public
     * @param {object} subcategories  The subcategories
     * @param {object} data           The search data
     * @returns {object}
     */
    static getSubcategories (subcategories, data = {}) {
        let order = 0
        if (!subcategories) return
        const subcategoryId = data?.id
        const subcategoryType = data?.type
        subcategories = (Array.isArray(subcategories)) ? subcategories : Object.values(subcategories)
        const foundSubcategories = {}
        for (const subcategory of subcategories) {
            if ((!subcategoryId || subcategory.id === subcategoryId) && (!subcategoryType || subcategory.type === subcategoryType)) {
                order++
                const level = subcategory.nestId.split('_').length
                foundSubcategories[subcategory.nestId] = { ...subcategory, order, level }
            }
            if (subcategory.subcategories?.length > 0) {
                const subcategories = this.getSubcategories(subcategory.subcategories, data)
                if (subcategories) Object.assign(foundSubcategories, subcategories)
            }
        }
        return (Object.keys(foundSubcategories).length > 0) ? foundSubcategories : null
    }

    /**
     * Get nested groups by criteria
     * @public
     * @param {object} groups  The groups
     * @param {object} data    The search data
     * @returns {object}
     */
    static getNestedGroups (groups, data = {}) {
        let order = 0
        if (!groups) return
        const groupId = data?.id
        const groupType = data?.type
        groups = (Array.isArray(groups)) ? groups : Object.values(groups)
        const foundGroups = {}
        for (const group of groups) {
            if ((!groupId || group.id === groupId) && (!groupType || group.type === groupType)) {
                order++
                const level = group.nestId.split('_').length
                foundGroups[group.nestId] = { ...group, order, level }
            }
            if (group.groups?.length > 0) {
                const groups = this.getNestedGroups(group.groups, data)
                if (groups) Object.assign(foundGroups, groups)
            }
        }
        return (Object.keys(foundGroups).length > 0) ? foundGroups : null
    }

    /**
     * Get group by nest id
     * @public
     * @param {object} groups The groups
     * @param {string} data   The search data
     * @returns {object}
     */
    static async getGroupByNestId (groups, data = {}) {
        const nestId = (typeof data === 'string' ? data : data?.nestId)
        const groupType = data?.type
        if (!nestId) return

        const parts = nestId.split('_')
        return await findGroup(groups, parts)

        async function findGroup (groups, parts) {
            groups = (Array.isArray(groups)) ? groups : Object.values(groups)
            for (const group of groups) {
                if (group.id === parts[0]) {
                    if (parts.length === 1) {
                        if (!group.type || !groupType || group.type === groupType) return group
                        return
                    }
                    parts.shift()
                    for (const groupStyle of Object.values(group.groups)) {
                        if (groupStyle.length === 0) continue
                        const foundGroup = await findGroup(groupStyle, parts)
                        if (foundGroup) return foundGroup
                    }
                }
            }
        }
    }

    /**
     * Delete group by nest id
     * @public
     * @param {object} groups The groups
     * @param {string} data   The search data
     */
    static async deleteGroupByNestId (groups, data = {}) {
        const nestId = (typeof data === 'string' ? data : data?.nestId)
        if (!nestId) return

        const parts = nestId.split('_')
        return await findGroup(groups, parts)

        async function findGroup (groups, parts) {
            groups = (Array.isArray(groups)) ? groups : Object.values(groups)
            for (const [index, group] of groups.entries()) {
                if (group.id === parts[0]) {
                    if (parts.length === 1) {
                        groups.splice(index, 1)
                        return
                    }
                    if (group.groups.length === 0) return
                    parts.shift()
                    const foundGroup = await findGroup(group.groups, parts)
                    if (foundGroup) return
                }
            }
        }
    }

    /**
     * Delete groups by id
     * @public
     * @param {object} groups The groups
     * @param {string} data   The search data
     */
    static async deleteGroupsById (groups, data = {}) {
        const id = (typeof data === 'string' ? data : data?.id)
        if (!id) return

        for (let i = groups.length - 1; i >= 0; i--) {
            if (groups[i].id === id) {
                groups.splice(i, 1)
            } else if (groups[i].groups?.length > 0) {
                this.deleteGroupsById(groups[i].groups, data)
            }
        }
    }
}

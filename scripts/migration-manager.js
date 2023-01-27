import { Logger, Utils } from './utilities/utils.js'

export class MigrationManager {
    constructor (systemModuleId) {
        this.systemModuleId = systemModuleId
    }

    // Initialise migration
    async init () {
        await this._migrateUserFlags()
    }

    /**
     * Migrate user flags
     */
    async _migrateUserFlags () {
        // Exit if system is not dnd5e
        if (!this.systemModuleId === 'token-action-hud-dnd5e') return

        // Get categories
        const categories = Utils.getUserFlag('categories')

        // Exit if no categories exist
        if (!categories) return

        // Exit if object is already an array
        if (Array.isArray(categories)) return

        try {
            // Get default subcategories from system module
            const systemModuleDefaultsFile = `../../${this.systemModuleId}/scripts/defaults.js`
            const systemSubcategories = await import(systemModuleDefaultsFile).then(module => module.DEFAULTS.subcategories)

            // Map default subcategories for easy retrieval
            const systemSubcategoriesMap = new Map()
            systemSubcategories.forEach(subcategory => {
                systemSubcategoriesMap.set(subcategory.id, subcategory)
            })

            // Clone categories
            const categoriesClone = await Utils.deepClone(categories)

            Logger.info('Migrating user configuration...', true)

            function convertCategories (obj) {
                const categoryArray = []
                for (const key in obj) {
                    const category = { ...obj[key], nestId: key }
                    category.name = (category.title.startsWith('DND5E'))
                        ? Utils.i18n(category.title.replace('DND5E.Item', 'ITEM.'))
                        : category.title
                    convertSubcategories(category)
                    categoryArray.push(category)
                }
                return categoryArray

                function convertSubcategories (categorySubcategory) {
                    if (!categorySubcategory.subcategories) return
                    if (Array.isArray(categorySubcategory.subcategories)) return
                    const subcategoryArray = []
                    for (const subcategoryKey in categorySubcategory.subcategories) {
                        let subcategory = categorySubcategory.subcategories[subcategoryKey]
                        if (systemSubcategoriesMap.has(subcategory.id)) {
                            subcategory = systemSubcategoriesMap.get(subcategory.id)
                        } else {
                            subcategory.name = subcategory.title
                        }
                        subcategory.nestId = subcategoryKey

                        convertSubcategories(subcategory)

                        if (subcategory.id === 'spells') {
                            const nestId = subcategory.nestId.substring(0, subcategory.nestId.lastIndexOf('spells'))
                            const spellsArray = [
                                { ...systemSubcategoriesMap.get('at-will-spells'), nestId: `${nestId}at-will-spells` },
                                { ...systemSubcategoriesMap.get('innate-spells'), nestId: `${nestId}innate-spells` },
                                { ...systemSubcategoriesMap.get('pact-spells'), nestId: `${nestId}pact-spells` },
                                { ...systemSubcategoriesMap.get('cantrips'), nestId: `${nestId}cantrips` },
                                { ...systemSubcategoriesMap.get('1st-level-spells'), nestId: `${nestId}1st-level-spells` },
                                { ...systemSubcategoriesMap.get('2nd-level-spells'), nestId: `${nestId}2nd-level-spells` },
                                { ...systemSubcategoriesMap.get('3rd-level-spells'), nestId: `${nestId}3rd-level-spells` },
                                { ...systemSubcategoriesMap.get('4th-level-spells'), nestId: `${nestId}4th-level-spells` },
                                { ...systemSubcategoriesMap.get('5th-level-spells'), nestId: `${nestId}5th-level-spells` },
                                { ...systemSubcategoriesMap.get('6th-level-spells'), nestId: `${nestId}6th-level-spells` },
                                { ...systemSubcategoriesMap.get('7th-level-spells'), nestId: `${nestId}7th-level-spells` },
                                { ...systemSubcategoriesMap.get('8th-level-spells'), nestId: `${nestId}8th-level-spells` },
                                { ...systemSubcategoriesMap.get('9th-level-spells'), nestId: `${nestId}9th-level-spells` }
                            ]
                            subcategoryArray.push(...spellsArray)
                        } else if (subcategory.id === 'features') {
                            const nestId = subcategory.nestId.substring(0, subcategory.nestId.lastIndexOf('features'))
                            const featuresArray = [
                                { ...systemSubcategoriesMap.get('active-features'), nestId: `${nestId}active-features` },
                                { ...systemSubcategoriesMap.get('passive-features'), nestId: `${nestId}passive-features` }
                            ]
                            subcategoryArray.push(...featuresArray)
                        } else {
                            subcategoryArray.push(subcategory)
                        }
                    }
                    categorySubcategory.subcategories = subcategoryArray
                }
            }

            const categoriesArray = convertCategories(categoriesClone)

            await Utils.setUserFlag('categories', categoriesArray)

            Logger.info('Successfully migrated user configuration', true)
        } catch {
            await Utils.unsetUserFlag('categories')
            Logger.error('Failed to migrate user configuration, reverting to default configuration', true)
        }
    }
}

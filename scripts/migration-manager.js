import { Logger, Utils } from './utilities/utils.js'

export class MigrationManager {
    constructor (systemModuleId) {
        this.systemModuleId = systemModuleId
    }

    // Initialise migration
    async init () {
        this._migrateUserFlags()
    }

    /**
     * Migrate user flags
     */
    async _migrateUserFlags () {
        // Get categories
        const categories = Utils.getUserFlag('categories')

        // Exit if object is already an array
        if (Array.isArray(categories)) return

        try {
            // Get default subcategories from system module
            const systemModuleDefaultsFile = `../../${this.systemModuleId}/scripts/defaults.js`
            const systemSubcategories = await import(systemModuleDefaultsFile).then(module => module.defaults.subcategories)

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
                        subcategoryArray.push(subcategory)
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

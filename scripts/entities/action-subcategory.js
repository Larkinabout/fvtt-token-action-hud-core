export class ActionSubcategory {
    constructor (
        subcategoryData = {}
    ) {
        this.id = subcategoryData?.id
        this.nestId = subcategoryData?.nestId
        this.name = subcategoryData?.name
        this.type = subcategoryData?.type ?? 'custom'
        this.level = 'subcategory'
        if (subcategoryData?.info1) this.info1 = subcategoryData?.info1
        if (subcategoryData?.info2) this.info1 = subcategoryData?.info2
        if (subcategoryData?.info3) this.info1 = subcategoryData?.info3
        this.actions = []
        this.subcategories = []
    }
}

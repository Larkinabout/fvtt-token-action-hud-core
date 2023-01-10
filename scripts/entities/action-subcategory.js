export class ActionSubcategory {
    constructor (
        id = '',
        nestId = '',
        name = '',
        type = ''
    ) {
        this.id = id
        this.nestId = nestId
        this.name = name
        this.type = type
        this.level = 'subcategory'
        this.info1 = ''
        this.actions = []
        this.subcategories = []
    }
}

import { Utils } from "../core/utils.mjs";

export class GroupResizer {
  constructor(tokenActionHud, hudManager) {
    this.tokenActionHud = tokenActionHud;
    this.hudManager = hudManager;
    this.groupHandler = hudManager.groupHandler;
    this.minCols = 3;
    this.isCustomWidth = false;
    this.settings = null;
    this.spacing = 10;
  }

  /**
   * Resize the groups element
   * @param {object} groupElement The group element
   */
  async resizeGroup(groupElement) {
    if (!groupElement) return;

    this.#setVariables(groupElement);

    if (!this.subgroupsElement) return;

    if (!this.tokenActionHud.isDocked) {
      await this.#setWidth();
    }

    await this.#setHeight();

    this.#resetVariables();
  }

  /* -------------------------------------------- */

  /**
   * Set variables
   * @private
   * @param {object} groupElement The group element
   */
  async #setVariables(groupElement) {
    this.#resetVariables();

    this.groupElement = groupElement;

    // Get groups element
    await this.#setSubgroupsElement();
    if (!this.subgroupsElement) return;

    // Reset groups elements
    this.#resetGroupsElements();

    // Get groups
    this.#setSubgroupElementArr();
  }

  /* -------------------------------------------- */

  /**
   * Reset variables
   * @private
   */
  #resetVariables() {
    this.actionsElements = null;
    this.availableHeight = null;
    this.availableWidth = null;
    this.gridWidth = null;
    this.groupElement = null;
    this.subgroupElementArr = null;
    this.subgroupsElement = null;
    this.subgroupsElementPadding = null;
    this.subgroupsElementRect = null;
    this.isCustomWidth = false;
    this.minCols = 3;
    this.settings = null;
    this.spacing = 10;
  }

  /* -------------------------------------------- */

  /**
   * Reset groups elements
   */
  #resetGroupsElements() {
    const level1GroupElement = this.groupElement.closest('[data-part="group"]');
    const groupsElements = level1GroupElement.querySelectorAll(".tah-subgroups");
    const style = { maxHeight: "", overflowY: "" };
    this.#resetCSS(groupsElements, style);
  }

  /* -------------------------------------------- */

  /**
   * Get the grid width
   * @private
   */
  async #getGridWidth() {
    // Reset action elements
    const emptyStyle = { display: "", gridTemplateColumns: "", width: "" };
    await this.#resetCSS(this.actionsElements, emptyStyle);

    const actionWidths = [];
    const actionWidthsForMedian = [];
    for (const actionsElement of this.actionsElements) {
      const actionElements = actionsElement.querySelectorAll(".tah-action:not(.shrink)");
      for (const actionElement of actionElements) {
        const actionRect = actionElement.getBoundingClientRect();
        const actionWidth = Math.round(parseFloat(actionRect.width) + 1 || 0);
        const actionButtonText = actionElement.querySelector(".tah-action-button-text");
        const actionButtonTextRect = actionButtonText?.getBoundingClientRect();
        const actionButtonTextWidth = Math.round(parseFloat(actionButtonTextRect?.width) || 0);
        actionWidthsForMedian.push(actionWidth);
        actionWidths.push({ actionWidth, actionButtonTextWidth });
      }
    }

    let upperQuartileAverage = Math.ceil(Utils.getUpperQuartileAverage(actionWidthsForMedian));
    const minActionButtonTextWidth = 30;

    for (const actionWidth of actionWidths) {
      const availableactionButtonTextWidth = upperQuartileAverage
        - (actionWidth.actionWidth - actionWidth.actionButtonTextWidth);
      if (availableactionButtonTextWidth < minActionButtonTextWidth) {
        upperQuartileAverage = (upperQuartileAverage - availableactionButtonTextWidth) + minActionButtonTextWidth;
      }
    }

    this.gridWidth = upperQuartileAverage;
  }

  /* -------------------------------------------- */

  /**
   * Resize the actions element into the grid format
   * @private
   * @param {object} actionsElement   The actions element
   * @param {number} groupCustomWidth The group custom width
   */
  async #resizeGrid(actionsElement, groupCustomWidth) {
    if (!actionsElement) return;
    const emptyStyle = { display: "", gridTemplateColumns: "", width: "" };
    await this.#assignCSS(actionsElement, emptyStyle);

    const actions = actionsElement.querySelectorAll(".tah-action");
    const squaredCols = Math.ceil(Math.sqrt(actions.length));
    const availableGroupWidth = groupCustomWidth ?? this.availableWidth;
    const availableCols = Math.floor(availableGroupWidth / this.gridWidth);
    const cols = (squaredCols > availableCols || groupCustomWidth)
      ? availableCols
      : (actions.length <= this.minCols) ? actions.length : squaredCols;
    // Apply maxHeight and width styles to content
    const style = { display: "grid", gridTemplateColumns: `repeat(${cols}, ${this.gridWidth}px)` };
    await this.#assignCSS(actionsElement, style);
  }

  /* -------------------------------------------- */

  /**
   * Resize the actions element
   * @private
   * @param {object} actionsElement   The actions element
   * @param {number} groupCustomWidth The group custom width
   */
  async #resize(actionsElement, groupCustomWidth) {
    if (!actionsElement) return;

    let width = 500;

    if (this.isCustomWidth) {
      width = this.availableWidth;
    } else if (groupCustomWidth) {
      width = groupCustomWidth;
    } else {
      const actions = actionsElement.querySelectorAll(".tah-action");
      if (!actions.length) return;
      const sqrtActions = Math.ceil(Math.sqrt(actions.length)); // 4

      // Initialize variables
      let currentRow = 1;
      let maxRowWidth = 0;
      let rowWidth = 0;
      // Iterate through action groups, calculating dimensions and counts
      if (actions.length > 0) {
        actions.forEach((action, index) => {
          if ((index + 1) / sqrtActions > currentRow) {
            rowWidth = rowWidth - 5;
            maxRowWidth = (rowWidth > maxRowWidth) ? rowWidth : maxRowWidth;
            rowWidth = 0;
            currentRow++;
          }
          const actionRect = action.getBoundingClientRect();
          const actionWidth = Math.ceil(parseFloat(actionRect.width) + 1 || 0);
          rowWidth += actionWidth;
          if (index + 1 === actions.length) {
            rowWidth = rowWidth - 5;
            maxRowWidth = (rowWidth > maxRowWidth) ? rowWidth : maxRowWidth;
          }
        });
      }

      // Add padding to maxAvgGroupWidth and maxGroupWidth
      maxRowWidth += this.subgroupsElementPadding;

      // Determine width of content
      width = (maxRowWidth < this.availableWidth && actions.length > 3) ? maxRowWidth : this.availableWidth;
      if (width < 200) width = 200;
    }

    const style = { maxWidth: `${width}px` };
    await this.#assignCSS(actionsElement, style);
  }

  /* -------------------------------------------- */

  /**
   * Get available content width
   * @private
   * @returns {number} The available content width
   */
  #getAvailableWidth() {
    const customWidth = this.settings?.customWidth;

    if (customWidth) {
      this.isCustomWidth = true;
      return customWidth;
    }

    const windowWidth = canvas.screenDimensions[0] || window.innerWidth;
    const contentLeft = this.subgroupsElementRect.left;
    const uiRight = document.querySelector("#ui-right");
    const uiRightClientWidth = uiRight.clientWidth;
    return Math.floor((
      uiRightClientWidth > 0
        ? windowWidth - uiRightClientWidth
        : windowWidth
    ) - this.spacing - contentLeft);
  }

  /* -------------------------------------------- */

  /**
   * Get subgroups element
   * @private
   */
  async #setSubgroupsElement() {
    this.subgroupsElement = this.groupElement.querySelector('[data-part="subgroups"]');
    if (!this.subgroupsElement) return;
    this.subgroupsElementRect = this.subgroupsElement.getBoundingClientRect();
    this.subgroupsElementComputed = getComputedStyle(this.subgroupsElement);
    this.subgroupsElementPadding =
      Math.ceil(parseFloat(this.subgroupsElementComputed.paddingLeft) || 0)
      + Math.ceil(parseFloat(this.subgroupsElementComputed.paddingRight) || 0);
  }

  /* -------------------------------------------- */

  /**
   * Get subgroup elements
   * @private
   */
  #setSubgroupElementArr() {
    this.subgroupElementArr = this.groupElement.querySelectorAll('[data-part="subgroup"]');
    if (this.subgroupElementArr.length === 0) this.subgroupElementArr = [this.groupElement];
  }

  /* -------------------------------------------- */

  /**
   * Set the width
   */
  async #setWidth() {
    this.actionsElements = this.groupElement.querySelectorAll('[data-part="actions"]');

    // Exit early if no action elements exist
    if (this.actionsElements.length === 0) return;

    // Get group settings
    const nestId = this.groupElement.dataset.nestId;
    this.settings = await this.groupHandler.getGroupSettings({ nestId, level: 1 });

    // Get available width
    this.availableWidth = this.#getAvailableWidth();

    // Loop groups
    let hasGrid = false;
    for (const subgroupElement of this.subgroupElementArr) {
      const actionsElement = subgroupElement.querySelector('[data-part="actions"]');
      if (!actionsElement) continue;
      const nestId = subgroupElement.dataset.nestId;
      const groupSettings = await this.groupHandler.getGroupSettings({ nestId });
      const groupCustomWidth = groupSettings.customWidth;
      const grid = Utils.getSetting("grid") || this.settings?.grid || groupSettings?.grid || actionsElement.style.display;
      if (grid) {
        if (!hasGrid) {
          await this.#getGridWidth();
          hasGrid = true;
        }
        await this.#resizeGrid(actionsElement, groupCustomWidth);
      } else {
        await this.#resize(actionsElement, groupCustomWidth);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Set the height
   * @private
   */
  async #setHeight() {
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        this.availableHeight = this.#getAvailableHeight();
        const style = { maxHeight: `${this.availableHeight}px`, overflowY: "auto" };
        Object.assign(this.subgroupsElement.style, style);
        resolve();
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Get available height
   * @private
   * @returns {number} The available height
   */
  #getAvailableHeight() {
    const windowHeight = canvas.screenDimensions[1] || window.innerHeight;
    const contentBottom = this.subgroupsElementRect.bottom;
    const contentTop = this.subgroupsElementRect.top;

    let uiTopBottom = null;
    if (this.tokenActionHud.isDocked) {
      let siblingsHeight = 0;
      let sibling = this.groupElement.nextElementSibling;

      if (sibling) {
        const siblings = [sibling];
        while (sibling) {
          sibling = sibling.nextElementSibling;
          if (sibling) siblings.push(sibling);
        }
        for (const sibling of siblings) {
          const siblingHeight = sibling.getBoundingClientRect().height;
          siblingsHeight += siblingHeight ?? 0;
        }
      }

      return Math.max(windowHeight - contentTop - siblingsHeight - this.spacing, 100);
    } else if (this.tokenActionHud.direction === "down") {
      if (foundry.utils.isNewerVersion(game.version, "12.999")) {
        uiTopBottom = document.querySelector("#hotbar");
      } else {
        uiTopBottom = document.querySelector("#ui-bottom");
      }
    } else if (foundry.utils.isNewerVersion(game.version, "12.999")) {
      uiTopBottom = document.querySelector("scene-navigation-active");
    } else {
      uiTopBottom = document.querySelector("#ui-top");
    }
    const uiTopBottomOffsetHeight = uiTopBottom?.offsetHeight ?? 0;
    const availableHeight = (this.tokenActionHud.direction === "down")
      ? windowHeight - contentTop - uiTopBottomOffsetHeight - this.spacing
      : contentBottom - uiTopBottomOffsetHeight - this.spacing;
    return Math.max(availableHeight, 100);
  }

  /* -------------------------------------------- */

  /**
   * Assign CSS
   * @private
   * @param {object} element The DOM element
   * @param {object} style   The style
   */
  async #assignCSS(element, style) {
    if (!element) return;
    requestAnimationFrame(() => {
      Object.assign(element.style, style);
    });
  }

  /* -------------------------------------------- */

  /**
   * Reset CSS
   * @private
   * @param {Array} elements The DOM elements
   * @param {object} style   The style
   */
  async #resetCSS(elements, style) {
    for (const element of elements) {
      Object.assign(element.style, style);
    }
  }
}

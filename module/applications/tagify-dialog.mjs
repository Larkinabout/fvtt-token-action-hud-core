import { MODULE, TEMPLATE } from "../core/constants.mjs";
import { Logger } from "../core/utils.mjs";
import DragSort from "@yaireo/dragsort";
import Tagify from "@yaireo/tagify";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for the dialogs.
 */
export class TagDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(data) {
    super(data);
    this.tagify = null;
    this.dragSort = null;
    this.content = data.content;
    this.submit = data.submit;
    this.categoryId = null;
    this.subcategoryId = null;
    this.options.window.title = data.title;
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    actions: {
      resetActions: TagDialog.resetActions,
      unselectAllTags: TagDialog.unselectAllTags
    },
    classes: [`${MODULE.ID}-app`, "tah-dialog", "sheet"],
    id: "token-action-hud-dialog",
    form: {
      closeOnSubmit: true,
      handler: TagDialog.submit
    },
    position: {
      width: 600,
      height: 680
    },
    tag: "form",
    window: {
      minimizable: true,
      resizable: true
    }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    return this.content;
  }

  /* -------------------------------------------- */

  /**
   * Show dialog
   * @public
   * @param {string} dialogType      The dialog type
   * @param {string} nestId          The nest id
   * @param {object} tags            The available and selected tags
   * @param {object} dialogData      The dialog data
   * @param {function*} dialogSubmit The dialog submit function
   */
  static showDialog(dialogType, nestId, tags, dialogData, dialogSubmit) {
    this.nestId = nestId;
    TagDialog.#prepareHook(tags);

    const data = {
      title: dialogData.title,
      content: dialogData.content,
      submit: dialogSubmit
    };

    let dialog;
    switch (dialogType) {
      case "hud":
        dialog = new TagDialogHud(data);
        break;
      case "topLevelGroup":
        dialog = new tagDialogGroup(data);
        break;
      case "group":
        dialog = new tagDialogSubgroup(data);
        break;
    }

    dialog.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Prepare dialog hook
   * @private
   * @param {object} tags The tags
   */
  static #prepareHook(tags) {
    Hooks.once("renderTagDialog", (app, html, options) => {
      const tagInput = html.querySelector('input[class="tah-dialog-tagify"]');

      if (tagInput) {
        const options = {
          delimiters: ";",
          maxTags: "Infinity",
          dropdown: {
            position: "manual",
            maxItems: Infinity, // <- maximum allowed rendered suggestions
            classname: "tah-dialog-tags-dropdown", // <- custom classname for this dropdown, so it could be targeted
            enabled: 0 // <- show suggestions on focus
          },
          templates: {
            dropdownItemNoMatch() {
              return "<div class='empty'>Nothing Found</div>";
            }
          }
        };

        if (tags.available) options.whitelist = tags.available;

        TagDialog.tagify = new Tagify(tagInput, options);

        if (tags.selected) TagDialog.tagify.addTags(tags.selected);

        TagDialog.dragSort = new DragSort(TagDialog.tagify.DOM.scope, {
          selector: `.${TagDialog.tagify.settings.classNames.tag}`,
          callbacks: { dragEnd: onDragEnd }
        });

        /**
         * On drag end
         */
        function onDragEnd() {
          TagDialog.tagify.updateValueByDOMTags();
        }

        const tagifyInput = html.querySelector(".tagify__input");
        if (tagifyInput) {
          tagifyInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
              event.preventDefault();
              TagDialog.tagify.addTags(TagDialog.tagify.state.inputText, !0);
            }
          });
        }

        if (app.constructor.name === "TagDialogHud") return;

        TagDialog.tagify.dropdown.show();
        const dropdownLabelElement = document.createElement("div");
        dropdownLabelElement.classList.add("tah-dialog-label");
        dropdownLabelElement.innerHTML = game.i18n.localize("tokenActionHud.form.hud.availableItems");
        TagDialog.tagify.DOM.scope.parentNode.appendChild(dropdownLabelElement);
        TagDialog.tagify.DOM.scope.parentNode.appendChild(TagDialog.tagify.DOM.dropdown);
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * When the 'Reset Actions within Groups' button is clicked, reset the actor's HUD data.
   * Only used in the HUD dialog.
   * @private
   */
  static async resetActions() {
    await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("tokenActionHud.dialog.resetActions.title")
      },
      content: `<p>${game.i18n.localize("tokenActionHud.dialog.resetActions.content")}</p>`,
      modal: true,
      yes: {
        label: game.i18n.localize("tokenActionHud.dialog.button.yes"),
        callback: async () => {
          await game.tokenActionHud.resetActorData();
          Logger.info("Actions reset", true);
        }
      },
      no: {
        label: game.i18n.localize("tokenActionHud.dialog.button.no")
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * When the 'Unselect All' button is clicked, unselect all tags
   */
  static unselectAllTags() {
    TagDialog.tagify.removeAllTags();
  }

  /* -------------------------------------------- */

  /** @override */
  _onKeyDown(event) {
    // Close dialog
    if (event.key === "Escape" && !event.target.className.includes("tagify")) {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }

    // Confirm default choice
    if (
      event.key === "Enter"
            && this.data.default
            && !event.target.className.includes("tagify")
    ) {
      event.preventDefault();
      event.stopPropagation();
      const defaultChoice = this.data.buttons[this.data.default];
      return this.submit(defaultChoice);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle form submission
   * @param {object} event    The event
   * @param {object} form     The form
   * @param {object} formData The form data
   */
  static async submit(event, form, formData) {
    const selection = TagDialog.tagify.value.map(c => {
      c.id = c.id ?? c.value.slugify({ replacement: "-", strict: true });
      return {
        id: c.id,
        listName: c.value,
        name: c.name ?? c.value,
        type: c.type
      };
    });
    await this.submit(selection, formData.object);
  }
}

/* -------------------------------------------- */

export class TagDialogHud extends TagDialog {
  static PARTS = {
    form: {
      template: TEMPLATE.tagDialogHud
    }
  };
}

/* -------------------------------------------- */

export class tagDialogGroup extends TagDialog {
  static PARTS = {
    form: {
      template: TEMPLATE.tagDialogGroup
    }
  };
}

/* -------------------------------------------- */

export class tagDialogSubgroup extends TagDialog {
  static PARTS = {
    form: {
      template: TEMPLATE.tagDialogSubgroup
    }
  };
}

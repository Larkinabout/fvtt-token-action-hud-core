import { Logger, Utils } from "../utils.js";

/**
 * Reset all layouts confirmation dialog
 * @public
 */
export async function resetAllLayoutsDialog() {
  await foundry.applications.api.DialogV2.confirm({
    window: {
      title: game.i18n.localize("tokenActionHud.dialog.resetAllLayouts.title")
    },
    content: `<p>${game.i18n.localize("tokenActionHud.dialog.resetAllLayouts.content")}</p>`,
    modal: true,
    yes: {
      label: game.i18n.localize("tokenActionHud.dialog.button.yes"),
      callback: async () => resetAllLayouts()
    },
    no: {
      label: game.i18n.localize("tokenActionHud.dialog.button.no")
    }
  });
}

/* -------------------------------------------- */

/**
 * Reset HUD layouts for everyone
 * @public
 */
async function resetAllLayouts() {
  if (!game.tokenActionHud) return;

  const customLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=customLayout]");
  if (customLayoutElement) {
    await Utils.setSetting("customLayout", customLayoutElement?.value ?? "");
  }

  const userCustomLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=userCustomLayout]");
  if (userCustomLayoutElement) {
    await Utils.setUserFlag("userCustomLayout", userCustomLayoutElement?.value ?? "");
  }

  await game.tokenActionHud.socket.executeForEveryone("reset");
  Logger.info("All layouts reset", true);
}

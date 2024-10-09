import { Logger, Utils } from "../utils.js";

/**
 * Reset layout confirmation dialog
 * @public
 */
export async function resetLayoutDialog() {
  await foundry.applications.api.DialogV2.confirm({
    window: {
      title: game.i18n.localize("tokenActionHud.dialog.resetLayout.title")
    },
    content: `<p>${game.i18n.localize("tokenActionHud.dialog.resetLayout.content")}</p>`,
    modal: true,
    yes: {
      label: game.i18n.localize("tokenActionHud.dialog.button.yes"),
      callback: async () => resetLayout
    },
    no: {
      label: game.i18n.localize("tokenActionHud.dialog.button.no")
    }
  });
}

/**
 * Reset user layout
 */
async function resetLayout() {
  if (!game?.tokenActionHud) return;

  const customLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=customLayout]");
  if (customLayoutElement) {
    await game.tokenActionHud.updateSettings("customLayout", customLayoutElement?.value ?? "");
    await Utils.setSetting("customLayout", customLayoutElement?.value ?? "");
  }

  const userCustomLayoutElement = document.querySelector("#token-action-hud-core-settings input[name=userCustomLayout]");
  if (userCustomLayoutElement) {
    await game.tokenActionHud.updateSettings("userCustomLayout", userCustomLayoutElement?.value ?? "");
    await Utils.setUserFlag("userCustomLayout", userCustomLayoutElement?.value ?? "");
  }

  await game.tokenActionHud.resetLayout();
  Logger.info("Layout reset", true);
}

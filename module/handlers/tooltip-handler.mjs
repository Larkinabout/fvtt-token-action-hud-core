import { Utils } from "../core/utils.mjs";


/**
 * Get tooltip based on module setting
 * @param {object|string} tooltip The tooltip
 * @param {string} name           The name
 * @returns {object}              The tooltip
 */
export function getTooltip(tooltip, name) {
  const setting = game.tokenActionHud?.setting?.tooltips ?? Utils.getSetting("tooltips");

  if (setting === "none") return null;
  if (setting === "nameOnly" || !tooltip) return name;

  if (typeof tooltip !== "object") {
    tooltip = { content: tooltip };
  }

  if (!tooltip.content.includes("tah-tooltip-wrapper")) {
    tooltip.content = `<div class="tah-tooltip-wrapper">${tooltip.content}</div>`;
  }

  let direction = "RIGHT";
  if (tooltip.direction) {
    direction = tooltip.direction;
  } else {
    const style = game.tokenActionHud.systemManager.styles[game.tokenActionHud.setting.style];

    if (["center-right", "right"].includes(style.dockPosition)) {
      direction = "LEFT";
    }
  }

  tooltip.direction = direction;

  return tooltip;
}

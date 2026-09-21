import { Utils } from "../core/utils.mjs";

/**
 * Get tooltip based on module setting.
 * @param {object|string} tooltip
 * @param {string} name
 * @returns {object|null} Tooltip
 */
export function getTooltip(tooltip, name) {
  const setting = game.tokenActionHud?.setting?.tooltips ?? Utils.getSetting("tooltips");

  if (setting === "none") return null;

  if (!tooltip || typeof tooltip !== "object") {
    tooltip = { content: tooltip };
  }

  const hasContent = tooltip.content && typeof tooltip.content === "string";

  if (setting === "nameOnly" || !hasContent) {
    tooltip = { content: name, direction: tooltip.direction };
  } else if (!tooltip.content.includes("tah-tooltip-wrapper")) {
    tooltip.content = `<div class="tah-tooltip-wrapper">${tooltip.content}</div>`;
  }

  let direction = "RIGHT";
  if (tooltip.direction) {
    direction = tooltip.direction;
  } else {
    const styles = game.tokenActionHud.systemManager.styles;
    const style = styles[game.tokenActionHud.setting.style] ?? styles.foundryVTT;

    if (["center-right", "right"].includes(style?.dockPosition)) {
      direction = "LEFT";
    }
  }

  tooltip.direction = direction;

  return tooltip;
}

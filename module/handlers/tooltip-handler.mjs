import { Utils } from "../core/utils.mjs";


/**
 * Get tooltip based on module setting
 * @param {string} tooltip The tooltip
 * @param {string} name    The name
 * @returns {string}       The tooltip
 */
export function getTooltip(tooltip, name) {
  const setting = Utils.getSetting("tooltips");

  if (setting === "none") return null;
  if (setting === "nameOnly" || !tooltip) return name;

  if (typeof tooltip !== "object") {
    tooltip = { content: tooltip };
  }

  if (!tooltip.content.includes("tah-tooltip-wrapper")) {
    tooltip.content = `<div class="tah-tooltip-wrapper">${tooltip.content}</div>`;
  }

  return tooltip;
}

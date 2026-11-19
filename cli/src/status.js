/**
 * Format a stderr status line. The emoji prefix is only for an interactive
 * terminal: it is dropped when NO_COLOR is set to a non-empty value
 * (https://no-color.org) or when stderr is not a TTY.
 * @param {string} icon
 * @param {string} message
 * @param {{ env?: Record<string, string | undefined>, isTTY?: boolean }} [opts]
 * @returns {string}
 */
export function statusLine(
	icon,
	message,
	{ env = process.env, isTTY = process.stderr.isTTY } = {}
) {
	const plain = Boolean(env.NO_COLOR) || !isTTY;
	return plain ? `${message}\n` : `${icon} ${message}\n`;
}

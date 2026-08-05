/**
 * Require an absolute http(s) URL for --host. Do not guess a scheme.
 * @param {string} value
 * @returns {string} the original value when valid
 * @throws {Error} when the value is missing a scheme or is not a URL
 */
export function validateHost(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `--host must be a valid URL with http:// or https:// scheme (got ${JSON.stringify(value)})`,
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `--host must use http:// or https:// scheme (got ${JSON.stringify(value)})`,
    );
  }
  return value;
}

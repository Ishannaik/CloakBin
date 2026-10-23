import { env } from '$env/dynamic/private';
import { parseCreateRequiresLogin } from './config';

/** Read per call so tests and restarts pick up changes; throws on an invalid value. */
export function createRequiresLogin(): boolean {
	return parseCreateRequiresLogin(env.CREATE_REQUIRES_LOGIN);
}

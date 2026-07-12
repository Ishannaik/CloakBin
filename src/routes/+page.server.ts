import type { PageServerLoad } from './$types';

// PERF: the home/create shell is identical for every visitor (auth + editor state are
// entirely client-side), so let the CDN cache the SSR HTML. Not prerendered — that would
// bypass the hooks and drop the CSP/HSTS security headers.
export const load: PageServerLoad = ({ setHeaders }) => {
	setHeaders({
		'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400'
	});
	return {};
};

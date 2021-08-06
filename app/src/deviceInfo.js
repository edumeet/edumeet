import bowser from 'bowser';

window.BB = bowser;

export default function deviceInfo()
{
	const ua = navigator.userAgent;
	const browser = bowser.getParser(ua);

	let flag;

	if (browser.satisfies({ chrome: '>=0', chromium: '>=0' }))
		flag = 'chrome';
	else if (browser.satisfies({ firefox: '>=0' }))
		flag = 'firefox';
	else if (browser.satisfies({ safari: '>=0' }))
		flag = 'safari';
	else if (browser.satisfies({ opera: '>=0' }))
		flag = 'opera';
	else if (browser.satisfies({ 'microsoft edge': '>=0' }))
		flag = 'edge';
	else
		flag = 'unknown';

	return {
		flag,
		os       : browser.getOSName(true), // ios, android, linux...
		platform : browser.getPlatformType(true), // mobile, desktop, tablet
		name     : browser.getBrowserName(true),
		version  : browser.getBrowserVersion(),
		bowser   : browser
	};
}

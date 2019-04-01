const key = {
	fullscreenEnabled : 0,
	fullscreenElement : 1,
	requestFullscreen : 2,
	exitFullscreen    : 3,
	fullscreenchange  : 4,
	fullscreenerror   : 5
};

const webkit = [
	'webkitFullscreenEnabled',
	'webkitFullscreenElement',
	'webkitRequestFullscreen',
	'webkitExitFullscreen',
	'webkitfullscreenchange',
	'webkitfullscreenerror'
];

const moz = [
	'mozFullScreenEnabled',
	'mozFullScreenElement',
	'mozRequestFullScreen',
	'mozCancelFullScreen',
	'mozfullscreenchange',
	'mozfullscreenerror'
];

const ms = [
	'msFullscreenEnabled',
	'msFullscreenElement',
	'msRequestFullscreen',
	'msExitFullscreen',
	'MSFullscreenChange',
	'MSFullscreenError'
];

export default class FullScreen
{
	constructor(document)
	{
		this.document = document;
		this.vendor = (
			('fullscreenEnabled' in this.document && Object.keys(key)) ||
			(webkit[0] in this.document && webkit) ||
			(moz[0] in this.document && moz) ||
			(ms[0] in this.document && ms) ||
			[]
		);
	}

	requestFullscreen(element)
	{
		element[this.vendor[key.requestFullscreen]]();
	}

	requestFullscreenFunction(element)
	{
		// eslint-disable-next-line
		element[this.vendor[key.requestFullscreen]];
	}

	addEventListener(type, handler)
	{
		this.document.addEventListener(this.vendor[key[type]], handler);
	}

	removeEventListener(type, handler)
	{
		this.document.removeEventListener(this.vendor[key[type]], handler);
	}

	get exitFullscreen()
	{
		return this.document[this.vendor[key.exitFullscreen]].bind(this.document);
	}

	get fullscreenEnabled()
	{
		return Boolean(this.document[this.vendor[key.fullscreenEnabled]]);
	}
	set fullscreenEnabled(val) {}

	get fullscreenElement()
	{
		return this.document[this.vendor[key.fullscreenElement]];
	}
	set fullscreenElement(val) {}

	get onfullscreenchange()
	{
		return this.document[`on${this.vendor[key.fullscreenchange]}`.toLowerCase()];
	}

	set onfullscreenchange(handler)
	{
		this.document[`on${this.vendor[key.fullscreenchange]}`.toLowerCase()] = handler;
	}

	get onfullscreenerror()
	{
		return this.document[`on${this.vendor[key.fullscreenerror]}`.toLowerCase()];
	}

	set onfullscreenerror(handler)
	{
		this.document[`on${this.vendor[key.fullscreenerror]}`.toLowerCase()] = handler;
	}
}

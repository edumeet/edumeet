import chroma from 'chroma-js';
import Logger from '../../Logger';
import deviceInfo from '../../deviceInfo';

const logger = new Logger('AudioAnalyzer');

// @ts-ignore
const AudioContext = window.AudioContext || window.webkitAudioContext || false;

const supportedBrowsers =
{
	'windows' : {
		'microsoft edge' : '>18'
	},
	'safari'   : '>12',
	'chrome'   : '>=74',
	'chromium' : '>=74',
	'opera'    : '>=62',
	'firefox'  : '>=60'
	// 'samsung internet for android' : '>=11.1.1.52'
};

export class AudioAnalyzer
{
	container : HTMLElement;

	unsupportedBrowserElement : HTMLElement | null = null;

	tracks : Map<MediaStreamTrack, MediaStreamAudioSourceNode> | null = null;

	canvas : HTMLCanvasElement | null = null;

	canvasContext : CanvasRenderingContext2D | null = null;

	canvasColumn = 0;

	colorScale : any;

	context : AudioContext | null = null;

	analyser : AnalyserNode | null = null;

	frequencyArray : Uint8Array | null = null;

	private labelsWidth = 20;

	private labelsSize = 10;

	private resizeObserver : ResizeObserver | null = null;

	private resizeCanvasTimeout : any;

	constructor(container: HTMLElement)
	{
		logger.debug('constructor', { container });

		this.container = container;

		// check if device is compatible
		const device = deviceInfo();

		if (!device.bowser.satisfies(supportedBrowsers))
		{
			logger.warn('unsupported browser', device);

			this.unsupportedBrowserElement = document.createElement('i');
			this.unsupportedBrowserElement.style.cssText = `
				font-size: 0.7rem;
				color: #ddd;
				background-color: rgba(0, 0, 0, 0.9);
				padding: 0.5rem;
				display: block;			
			`;
			this.unsupportedBrowserElement.innerHTML =
				'The audio analyzer is currently unsupported in your browser.';
			this.container.append(this.unsupportedBrowserElement);

			return;
		}

		//
		this.tracks = new Map();

		// canvas
		this.canvas = document.createElement('canvas');
		this.canvas.style.cssText = `
			position: relative;
			top: 0;
	        left: 0;
	        bottom: 0;
	        right: 0;
	        width: 100%;
	        height: 100%;
			background-color: rgba(0, 0, 0, 0.9);
		`;

		this.canvas.width = this.container.clientWidth;
		this.canvas.height = this.container.clientHeight;
		this.canvasContext = this.canvas.getContext('2d') as CanvasRenderingContext2D;
		this.container.append(this.canvas);

		this.canvasColumn = this.labelsWidth;
		this.renderScale();

		this.colorScale = chroma.scale([ 'black', 'blue', 'yellow', 'red' ])
			.domain([ 0, 64, 128, 192, 255 ])
			.out('hex');

		// capture resize events and force rendering
		this.resizeObserver = new ResizeObserver(() =>
		{
			clearTimeout(this.resizeCanvasTimeout);
			this.resizeCanvasTimeout = setTimeout(() => this.resizeCanvas(), 200);
		});

		this.resizeObserver.observe(this.container);

		// audio context
		this.context = new AudioContext({
			latencyHint : 'playback'
		});
		this.analyser = new AnalyserNode(this.context, {
			fftSize               : 2048,
			maxDecibels           : -20,
			minDecibels           : -80,
			smoothingTimeConstant : 0.5
		});
		this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

		requestAnimationFrame(this.renderLoop.bind(this));
	}

	addTrack(track: MediaStreamTrack)
	{
		if (!this.tracks)
			return;

		if (this.tracks.has(track))
			return;

		logger.debug('addTrack', { track });

		const mediaStream = new MediaStream([ track ]);
		const sourceNode = new MediaStreamAudioSourceNode(this.context!, {
			mediaStream
		});

		sourceNode.connect(this.analyser!);
		this.tracks.set(track, sourceNode);
	}

	removeTracks()
	{
		if (!this.tracks)
			return;

		logger.debug('removeTracks');

		if (this.analyser)
		{
			for (const sourceNode of this.tracks.values())
			{
				sourceNode.disconnect(this.analyser);
			}
		}
		this.tracks.clear();
	}

	delete()
	{
		logger.debug('delete');

		if (this.unsupportedBrowserElement)
		{
			this.container.removeChild(this.unsupportedBrowserElement);
			this.unsupportedBrowserElement = null;
		}

		if (this.canvas)
		{
			this.canvasContext = null;
			this.container.removeChild(this.canvas);
			this.canvas = null;
		}

		this.removeTracks();

		if (this.resizeObserver)
			this.resizeObserver.disconnect();

		if (this.context)
			this.context.close();
	}

	resizeCanvas()
	{
		const { clientWidth, clientHeight } = this.container;

		if (this.canvas && this.canvasContext && (
			this.canvas.width !== clientWidth || this.canvas.height !== clientHeight))
		{
			const scaleX = clientWidth / this.canvas.width;

			this.canvasColumn = Math.floor(this.canvasColumn * scaleX);

			const img = new Image();

			img.onload = () =>
			{
				if (this.canvas && this.canvasContext)
				{
					this.canvas.width = clientWidth;
					this.canvas.height = clientHeight;
					this.canvasContext.drawImage(img, 0, 0, clientWidth, clientHeight);
					this.renderScale();
				}
			};
			img.src = this.canvas.toDataURL();
		}
	}

	renderScale()
	{
		const { canvas, canvasContext } = this;

		if (!canvasContext || !canvas || !canvas.height)
			return;

		canvasContext.clearRect(0, 0, this.labelsWidth, canvas.height);

		[ 5, 20, 100, 500, 2000, 6000, 20000 ].forEach((freq) =>
		{
			const y = Math.log(freq) / Math.log(24000);

			let freqString = `${freq}`;

			if (freq > 1000)
			{
				freqString = `${Math.round(freq / 1000)}k`;
			}

			canvasContext.font = `${this.labelsSize}px Sans`;
			canvasContext.fillStyle = 'white';
			canvasContext.fillText(freqString, 0,
				canvas.height * (1 - y) + this.labelsSize);
		});
	}

	render()
	{
		const { canvas, canvasContext } = this;

		if (!canvasContext || !canvas || !canvas.height)
			return false;

		this.analyser!.getByteFrequencyData(this.frequencyArray!);

		if (this.canvasColumn >= canvas.width)
		{
			this.canvasColumn = canvas.width - 1;
			const imageData = canvasContext.getImageData(
				this.labelsWidth + 1, 0,
				canvas.width - this.labelsWidth, canvas.height);

			canvasContext.putImageData(imageData, this.labelsWidth, 0);
		}

		for (let i = 0; i < this.frequencyArray!.length; i++)
		{
			const color = this.colorScale(this.frequencyArray![i]);
			const y = Math.log(i) / Math.log(this.frequencyArray!.length);

			canvasContext.fillStyle = color;
			canvasContext.fillRect(
				this.canvasColumn, canvas.height * (1 - y), 1, 1);
		}

		this.canvasColumn += 1;

		return true;
	}

	renderLoop()
	{
		if (this.render())
			setTimeout(() => requestAnimationFrame(this.renderLoop.bind(this)), 100);
	}

}


import chroma from 'chroma-js';
import Logger from '../../Logger';

const logger = new Logger('AudioAnalyzer');

// @ts-ignore
const AudioContext = window.AudioContext || window.webkitAudioContext || false;

export class AudioAnalyzer
{
    container      : HTMLElement;

    tracks         : Map<MediaStreamTrack, MediaStreamAudioSourceNode>;

    canvas         : HTMLCanvasElement | null;

    canvasContext  : CanvasRenderingContext2D | null;

    canvasColumn   : number;

    colorScale     : any;

    context        : AudioContext;

    analyser       : AnalyserNode;

    frequencyArray : Uint8Array;

    private labelsWidth = 20;

    private labelsSize = 10;

    private resizeObserver : ResizeObserver;

	constructor(container: HTMLElement)
	{
		logger.debug('constructor', { container });

		this.container = container;
		this.tracks = new Map();

		// canvas
		this.canvas = document.createElement('canvas');
		this.canvas.style.cssText = `
			position: relative;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.9);
		`;

		this.canvas.width = this.container.clientWidth;
		this.canvas.height = this.container.clientHeight;
		this.canvasContext = this.canvas.getContext('2d') as CanvasRenderingContext2D;
		this.container.append(this.canvas);

        this.canvasColumn = 0;

        this.colorScale = chroma.scale([ 'black', 'blue', 'yellow', 'red' ])
            .domain([0, 64, 128, 192, 255])
            .out('hex');

        // capture resize events and force rendering
		this.resizeObserver = new ResizeObserver((entries) =>
		{
            const { clientWidth, clientHeight } = this.container;

            if (this.canvas && (
                this.canvas.width !== clientWidth || this.canvas.height !== clientHeight))
            {
                this.canvas.width = clientWidth;
                this.canvas.height = clientHeight;
                this.canvasColumn = 0;
                requestAnimationFrame(this.render.bind(this));
            }
		});

		this.resizeObserver.observe(this.container);

		// audio context
		this.context = new AudioContext({
            latencyHint: 'playback',
            sampleRate: 48000
        });
		this.analyser = new AnalyserNode(this.context, {
            fftSize: 2048,
            maxDecibels: -20,
            minDecibels: -80,
            smoothingTimeConstant: 0.5
        });
		this.frequencyArray = new Uint8Array(this.analyser.frequencyBinCount);

		requestAnimationFrame(this.renderLoop.bind(this));
	}

	addTrack(track: MediaStreamTrack)
	{
		if (this.tracks.has(track))
			return;

		logger.debug('addTrack', { track });

		const mediaStream = new MediaStream([ track ]);
		const sourceNode = new MediaStreamAudioSourceNode(this.context, {
			mediaStream
		});

		sourceNode.connect(this.analyser);
		this.tracks.set(track, sourceNode);
	}

	removeTracks()
	{
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

        if (this.canvas)
        {
            this.canvasContext = null;
            this.container.removeChild(this.canvas);
            this.canvas = null;
        }

        this.removeTracks();
        this.resizeObserver.disconnect();
        this.context.close();
    }

    render()
    {
        const { canvas, canvasContext } = this;

        if (!canvasContext || !canvas || !canvas.height)
            return;

        this.analyser.getByteFrequencyData(this.frequencyArray);

        if (this.canvasColumn < this.labelsWidth)
        {
            [5, 20, 100, 500, 2000, 6000, 20000].forEach((freq) =>
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

            this.canvasColumn = this.labelsWidth;
        }

        if (this.canvasColumn >= canvas.width)
        {
            this.canvasColumn = canvas.width - 1;
            const imageData = canvasContext.getImageData(
                this.labelsWidth + 1, 0,
                canvas.width - this.labelsWidth, canvas.height);
            canvasContext.putImageData(imageData, this.labelsWidth, 0);
        }

        for (let i = 0; i < this.frequencyArray.length; i++)
        {
            const color = this.colorScale(this.frequencyArray[i]);
            const y = Math.log(i) / Math.log(this.frequencyArray.length);

            canvasContext.fillStyle = color;
            canvasContext.fillRect(
                this.canvasColumn, canvas.height * (1 - y), 1, 1);
        }

        this.canvasColumn += 1;
    }

	renderLoop()
	{
		this.render();
		setTimeout(() => requestAnimationFrame(this.renderLoop.bind(this)), 100);
	}

}

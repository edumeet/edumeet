import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import FullScreen from '../FullScreen';
import FullScreenIcon from '@material-ui/icons/Fullscreen';
import FullScreenExitIcon from '@material-ui/icons/FullscreenExit';

const styles = (theme) =>
	({
		root :
		{
			position : 'absolute',
			top      : 0,
			left     : 0,
			height   : '100%',
			width    : '100%',
			zIndex   : 20000
		},
		controls :
		{
			position       : 'absolute',
			zIndex         : 20020,
			right          : 0,
			top            : 0,
			display        : 'flex',
			flexDirection  : 'row',
			justifyContent : 'flex-start',
			alignItems     : 'center',
			padding        : theme.spacing(1)
		},
		button :
		{
			flex               : '0 0 auto',
			margin             : '0.2vmin',
			borderRadius       : 2,
			backgroundColor    : 'rgba(255, 255, 255, 0.7)',
			cursor             : 'pointer',
			transitionProperty : 'opacity, background-color',
			transitionDuration : '0.15s',
			width              : '5vmin',
			height             : '5vmin'
		},
		icon :
		{
			fontSize : '5vmin'
		},
		incompatibleVideo :
		{
			position       : 'absolute',
			zIndex         : 20010,
			top            : 0,
			bottom         : 0,
			left           : 0,
			right          : 0,
			display        : 'flex',
			flexDirection  : 'column',
			justifyContent : 'center',
			alignItems     : 'center',
			'& p'          :
			{
				padding       : '6px 12px',
				borderRadius  : 6,
				userSelect    : 'none',
				pointerEvents : 'none',
				fontSize      : 15,
				color         : 'rgba(255, 255, 255, 0.55)'
			}
		}
	});

class NewWindow extends React.PureComponent
{
	static defaultProps =
	{
		url        : '',
		name       : 'edumeet',
		title      : 'edumeet',
		features   : { width: '800px', height: '600px' },
		onBlock    : null,
		onUnload   : null,
		center     : 'parent',
		copyStyles : true
	};

	handleToggleFullscreen = () =>
	{
		if (this.fullscreen.fullscreenElement)
		{
			this.fullscreen.exitFullscreen();
		}
		else
		{
			this.fullscreen.requestFullscreen(this.window.document.documentElement);
		}
	};

	handleFullscreenChange = () =>
	{
		this.setState({
			fullscreen : this.fullscreen.fullscreenElement !== null
		});
	};

	constructor(props)
	{
		super(props);

		this.container = document.createElement('div');
		this.window = null;
		this.windowCheckerInterval = null;
		this.released = false;
		this.fullscreen = null;

		this.state = {
			mounted    : false,
			fullscreen : false
		};
	}

	render()
	{
		const {
			classes
		} = this.props;

		if (!this.state.mounted)
			return null;

		return ReactDOM.createPortal([
			<div key='newwindow' className={classes.root}>
				<div className={classes.controls}>
					{ this.fullscreen.fullscreenEnabled &&
						<div
							className={classes.button}
							onClick={this.handleToggleFullscreen}
							data-tip='Fullscreen'
							data-place='right'
							data-type='dark'
						>
							{ this.state.fullscreen ?
								<FullScreenExitIcon className={classes.icon} />
								:
								<FullScreenIcon className={classes.icon} />
							}
						</div>
					}
				</div>
				{ this.props.children }
			</div>
		], this.container);
	}

	componentDidMount()
	{
		this.openChild();
		// eslint-disable-next-line react/no-did-mount-set-state
		this.setState({ mounted: true });

		this.fullscreen = new FullScreen(this.window.document);

		if (this.fullscreen.fullscreenEnabled)
		{
			this.fullscreen.addEventListener('fullscreenchange', this.handleFullscreenChange);
		}
	}

	openChild()
	{
		const {
			url,
			title,
			name,
			aspectRatio,
			features,
			onBlock,
			center
		} = this.props;

		features.width = '800px';
		features.height = `${800 / aspectRatio}px`;

		if (center === 'parent')
		{
			features.left =
				(window.top.outerWidth / 2) + window.top.screenX - (features.width / 2);
			features.top =
				(window.top.outerHeight / 2) + window.top.screenY - (features.height / 2);
		}
		else if (center === 'screen')
		{
			const screenLeft =
				window.screenLeft !== undefined ? window.screenLeft : window.screen.left;
			const screenTop =
				window.screenTop !== undefined ? window.screenTop : window.screen.top;

			const width = window.innerWidth
				? window.innerWidth
				: document.documentElement.clientWidth
					? document.documentElement.clientWidth
					: window.screen.width;
			const height = window.innerHeight
				? window.innerHeight
				: document.documentElement.clientHeight
					? document.documentElement.clientHeight
					: window.screen.height;

			features.left = (width / 2) - (features.width / 2) + screenLeft;
			features.top = (height / 2) - (features.height / 2) + screenTop;
		}

		this.window = window.open(url, name, toWindowFeatures(features));

		this.windowCheckerInterval = setInterval(() =>
		{
			if (!this.window || this.window.closed)
			{
				this.release();
			}
		}, 50);

		if (this.window)
		{
			this.window.document.title = title;
			this.window.document.body.appendChild(this.container);

			if (this.props.copyStyles)
			{
				setTimeout(() => copyStyles(document, this.window.document), 0);
			}

			this.window.addEventListener('beforeunload', () => this.release());
		}
		else if (typeof onBlock === 'function')
		{
			onBlock(null);
		}
	}

	componentWillUnmount()
	{
		if (this.window)
		{
			if (this.fullscreen && this.fullscreen.fullscreenEnabled)
			{
				this.fullscreen.removeEventListener('fullscreenchange', this.handleFullscreenChange);
			}

			this.window.close();
		}
	}

	release()
	{
		if (this.released)
		{
			return;
		}

		this.released = true;

		clearInterval(this.windowCheckerInterval);

		const { onUnload } = this.props;

		if (typeof onUnload === 'function')
		{
			onUnload(null);
		}
	}
}

NewWindow.propTypes = {
	children    : PropTypes.node,
	url         : PropTypes.string,
	name        : PropTypes.string,
	title       : PropTypes.string,
	aspectRatio : PropTypes.number,
	features    : PropTypes.object,
	onUnload    : PropTypes.func,
	onBlock     : PropTypes.func,
	center      : PropTypes.oneOf([ 'parent', 'screen' ]),
	copyStyles  : PropTypes.bool,
	classes     : PropTypes.object.isRequired
};

function copyStyles(source, target)
{
	Array.from(source.styleSheets).forEach((styleSheet) =>
	{
		let rules;

		try
		{
			rules = styleSheet.cssRules;
		}
		catch (err) {}

		if (rules)
		{
			const newStyleEl = source.createElement('style');

			Array.from(styleSheet.cssRules).forEach((cssRule) =>
			{
				const { cssText, type } = cssRule;

				let returnText = cssText;

				if ([ 3, 5 ].includes(type))
				{
					returnText = cssText
						.split('url(')
						.map((line) =>
						{
							if (line[1] === '/')
							{
								return `${line.slice(0, 1)}${
									window.location.origin
								}${line.slice(1)}`;
							}

							return line;
						})
						.join('url(');
				}

				newStyleEl.appendChild(source.createTextNode(returnText));
			});

			target.head.appendChild(newStyleEl);
		}
		else if (styleSheet.href)
		{
			const newLinkEl = source.createElement('link');

			newLinkEl.rel = 'stylesheet';
			newLinkEl.href = styleSheet.href;
			target.head.appendChild(newLinkEl);
		}
	});
}

function toWindowFeatures(obj)
{
	return Object.keys(obj)
		.reduce((features, name) =>
		{
			const value = obj[name];

			if (typeof value === 'boolean')
			{
				features.push(`${name}=${value ? 'yes' : 'no'}`);
			}
			else
			{
				features.push(`${name}=${value}`);
			}

			return features;
		}, [])
		.join(',');
}

export default withStyles(styles)(NewWindow);

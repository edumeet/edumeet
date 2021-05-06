import * as fs from 'fs';
import convict from 'convict';
import { ipaddress, url } from 'convict-format-with-validator';
import json5 from 'json5';
import yaml from 'yaml';
import toml from 'toml';
import { cpus } from 'os';

import Logger from './Logger';

const logger = new Logger('config');

// add parsers
convict.addParser([
	{ extension: 'json', parse: JSON.parse },
	{ extension: 'json5', parse: json5.parse },
	{ extension: [ 'yml', 'yaml' ], parse: yaml.parse },
	{ extension: 'toml', parse: toml.parse }
]);

// add formats
function assert(assertion: Boolean, msg: string)
{
	if (!assertion)
		throw new Error(msg);
}

const isFloat = {
	name     : 'float',
	coerce   : (v: string) => parseFloat(v),
	validate : (v: number) => assert(Number.isFinite(v), 'must be a number')
};

convict.addFormats({ ipaddress, url, isFloat });

// config schema
const configSchema = convict({
	turnAPIKey :
	{
		doc     : 'TURN server key for requesting a geoip-based TURN server closest to the client.',
		format  : String,
		default : ''
	},
	turnAPIURI :
	{
		doc     : 'TURN server URL for requesting a geoip-based TURN server closest to the client.',
		format  : 'url',
		default : ''
	},
	turnAPIparams :
	{
		'uri_schema' : {
			doc     : 'TURN server URL schema.',
			format  : String,
			default : 'turn'
		},
		'transport' : {
			doc     : 'TURN server transport.',
			format  : [ 'tcp', 'udp' ],
			default : 'tcp'
		},
		'ip_ver' : {
			doc     : 'TURN server IP version.',
			format  : [ 'ipv4', 'ipv6' ],
			default : 'ipv4'
		},
		'servercount' : {
			doc     : 'TURN server count.',
			format  : 'nat',
			default : 2
		}
	},
	turnAPITimeout : {
		doc     : 'TURN server API timeout (seconds).',
		format  : 'nat',
		default : 2 * 1000
	},
	backupTurnServers : {
		doc     : 'Backup TURN servers if REST fails or is not configured',
		format  : '*',
		default : [
			{
				urls : [
					'turn:turn.example.com:443?transport=tcp'
				],
				username   : 'example',
				credential : 'example'
			}
		]
	},
	fileTracker : {
		doc     : 'Bittorrent tracker.',
		format  : String,
		default : 'wss://tracker.lab.vvc.niif.hu:443'
	},
	redisOptions : {
		doc     : 'Redis server options.',
		format  : Object,
		default : {}
	},
	cookieSecret : {
		doc     : 'Session cookie secret.',
		format  : String,
		default : 'T0P-S3cR3t_cook!e'
	},
	cookieName : {
		doc     : 'Session cookie name.',
		format  : String,
		default : 'edumeet.sid'
	},
	tls : {
		cert : {
			doc     : 'SSL certificate path.',
			format  : String,
			default : './certs/mediasoup-demo.localhost.cert.pem'
		},
		key : {
			doc     : 'SSL key path.',
			format  : String,
			default : './certs/mediasoup-demo.localhost.key.pem'
		}
	},
	listeningHost : {
		doc     : 'The listening Host or IP address. If omitted listens on every IP. ("0.0.0.0" and "::").',
		format  : String,
		default : null
	},
	listeningPort : {
		doc     : 'The HTTPS listening port.',
		format  : 'port',
		default : 8443
	},
	listeningRedirectPort : {
		doc     : 'The HTTP listening port. Any HTTP request is redirected to HTTPS.',
		format  : 'port',
		default : 8080
	},
	httpOnly : {
		doc     : 'Listens only on HTTP on listeningPort; listeningRedirectPort disabled. Use case: load balancer backend.',
		format  : 'Boolean',
		default : false
	},
	trustProxy : {
		doc     : 'WebServer/Express trust proxy config for httpOnly mode. More infos: [expressjs](https://expressjs.com/en/guide/behind-proxies.html), [proxy-addr](https://www.npmjs.com/package/proxy-addr)',
		format  : String,
		default : ''
	},
	activateOnHostJoin : {
		doc     : 'When true, the room will be open to all users since there are users in the room.',
		format  : 'Boolean',
		default : true
	},
	roomsUnlocked : {
		doc     : 'An array of rooms users can enter without waiting in the lobby.',
		format  : Array,
		default : null
	},
	maxUsersPerRoom : {
		doc     : 'It defines how many users can join a single room. If not set, no limit is applied.',
		format  : 'nat',
		default : null
	},
	routerScaleSize : {
		doc     : 'Room size before spreading to a new router.',
		format  : 'nat',
		default : 40
	},
	requestTimeout : {
		doc     : 'Socket timeout value (ms).',
		format  : 'nat',
		default : 20000
	},
	requestRetries : {
		doc     : 'Socket retries when a timeout occurs.',
		format  : 'nat',
		default : 3
	},
	// Mediasoup settings
	mediasoup :
	{
		numWorkers : {
			doc     : 'The number of Mediasoup workers to spawn.',
			format  : 'nat',
			default : Object.keys(cpus()).length
		},
		worker :
		{
			logLevel : {
				doc     : 'The Mediasoup log level.',
				format  : String,
				default : 'warn'
			},
			logTags : {
				doc     : 'The Mediasoup log tags.',
				format  : Array,
				default : [
					'info',
					'ice',
					'dtls',
					'rtp',
					'srtp',
					'rtcp'
				]
			},
			rtcMinPort : {
				doc     : 'The Mediasoup start listening port number.',
				format  : 'port',
				default : 40000
			},
			rtcMaxPort : {
				doc     : 'The Mediasoup end listening port number.',
				format  : 'port',
				default : 49999
			}
		},
		// mediasoup Router settings.
		router :
		{
			// Router media codecs.
			mediaCodecs : {
				doc     : 'The Mediasoup codecs settings.',
				format  : Object,
				default :
				[
					{
						kind      : 'audio',
						mimeType  : 'audio/opus',
						clockRate : 48000,
						channels  : 2
					},
					{
						kind       : 'video',
						mimeType   : 'video/VP8',
						clockRate  : 90000,
						parameters :
						{
							'x-google-start-bitrate' : 1000
						}
					},
					{
						kind       : 'video',
						mimeType   : 'video/VP9',
						clockRate  : 90000,
						parameters :
						{
							'profile-id'             : 2,
							'x-google-start-bitrate' : 1000
						}
					},
					{
						kind       : 'video',
						mimeType   : 'video/h264',
						clockRate  : 90000,
						parameters :
						{
							'packetization-mode'      : 1,
							'profile-level-id'        : '4d0032',
							'level-asymmetry-allowed' : 1,
							'x-google-start-bitrate'  : 1000
						}
					},
					{
						kind       : 'video',
						mimeType   : 'video/h264',
						clockRate  : 90000,
						parameters :
						{
							'packetization-mode'      : 1,
							'profile-level-id'        : '42e01f',
							'level-asymmetry-allowed' : 1,
							'x-google-start-bitrate'  : 1000
						}
					}
				]
			}
		},
		// mediasoup WebRtcTransport settings.
		webRtcTransport :
		{
			listenIps : {
				doc     : 'The Mediasoup listen IPs. [TransportListenIp](https://mediasoup.org/documentation/v3/mediasoup/api/#TransportListenIp)',
				format  : Array,
				default : [
					{ ip: '0.0.0.0', announcedIp: null }
				]
			},
			initialAvailableOutgoingBitrate : {
				doc     : 'The Mediasoup initial available outgoing bitrate (in bps). [WebRtcTransportOptions](https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions)',
				format  : 'nat',
				default : 1000000
			},
			maxIncomingBitrate : {
				doc     : 'The Mediasoup maximum incoming bitrate for each transport. (in bps). [setMaxIncomingBitrate](https://mediasoup.org/documentation/v3/mediasoup/api/#transport-setMaxIncomingBitrate)',
				format  : 'nat',
				default : 1500000
			}
		}
	},
	// Prometheus exporter
	prometheus : {
		deidentify : {
			doc     : 'De-identify IP addresses in Prometheus logs.',
			format  : 'Boolean',
			default : false
		},
		listen : {
			doc     : 'Prometheus exporter listening address.',
			format  : 'String',
			default : 'localhost'
		},
		numeric : {
			doc     : 'Show numeric IP addresses in Prometheus logs.',
			format  : 'Boolean',
			default : false
		},
		port : {
			doc     : 'The Prometheus exporter listening port.',
			format  : 'port',
			default : 8889
		},
		quiet : {
			doc     : 'Include fewer labels in Prometheus logs.',
			format  : 'Boolean',
			default : false
		},
		// aggregated metrics options
		period : {
			doc     : 'The Prometheus exporter update period (seconds).',
			format  : 'nat',
			default : 15
		},
		secret : {
			doc     : 'The Prometheus exporter authorization header: `Bearer <secret>` required to allow scraping.',
			format  : String,
			default : null
		}
	}
});

/**
 * Formats the schema documentation, calling the same function recursively.
 * @param docs the documentation object to extend
 * @param property the root property
 * @param schema the config schema fragment
 * @returns the documentation object
 */
function formatDocs(docs: any, property: string | null, schema: any)
{
	if (schema._cvtProperties)
	{
		Object.entries(schema._cvtProperties).forEach(([ name, value ]) =>
		{
			formatDocs(docs, `${property ? `${property}.` : ''}${name}`, value);
		});

		return docs;
	}

	if (property)
	{
		docs[property] = // eslint-disable-line no-param-reassign
		{
			doc     : schema.doc,
			format  : JSON.stringify(schema.format, null, 2),
			default : JSON.stringify(schema.default, null, 2)
		};
	}

	return docs;
}

// format docs
const configDocs = formatDocs({}, null, configSchema.getSchema());

let config: any = {};
let configError = '';
let configLoaded = false;

// Load config from window object
for (const format of [ 'json', 'json5', 'yaml', 'yml', 'toml' ]) // eslint-disable-line no-restricted-syntax
{
	const filepath = `./config/config.${format}`;

	if (fs.existsSync(filepath))
	{
		try
		{
			logger.debug(`Loading config from ${filepath}`);
			configSchema.loadFile(filepath);
			configLoaded = true;
			break;
		}
		catch (err)
		{
			logger.debug(`Loading config from ${filepath} failed: ${err.message}`);
		}
	}
}

if (!configLoaded)
{
	logger.warn('No config file found, using defaults.');
	configSchema.load({});
}

// Perform validation
try
{
	configSchema.validate({ allowed: 'strict' });
	config = configSchema.getProperties();
}
catch (error: any)
{
	configError = error.message;
}

// load additional config module (no validation is performed)
if (fs.existsSync(`${__dirname}/../config/config.js`))
{
	try
	{
		const configModule = require('../config/config.js'); // eslint-disable-line @typescript-eslint/no-var-requires

		Object.assign(config, configModule);
	}
	catch (err)
	{
		logger.error(`Error loading ${config.configFile} module: ${err.message}`);
	}
}

// eslint-disable-next-line
logger.info('Using config:', config);

//
export {
	configSchema,
	config,
	configError,
	configDocs
};

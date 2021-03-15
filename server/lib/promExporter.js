const express = require('express');
const mediasoup = require('mediasoup');
const promClient = require('prom-client');

const Logger = require('./Logger');
const collectDefaultMetrics = require('./metrics/default');
const RegisterAggregated = require('./metrics/aggregated');

const logger = new Logger('promClient');
const workers = new Map();

module.exports = async function(rooms, peers, config)
{
	try
	{
		logger.debug(`config.deidentify=${config.deidentify}`);
		logger.debug(`config.listen=${config.listen}`);
		logger.debug(`config.numeric=${config.numeric}`);
		logger.debug(`config.port=${config.port}`);
		logger.debug(`config.quiet=${config.quiet}`);

		mediasoup.observer.on('newworker', (worker) =>
		{
			logger.debug(`observing newworker ${worker.pid} #${workers.size}`);
			workers.set(worker.pid, worker);
			worker.observer.on('close', () =>
			{
				logger.debug(`observing close worker ${worker.pid} #${workers.size - 1}`);
				workers.delete(worker.pid);
			});
		});

		const app = express();

		// default register
		app.get('/', async (req, res) =>
		{
			logger.debug(`GET ${req.originalUrl}`);
			const registry = new promClient.Registry();

			await collectDefaultMetrics(workers, registry, config);
			res.set('Content-Type', registry.contentType);
			const data = await registry.metrics();

			res.end(data);
		});

		// aggregated register
		const registerAggregated = RegisterAggregated(workers, config);

		app.get('/metrics', async (req, res) =>
		{
			logger.debug(`GET ${req.originalUrl}`);
		
			res.set('Content-Type', registerAggregated.contentType);
			const data = await registerAggregated.metrics();

			res.end(data);
		});

		const server = app.listen(config.port || 8889,
			config.listen || undefined, () =>
			{
				const address = server.address();

				logger.info(`listening ${address.address}:${address.port}`);
			});
	}
	catch (err)
	{
		logger.error(err);
	}
};

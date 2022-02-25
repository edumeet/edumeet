import Logger from '../logger/Logger';

const express = require('express');
const promClient = require('prom-client');

const collectDefaultMetrics = require('../stats/metrics/default');
const RegisterAggregated = require('../stats/metrics/aggregated');

const logger = new Logger('promClient');

import { config } from '../config/config';

module.exports = async function(workers, rooms, peers)
{
	try
	{
		logger.debug(`config.prometheus.deidentify=${config.prometheus.deidentify}`);
		logger.debug(`config.prometheus.listen=${config.prometheus.listen}`);
		logger.debug(`config.prometheus.numeric=${config.prometheus.numeric}`);
		logger.debug(`config.prometheus.port=${config.prometheus.port}`);
		logger.debug(`config.prometheus.quiet=${config.prometheus.quiet}`);

		const app = express();

		// default register
		app.get('/', async (req, res) =>
		{
			logger.debug(`GET ${req.originalUrl}`);
			const registry = new promClient.Registry();

			await collectDefaultMetrics(
				workers, rooms, peers, registry, config.prometheus);
			res.set('Content-Type', registry.contentType);
			const data = await registry.metrics();

			res.end(data);
		});

		// aggregated register
		const registerAggregated = RegisterAggregated(
			workers, rooms, peers, config.prometheus);

		app.get('/metrics', async (req, res) =>
		{
			logger.debug(`GET ${req.originalUrl}`);

			if (config.prometheus.secret
				&& req.headers.authorization !== `Bearer ${ config.prometheus.secret}`)
			{
				logger.error('Invalid authorization header');

				return res.status(401).end();
			}

			res.set('Content-Type', registerAggregated.contentType);
			const data = await registerAggregated.metrics();

			res.end(data);
		});

		const server = app.listen(config.prometheus.port, config.prometheus.listen, () =>
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

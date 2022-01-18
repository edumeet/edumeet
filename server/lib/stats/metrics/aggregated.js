import Logger from '../../logger/Logger';

const promClient = require('prom-client');
const pidusage = require('pidusage');
const Stats = require('fast-stats').Stats;

const logger = new Logger('metrics:aggregated');

//
module.exports = function(workers, rooms_, peers_, config)
{
	const register = new promClient.Registry();

	promClient.collectDefaultMetrics({ prefix: 'mediasoup_', register });

	const mediasoupStats = {};
	let mediasoupStatsUpdate = 0;

	const formatStats = (s) =>
	{
		return {
			length : s.length || 0,
			sum    : s.sum || 0,
			mean   : s.amean() || 0,
			stddev : s.stddev() || 0,
			p25    : s.percentile(25) || 0,
			min    : s.min || 0,
			max    : s.max || 0
		};
	};

	const collectStats = async () =>
	{
		const now = Date.now();

		if (now - mediasoupStatsUpdate < config.period * 1000)
		{
			return;
		}
		mediasoupStatsUpdate = now;

		const start = process.hrtime();

		const workersCpu = new Stats();
		const workersMemory = new Stats();

		const rooms = new Stats();

		rooms.push(rooms_.size);

		const peers = new Stats();

		peers.push(peers_.size);

		// in
		const videoBitratesIn = new Stats();
		const audioBitratesIn = new Stats();
		const videoScoresIn = new Stats();
		const audioScoresIn = new Stats();

		const packetsCountsIn = new Stats();
		const packetsLostsIn = new Stats();
		const packetsRetransmittedIn = new Stats();

		// out
		const videoBitratesOut = new Stats();
		const audioBitratesOut = new Stats();

		const roundTripTimesOut = new Stats();
		const packetsCountsOut = new Stats();
		const packetsLostsOut = new Stats();

		const spatialLayersOut = new Stats();
		const temporalLayersOut = new Stats();

		try
		{
			// iterate workers
			for (const worker of workers.values())
			{
				// worker process stats
				const workerStats = await pidusage(worker.pid);

				workersCpu.push(workerStats.cpu / 100);
				workersMemory.push(workerStats.memory);

				// iterate producers
				for (const producer of worker.appData.producers.values())
				{
					let stats = [];

					try
					{
						stats = await producer.getStats();
					}
					catch (err)
					{
						logger.error('producer.getStats error:', err.message);
						continue;
					}
					for (const s of stats)
					{
						if (s.type !== 'inbound-rtp')
						{
							continue;
						}
						if (s.kind === 'video')
						{
							videoBitratesIn.push(s.bitrate);
							videoScoresIn.push(s.score);
						}
						else if (s.kind === 'audio')
						{
							audioBitratesIn.push(s.bitrate);
							audioScoresIn.push(s.score);
						}
						packetsCountsIn.push(s.packetCount || 0);
						packetsLostsIn.push(s.packetsLost || 0);
						packetsRetransmittedIn.push(s.packetsRetransmitted || 0);
					}
				}

				// iterate consumers
				for (const consumer of worker.appData.consumers.values())
				{
					if (consumer.type === 'pipe')
					{
						continue;
					}
					let stats = [];

					try
					{
						stats = await consumer.getStats();
					}
					catch (err)
					{
						logger.error('consumer.getStats error:', err.message);
						continue;
					}
					for (const s of stats)
					{
						if (s.type !== 'outbound-rtp')
						{
							continue;
						}
						if (s.kind === 'video')
						{
							videoBitratesOut.push(s.bitrate || 0);
							spatialLayersOut.push(consumer.currentLayers
								? consumer.currentLayers.spatialLayer : 0);
							temporalLayersOut.push(consumer.currentLayers
								? consumer.currentLayers.temporalLayer : 0);
						}
						else if (s.kind === 'audio')
						{
							audioBitratesOut.push(s.bitrate || 0);
						}
						roundTripTimesOut.push(s.roundTripTime || 0);
						packetsCountsOut.push(s.packetCount || 0);
						packetsLostsOut.push(s.packetsLost || 0);
					}
				}
			}
		}
		catch (err)
		{
			logger.error('collectStats error:', err.message);
		}
		finally
		{
			Object.assign(mediasoupStats, {
				workersCpu             : formatStats(workersCpu),
				workersMemory          : formatStats(workersMemory),
				rooms                  : formatStats(rooms),
				peers                  : formatStats(peers),
				// in
				videoBitratesIn        : formatStats(videoBitratesIn),
				videoScoresIn          : formatStats(videoScoresIn),
				audioBitratesIn        : formatStats(audioBitratesIn),
				audioScoresIn          : formatStats(audioScoresIn),
				packetsCountsIn        : formatStats(packetsCountsIn),
				packetsLostsIn         : formatStats(packetsLostsIn),
				packetsRetransmittedIn : formatStats(packetsRetransmittedIn),
				// out
				videoBitratesOut       : formatStats(videoBitratesOut),
				audioBitratesOut       : formatStats(audioBitratesOut),
				roundTripTimesOut      : formatStats(roundTripTimesOut),
				packetsCountsOut       : formatStats(packetsCountsOut),
				packetsLostsOut        : formatStats(packetsLostsOut),
				spatialLayersOut       : formatStats(spatialLayersOut),
				temporalLayersOut      : formatStats(temporalLayersOut)
			});
		}

		const end = process.hrtime(start);

		logger.info(`collectStats (elapsed: ${(end[0] * 1e3) + (end[1] * 1e-6)} ms)`);
	};

	// mediasoup metrics
	[
		{ name: 'workers_count', statName: 'workersCpu', statValue: 'length' },
		{ name: 'workers_cpu', statName: 'workersCpu', statValue: 'sum' },
		{ name: 'workers_memory', statName: 'workersMemory', statValue: 'sum' },
		//
		{ name: 'rooms', statName: 'rooms', statValue: 'sum' },
		{ name: 'peers', statName: 'peers', statValue: 'sum' },
		// audio in
		{ name: 'audio_in_count', statName: 'audioBitratesIn', statValue: 'length' },
		// audio in bitrates
		{ name: 'audio_bitrates_in_sum', statName: 'audioBitratesIn', statValue: 'sum' },
		{ name: 'audio_bitrates_in_mean', statName: 'audioBitratesIn', statValue: 'mean' },
		{ name: 'audio_bitrates_in_min', statName: 'audioBitratesIn', statValue: 'min' },
		{ name: 'audio_bitrates_in_max', statName: 'audioBitratesIn', statValue: 'max' },
		{ name: 'audio_bitrates_in_p25', statName: 'audioBitratesIn', statValue: 'p25' },
		// audio in scores
		{ name: 'audio_scores_in_mean', statName: 'audioScoresIn', statValue: 'mean' },
		{ name: 'audio_scores_in_min', statName: 'audioScoresIn', statValue: 'min' },
		{ name: 'audio_scores_in_max', statName: 'audioScoresIn', statValue: 'max' },
		{ name: 'audio_scores_in_p25', statName: 'audioScoresIn', statValue: 'p25' },
		// video in
		{ name: 'video_in_count', statName: 'videoBitratesIn', statValue: 'length' },
		// video in bitrates
		{ name: 'video_bitrates_in_sum', statName: 'videoBitratesIn', statValue: 'sum' },
		{ name: 'video_bitrates_in_mean', statName: 'videoBitratesIn', statValue: 'mean' },
		{ name: 'video_bitrates_in_min', statName: 'videoBitratesIn', statValue: 'min' },
		{ name: 'video_bitrates_in_max', statName: 'videoBitratesIn', statValue: 'max' },
		{ name: 'video_bitrates_in_p25', statName: 'videoBitratesIn', statValue: 'p25' },
		// video in scores
		{ name: 'video_scores_in_mean', statName: 'videoScoresIn', statValue: 'mean' },
		{ name: 'video_scores_in_min', statName: 'videoScoresIn', statValue: 'min' },
		{ name: 'video_scores_in_max', statName: 'videoScoresIn', statValue: 'max' },
		{ name: 'video_scores_in_p25', statName: 'videoScoresIn', statValue: 'p25' },
		// packets in
		{ name: 'packets_counts_in_sum', statName: 'packetsCountsIn', statValue: 'sum' },
		{ name: 'packets_counts_in_mean', statName: 'packetsCountsIn', statValue: 'mean' },
		{ name: 'packets_counts_in_min', statName: 'packetsCountsIn', statValue: 'min' },
		{ name: 'packets_counts_in_max', statName: 'packetsCountsIn', statValue: 'max' },
		{ name: 'packets_counts_in_p25', statName: 'packetsCountsIn', statValue: 'p25' },
		{ name: 'packets_losts_in_sum', statName: 'packetsLostsIn', statValue: 'sum' },
		{ name: 'packets_losts_in_mean', statName: 'packetsLostsIn', statValue: 'mean' },
		{ name: 'packets_losts_in_min', statName: 'packetsLostsIn', statValue: 'min' },
		{ name: 'packets_losts_in_max', statName: 'packetsLostsIn', statValue: 'max' },
		{ name: 'packets_losts_in_p25', statName: 'packetsLostsIn', statValue: 'p25' },
		{ name: 'packets_retransmitted_in_sum', statName: 'packetsRetransmittedIn', statValue: 'sum' },
		{ name: 'packets_retransmitted_in_mean', statName: 'packetsRetransmittedIn', statValue: 'mean' },
		{ name: 'packets_retransmitted_in_min', statName: 'packetsRetransmittedIn', statValue: 'min' },
		{ name: 'packets_retransmitted_in_max', statName: 'packetsRetransmittedIn', statValue: 'max' },
		{ name: 'packets_retransmitted_in_p25', statName: 'packetsRetransmittedIn', statValue: 'p25' },
		// audio out
		{ name: 'audio_out_count', statName: 'audioBitratesOut', statValue: 'length' },
		{ name: 'audio_bitrates_out_sum', statName: 'audioBitratesOut', statValue: 'sum' },
		{ name: 'audio_bitrates_out_mean', statName: 'audioBitratesOut', statValue: 'mean' },
		{ name: 'audio_bitrates_out_min', statName: 'audioBitratesOut', statValue: 'min' },
		{ name: 'audio_bitrates_out_max', statName: 'audioBitratesOut', statValue: 'max' },
		{ name: 'audio_bitrates_out_p25', statName: 'audioBitratesOut', statValue: 'p25' },
		// video out
		{ name: 'video_out_count', statName: 'videoBitratesOut', statValue: 'length' },
		{ name: 'video_bitrates_out_sum', statName: 'videoBitratesOut', statValue: 'sum' },
		{ name: 'video_bitrates_out_mean', statName: 'videoBitratesOut', statValue: 'mean' },
		{ name: 'video_bitrates_out_min', statName: 'videoBitratesOut', statValue: 'min' },
		{ name: 'video_bitrates_out_max', statName: 'videoBitratesOut', statValue: 'max' },
		{ name: 'video_bitrates_out_p25', statName: 'videoBitratesOut', statValue: 'p25' },
		// sl
		{ name: 'spatial_layers_out_mean', statName: 'spatialLayersOut', statValue: 'mean' },
		{ name: 'spatial_layers_out_min', statName: 'spatialLayersOut', statValue: 'min' },
		{ name: 'spatial_layers_out_max', statName: 'spatialLayersOut', statValue: 'max' },
		{ name: 'spatial_layers_out_p25', statName: 'spatialLayersOut', statValue: 'p25' },
		// tl
		{ name: 'temporal_layers_out_mean', statName: 'temporalLayersOut', statValue: 'mean' },
		{ name: 'temporal_layers_out_min', statName: 'temporalLayersOut', statValue: 'min' },
		{ name: 'temporal_layers_out_max', statName: 'temporalLayersOut', statValue: 'max' },
		{ name: 'temporal_layers_out_p25', statName: 'temporalLayersOut', statValue: 'p25' },
		// rtt out
		{ name: 'round_trip_times_out_mean', statName: 'roundTripTimesOut', statValue: 'mean' },
		{ name: 'round_trip_times_out_min', statName: 'roundTripTimesOut', statValue: 'min' },
		{ name: 'round_trip_times_out_max', statName: 'roundTripTimesOut', statValue: 'max' },
		{ name: 'round_trip_times_out_p25', statName: 'roundTripTimesOut', statValue: 'p25' }

	].forEach(({ name, statName, statValue }) =>
	{
		// eslint-disable-next-line no-new
		new promClient.Gauge({
			name       : `mediasoup_${name}`,
			help       : `MediaSoup ${name}`,
			labelNames : [],
			registers  : [ register ],
			async collect()
			{
				await collectStats();
				if (mediasoupStats[statName] !== undefined
					&& mediasoupStats[statName][statValue] !== undefined)
				{
					this.set({}, mediasoupStats[statName][statValue]);
				}
				else
				{
					logger.warn(`${statName}.${statValue} not found`);
				}
			}
		});
	});

	return register;
};

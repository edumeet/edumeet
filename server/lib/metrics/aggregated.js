const promClient = require('prom-client');
const pidusage = require('pidusage');
const Stats = require('fast-stats').Stats;

const Logger = require('../Logger');

const logger = new Logger('metrics:aggregated');

//
module.exports = function(workers, config)
{
    const register = new promClient.Registry();
    promClient.collectDefaultMetrics({ prefix: 'mediasoup_', register });
    
    const mediasoupStats = {};

    const formatStats = (s) =>
    {
        return {
            length: s.length || 0,
            sum:    s.sum || 0,
            mean:   s.amean() || 0,
            stddev: s.stddev() || 0,
            p25:    s.percentile(25) || 0,
            min:    s.min || 0,
            max:    s.max || 0,
        };
    };

    const collectStats = async () =>
    {
        logger.info('collectStats');

        let workers_cpu = new Stats();
        let workers_memory = new Stats();

        let video_bitrates_in = new Stats();
        let video_bitrates_out = new Stats();

        let audio_bitrates_in = new Stats();
        let audio_bitrates_out = new Stats();

        let packets_counts_in = new Stats();
        let packets_losts_in = new Stats();

        let round_trip_times_out = new Stats();
        let packets_counts_out = new Stats();
        let packets_losts_out = new Stats();

        let spatial_layers_out = new Stats();
        let temporal_layers_out = new Stats();

        try {
            // iterate workers
            for (const worker of workers.values())
            {
                // worker process stats
                const workerStats = await pidusage(worker._pid);
                workers_cpu.push(workerStats.cpu / 100);
                workers_memory.push(workerStats.memory);
                
                // iterate routers
                for (const router of worker._routers.values())
                {
                    // iterate transports
                    for (const transport of router._transports.values())
                    {
                        /* let stats = [];
                        try
                        {
                            stats = await transport.getStats();
                        }
                        catch(err)
                        {
                            logger.error('transport.getStats error:', err.message);
                            continue;
                        }
                        for (const s of stats)
                        {
                            if (s.type !== 'webrtc-transport'){
                                continue;
                            }
                        } */

                        // iterate producers
                        for (const producer of transport._producers.values())
                        {
                            let stats = [];
                            try
                            {
                                stats = await producer.getStats();
                            }
                            catch(err)
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
                                    video_bitrates_in.push(s.bitrate);
                                }
                                else if (s.kind === 'audio')
                                {
                                    audio_bitrates_in.push(s.bitrate);
                                }
                                packets_counts_in.push(s.packetCount || 0);
                                packets_losts_in.push(s.packetsLost || 0);
                            }
                        }

                        // iterate consumers
                        for (const consumer of transport._consumers.values())
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
                            catch(err)
                            {
                                logger.error('consumer.getStats error:', err.message);
                                continue;
                            }
                            for (const s of stats)
                            {
                                if(s.type !== 'outbound-rtp'){
                                    continue;
                                }
                                if (s.kind === 'video')
                                {
                                    video_bitrates_out.push(s.bitrate || 0);
                                    spatial_layers_out.push(consumer.currentLayers ? consumer.currentLayers.spatialLayer : 0);
                                    temporal_layers_out.push(consumer.currentLayers ? consumer.currentLayers.temporalLayer : 0);
                                }
                                else if(s.kind === 'audio')
                                {
                                    audio_bitrates_out.push(s.bitrate || 0);
                                }
                                round_trip_times_out.push(s.roundTripTime || 0);
                                packets_counts_out.push(s.packetCount || 0);
                                packets_losts_out.push(s.packetsLost || 0);
                            }
                        }
                    }
                }
            }

            Object.assign(mediasoupStats, {
                workers_cpu:            formatStats(workers_cpu),
                workers_memory:         formatStats(workers_memory),
                video_bitrates_in:      formatStats(video_bitrates_in),
                video_bitrates_out:     formatStats(video_bitrates_out),
                audio_bitrates_in:      formatStats(audio_bitrates_in),
                audio_bitrates_out:     formatStats(audio_bitrates_out),
                round_trip_times_out:   formatStats(round_trip_times_out),
                packets_counts_in:      formatStats(packets_counts_in),
                packets_losts_in:       formatStats(packets_losts_in),
                packets_counts_out:     formatStats(packets_counts_out),
                packets_losts_out:      formatStats(packets_losts_out),
                spatial_layers_out:     formatStats(spatial_layers_out),
                temporal_layers_out:    formatStats(temporal_layers_out),
            });

        }
        catch(err)
        {
            logger.error('collectStats error:', err.message);
        }

        setTimeout(collectStats, config.period * 1000);
    }

    collectStats();

    // mediasoup metrics
    [
        { name: 'workers_cpu',                statName: 'workers_cpu',           statValue: 'sum' },
        { name: 'workers_memory',             statName: 'workers_memory',        statValue: 'sum' },

        { name: 'audio_in_count',             statName: 'audio_bitrates_in',     statValue: 'length' },
        { name: 'audio_bitrates_in_sum',      statName: 'audio_bitrates_in',     statValue: 'sum' },
        { name: 'audio_bitrates_in_mean',     statName: 'audio_bitrates_in',     statValue: 'mean' },
        { name: 'audio_bitrates_in_min',      statName: 'audio_bitrates_in',     statValue: 'min' },
        { name: 'audio_bitrates_in_max',      statName: 'audio_bitrates_in',     statValue: 'max' },
        { name: 'audio_bitrates_in_p25',      statName: 'audio_bitrates_in',     statValue: 'p25' },

        { name: 'video_in_count',             statName: 'video_bitrates_in',     statValue: 'length' },
        { name: 'video_bitrates_in_sum',      statName: 'video_bitrates_in',     statValue: 'sum' },
        { name: 'video_bitrates_in_mean',     statName: 'video_bitrates_in',     statValue: 'mean' },
        { name: 'video_bitrates_in_min',      statName: 'video_bitrates_in',     statValue: 'min' },
        { name: 'video_bitrates_in_max',      statName: 'video_bitrates_in',     statValue: 'max' },
        { name: 'video_bitrates_in_p25',      statName: 'video_bitrates_in',     statValue: 'p25' },
        
        { name: 'audio_out_count',            statName: 'audio_bitrates_out',    statValue: 'length' },
        { name: 'audio_bitrates_out_sum',     statName: 'audio_bitrates_out',    statValue: 'sum' },
        { name: 'audio_bitrates_out_mean',    statName: 'audio_bitrates_out',    statValue: 'mean' },
        { name: 'audio_bitrates_out_min',     statName: 'audio_bitrates_out',    statValue: 'min' },
        { name: 'audio_bitrates_out_max',     statName: 'audio_bitrates_out',    statValue: 'max' },
        { name: 'audio_bitrates_out_p25',     statName: 'audio_bitrates_out',    statValue: 'p25' },

        { name: 'video_out_count',            statName: 'video_bitrates_out',    statValue: 'length' },
        { name: 'video_bitrates_out_sum',     statName: 'video_bitrates_out',    statValue: 'sum' },
        { name: 'video_bitrates_out_mean',    statName: 'video_bitrates_out',    statValue: 'mean' },
        { name: 'video_bitrates_out_min',     statName: 'video_bitrates_out',    statValue: 'min' },
        { name: 'video_bitrates_out_max',     statName: 'video_bitrates_out',    statValue: 'max' },
        { name: 'video_bitrates_out_p25',     statName: 'video_bitrates_out',    statValue: 'p25' },

        { name: 'spatial_layers_out_mean',    statName: 'spatial_layers_out',    statValue: 'mean' },
        { name: 'spatial_layers_out_min',     statName: 'spatial_layers_out',    statValue: 'min' },
        { name: 'spatial_layers_out_max',     statName: 'spatial_layers_out',    statValue: 'max' },
        { name: 'spatial_layers_out_p25',     statName: 'spatial_layers_out',    statValue: 'p25' },

        { name: 'temporal_layers_out_mean',   statName: 'temporal_layers_out',   statValue: 'mean' },
        { name: 'temporal_layers_out_min',    statName: 'temporal_layers_out',   statValue: 'min' },
        { name: 'temporal_layers_out_max',    statName: 'temporal_layers_out',   statValue: 'max' },
        { name: 'temporal_layers_out_p25',    statName: 'temporal_layers_out',   statValue: 'p25' },

        { name: 'round_trip_times_out_mean',  statName: 'round_trip_times_out',  statValue: 'mean' },
        { name: 'round_trip_times_out_min',   statName: 'round_trip_times_out',  statValue: 'min' },
        { name: 'round_trip_times_out_max',   statName: 'round_trip_times_out',  statValue: 'max' },
        { name: 'round_trip_times_out_p25',   statName: 'round_trip_times_out',  statValue: 'p25' },

    ].forEach(({ name, statName, statValue }) => {
        new promClient.Gauge({
            name: `mediasoup_${name}`,
            help: `MediaSoup ${name}`,
            labelNames: [],
            registers: [ register ],
            collect()
            {
                this.set({}, mediasoupStats[statName][statValue]);
            }
        });
    });

    return register;
}

# Scaling and recommended Hardware
## Recommended hardware for running mm per node
* MM scales by threads so more cores are better
* 8GB RAM is enough
* Disk space is not so important - 10GB is a good start - but logs can get huge :) 
* 1GB/s network adapter better with 2 or more ports + bonding
* If you have more than 1 network interface + public IPs TURN server can run on same machine but we recommend extra TURN server or use a distributed TURN service
* 1 TURN server / 4 eduMEET servers (TURN server can have fewer CPUs / cores)

## Network
The bandwidth requirements are quite tunable both on client and server, but server downstream to clients bandwidth will be one of the largest constraints on the system. If you have 1Gbit on your nodes, the number of users should not exceed ~600 per server node, and this can be run without a problem on a modern 8 core server. If you have higher bandwidth per node, the numbers can be scaled up linearly (2Gbit/16core/1200 users). Note that this is concurrent users, so if you anticipate ~10000 concurrent users, scale it according to these numbers. Real number of concurrent users depends on typical size of rooms(bigger is better), lastN config (lower is better), maxIncomingBitrate config (lower is better), use of simulcast. 

## Example calculation
### 1 Server
* 4 cores - 8 threads: 
* 8 x 500 = 4000 consumers  / server node
* Bandwidth: (2000 audio consumers x 50Kbps + 2000 video consumers x 400Kbps (low quality- 320x240 vp8) 
= 100 Mbps + 800 Mbps = 900 Mbps
* 1 Gbit/s connection should be enough for low quality
* For higher quality video you need **more** than 1Gbit/s
* Additional servers will scale to 4000 consumers x number of server nodes
* Not enough network bandwidth will reduce video-quality automatically

### Consumer:
* Def.: Streams that are consumed by participants
* Former limitation (500 consumers per room) is not there anymore
* Example 1(refering to example server from above): lastN=1: max 2000 students can consume audio + video stream from 1 lecturer (2 streams x 2000 students = 4000 consumers) 
* Example 2(refering to example server from above): lastN=5: Rooms with 6 users each: 6 users x 5 remote users x 2 consumers = 60 consumers per room; 500 (consumers/thread) / 60 (consumers/room) = around 8 rooms / thread => around 50 concurrent users per thread --> 400 concurrent users per server 
* Example 3(refering to example server from above): lastN=5: 1 one big room 4000 [consumer] / 10 [consumer/participant] = 400 [participant] That's the maximum number of participants per server for lastN=5 in one big room. 
* Example 3(refering to example server from above): lastN=25: 1 one big room 4000 [consumer] / 50 [consumer/participant] = 80 [participant] That's the maximum number of participants per server for lastN=25 in one single big room


### Bandwidth:
* Configurable: maxIncomingBitrate per participant in server config
* Low video bandwidth is around 160Kbps (240p-vp8)
* Typical acceptable good video bandwidth is around (800-1000)Kbps (720p)
* Possibility to activate Simulcast / SVC to provide different clients with different bandwidths
## Scaling
You can setup more than 1 server with same configuration and load balance with [HAproxy.md](HAproxy.md)
This will scale linearly.

### Limitations / work in progress / ToDo
You can fine tune max number of active streams in same room by setting lastN parameter in server/config/config.js - this is then globally for whole server installation. Clients can override this in advanced settings locally.

There is heavy development for separating signal/control part from media part (branch **[feat-media-node](https://github.com/edumeet/edumeet/tree/feat-media-node)** ) when this is ready you can fire up several media nodes completely separated from signal/control. For multi-tenant you can install one server node (or more for redundancy) per tenant with separate configurations/domains and share all media nodes across tenants. One room can then spread over several media nodes so max number of participants is limited only by size of your infrastructure.

Right now simulcast is supported and we are working on using bandwidth more effectively. Small video windows don't need high quality video streams so we should switch to lower quality streams according to video container sizes on screen. This could enable for much higher number of lastN.

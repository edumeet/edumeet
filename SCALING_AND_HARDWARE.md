# Scaling and recommended Hardware
## Recommended hardware for running
EduMEET consist of several components. The most important in context of scaling and performance are the edumeet-media-nodes and edumeet-room-server components. In generell eduMEET can run comletely on one machine but for scaling and performance reasons it is recommended to run the components on different machines.
For deployment on 1 machine:
* EduMEET scales by threads so more cores are better - 8 cores is a good start.
* 16GB RAM is recommended
* Disk space is not so important - 20GB is a good start - but logs can get huge :) 
* 1Gbit/s network adapter or BETTER
Such a machine can handle around 400 concurrent participants.


## Scaling edumeet-media-nodes: ( numbers are not final yet )
This is the most important component for scaling. 
* Network: Calculate 300 concurrent participants per 1Gbit/s bandwidth
* CPU: 1 core per around 200 concurrent participants 
* RAM: 4GB + 1GB per 200 concurrent participants
* Disk: 20GB

## Scaling edumeet-room-server: ( numbers are not final yet )
* CPU: min 2 cores (room-server does not really scale by core - so if you hit there limits its a good idea to setup more instances of room-server, look into [docs/HAproxy-room-server.md]
* RAM: 8GB + 1GB per 4000 concurrent participants
* Loadbalancer: sticky sessions (look into [docs/HAproxy-room-server.md])
* Disk: 20GB

## Scaling management-server
* CPU: 2 cores
* RAM: 4GB
* Disk: 20GB
* Database: 1GB per 1000 concurrent participants

## Static content delivery server
* CPU: 2 cores
* RAM: 4GB
* Disk: 20GB
* Network: 1Gbit/s

## Example setup
* 1x management-server
* 1x static content delivery server
* 1x room-server
* 1x database
* 1x TURN server
* 1x loadbalancer

## Network
The bandwidth requirements are quite tunable both on client and server, but media-node DOWNSTREAM to clients bandwidth will be one of the largest constraints on the architrcture. In praxis number of concurrent users depends on 
* typical size of rooms(bigger rooms are usually more efficient),
* lastN config (lower is better),
* maxIncomingBitrate config (lower is better), 
* use of simulcast. 
lastN, maxIncomingBitrate and simulcast are part of individual room configuration in the management-server or can be configured globally in room-server config file. 


## Example calculation
### 1 Server
* 4 cores - 8 threads: 8 x 400 = 3200 concurrent consumers-streams ( 1 participant consumes typically 1 audiostream + x video-streams depending on lastN settings )
* MINIMUM 1 Gbit/s connection is a good start. Calculate around 2-3 Mbit/s downstream (from server to client) per participant (1 Gbit/s / 2 Mbit/s = 500 participants)
* For higher quality video or more participants you need **more** than 1 Gbit/s
* Not enough network bandwidth will reduce video-quality (increasing latency, jitter and packet loss and reduce user experience)


### Bandwidth:
* Configurable: maxIncomingBitrate per participant in management-server
* Low video bandwidth is around 160Kbps (240p-vp8) (This is the lowest video quality that is acceptable? for a videoconference)
* Typical acceptable video bandwidth is around (800-1000)Kbps (720p)
* Typical bandwidth for a very good experience is around 2000Kbps (1080p)

## Scaling
### Scaling with docker-compose
Scaling is done by:
- adding additionally medianodes
- scaling up database for the management-server
- scale up (static content delivery server) by loadbalancing

Potential bottleneck is the room-server component which will be scalable in the future as well.


### Limitations / work in progress / ToDo
* Currently there is no loadbalancing for the management-server component


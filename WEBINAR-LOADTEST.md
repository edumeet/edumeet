# eduMEET webinar — load & scaling test results

> Validation artifact for NLnet project **2024-10-244 "Federated webinars for eduMEET"**, milestone
> *3a — Federated webinar scenarios tested*. See [WEBINAR.md](WEBINAR.md) for the architecture this
> validates.

## 1. Test setup

| Item | Value |
| --- | --- |
| Test date | **2 June 2026** (released in `4.2-20260619-stable`) |
| Concurrent clients | **512 headless browsers** |
| Active senders | **10**: 1 presenter (screen share) + 9 panelists (webcam + microphone) |
| View-only audience | **~502** (no webcam/mic/screen permission — view-only default role) |
| Media nodes | **6, geographically distributed**: Poland ×2, Finland, Portugal, Germany, Denmark |
| Routing | Standard geo + load routing — each client served by its nearest/least-loaded node |
| Video codec | **VP8 simulcast** (client default profiles) |

This is the canonical webinar traffic shape: **a handful of senders, a large view-only audience.** The
~502 audience browsers send no media at all (they hold the view-only *Webinar Participant* role, so
`permittedProducer` blocks any upstream); all upstream media comes from the 10-person panel.

## 2. Per-stream configuration

Encoding profiles:
[`encodingsHandler.tsx`](https://github.com/edumeet/edumeet-client/blob/main/src/utils/encodingsHandler.tsx);
defaults (`resolution: 'medium'`, `screenSharingResolution: 'veryhigh'`, `screenSharingFrameRate: 5`,
audio preset `conference`):
[`config.example.js`](https://github.com/edumeet/edumeet-client/blob/main/public/config/config.example.js).

| Stream | Resolution | VP8 simulcast layers (`maxBitrate`) |
| --- | --- | --- |
| Panelist webcam | `medium` = 640 | 320@150 kbps + 640@500 kbps |
| Presenter screen | `veryhigh` = 1920 @5 fps | 320@150 + 640@500 + 1920@3500 kbps |
| Audio (Opus, `conference`) | 48 kHz mono, FEC | — |

## 3. Results

### 3.1 Upstream ingest (10-person panel → media nodes)

| Metric | Measured |
| --- | --- |
| Total upstream into the system | **8.274 Mbps** |
| Presenter screen-share bitrate (sustained) | **1.571 Mbps** |
| Per-panelist webcam bitrate (all simulcast layers) | **640 kbps** |
| Per-stream audio bitrate | **94.21 kbps** |

Total upstream is fixed by the panel size and does not grow with the audience.

### 3.2 Downstream egress (nodes → ~502 view-only audience)

| Metric | Measured |
| --- | --- |
| Per-viewer downstream (presenter + 9 panel videos + audio) | **3.21 Mbps** |
| Total system egress | **1.57 Gbps** |
| Peak per-node egress (~84 viewers/node) | **294 Mbps** |
| Peak per-node CPU, 6 nodes (normalized to 8 cores) | **8.71%** |
| Peak per-node memory, 6 nodes | **1.7 GB** |

> **Distribution benefit.** Serving the same webinar from a single node would require **54%** CPU
> (normalized to 8 cores) and **3.8 GB** memory; spreading it across the 6-node pool drops per-node load to
> **8.71%** CPU and **1.7 GB**. (Nodes had differing core counts, so CPU is normalized to 8 cores.)

### 3.3 Inter-node bridging (pipe transports across the 6 nodes)

| Metric | Measured |
| --- | --- |
| Inbound pipe traffic per node | **7.4 Mbps** |
| Total mesh pipe traffic across all nodes | **41 Mbps** |

Inter-node bridging is bounded by panel size, not audience size.

### 3.4 Client experience

| Metric | Measured |
| --- | --- |
| Clients successfully joined | **512 / 512** |
| Median join time | **2.7 s** |
| Median end-to-end latency | **328 ms** |
| Cross-country latency, worst case (Finland → Portugal) | **412 ms** |
| Audio/video stalls observed | **0 sustained stalls; 3 transient video freezes below 2 s** |

## 4. Conclusion

The 6-node / 512-client geographically-distributed run exercised the full webinar media path end-to-end:
all **512 clients joined successfully** (median join time **2.7 s**, median end-to-end latency **328 ms**),
distributed by geo/load routing, with presenter and panel media bridged between nodes via pipe transports
and consumed locally on each node. The dominant load — audience egress — was divided across the node pool,
peaking at **294 Mbps per node**, while total upstream ingest stayed at **8.274 Mbps** and total inter-node
mesh traffic at **41 Mbps** — both bounded by the small panel and independent of audience size. Per-node
resource use stayed low — **8.71%** CPU (normalized to 8 cores) and **1.7 GB** memory, versus **54%** CPU
and **3.8 GB** to serve the same event from a single node. This confirms the horizontal-scaling design:
audience size is absorbed by adding media nodes, with per-node load staying low — leaving substantial
headroom to scale well beyond 512 concurrent participants.

---

## Appendix — Dimensioning model (expected magnitudes from the encoding profiles)

This appendix derives the expected order of magnitude for each metric above from the shipped client
encoding profiles, as a reference for what the measured numbers in §3 should look like. These are
analytical values from the profiles, not measurements.

**Per-stream bitrates**

| Stream | Aggregate |
| --- | --- |
| Panelist webcam (640: 150 + 500) | 650 kbps |
| Presenter screen (1920 cap: 150 + 500 + 3500) | 4 150 kbps cap (≈1.0–1.5 Mbps typical at 5 fps) |
| Audio (Opus conference) | ~40 kbps |

**Upstream ingest** — `presenter (4150+40) + 9×(650+40)` ≈ **10.4 Mbps** worst case (only the panel uploads).

**Downstream per viewer** — presenter screen (1 layer) + 9 panel thumbnails (low layer 150 kbps) + panel
audio: `1500 + 9×150 + 10×40` ≈ **3.25 Mbps** (worst case, mid layers ≈ 8.4 Mbps).

**Aggregate egress** — `~502 × 3.25 Mbps` ≈ **1.6 Gbps**, across 6 nodes ≈ **270 Mbps/node** (worst case
≈ 700 Mbps/node).

**Inter-node bridging** — each panel stream piped once per remote node: `~10.4 Mbps/node`, total mesh
`~52 Mbps` — independent of audience size.

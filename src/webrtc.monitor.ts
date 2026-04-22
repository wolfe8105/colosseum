/**
 * THE MODERATOR — WebRTC Stats Monitor (Priority 7 / Peermetrics)
 *
 * Collects WebRTC connection quality metrics using @peermetrics/webrtc-stats
 * and pipes them to PostHog. Lightweight alternative to self-hosting
 * the full Peermetrics stack.
 *
 * Metrics captured: packet loss, jitter, RTT, bitrate, audio level.
 * Events fired to PostHog:
 *   - webrtc_stats       (every 10s during a debate)
 *   - webrtc_quality_low (when packet loss > 5% or RTT > 500ms)
 *   - webrtc_session_end (summary stats when debate ends)
 */

import { WebRTCStats } from '@peermetrics/webrtc-stats';

// PostHog capture helper — mirrors analytics.ts pattern
function phCapture(event: string, props: Record<string, unknown>): void {
  try {
    const ph = (window as unknown as Record<string, unknown>).posthog as {
      capture: (event: string, props?: Record<string, unknown>) => void;
    } | undefined;
    ph?.capture(event, props);
  } catch { /* PostHog is optional */ }
}

let statsInstance: WebRTCStats | null = null;
let debateId: string | null = null;
let role: string | null = null;
let statsCount = 0;
let worstPacketLoss = 0;
let worstRtt = 0;
let totalJitter = 0;
let totalBitrate = 0;
let qualityAlertFired = false;

/**
 * Start monitoring a peer connection.
 * Call this right after createPeerConnection().
 */
export function startWebRTCMonitor(
  pc: RTCPeerConnection,
  currentDebateId: string,
  currentRole: string,
): void {
  // Clean up any prior instance
  stopWebRTCMonitor();

  debateId = currentDebateId;
  role = currentRole;
  statsCount = 0;
  worstPacketLoss = 0;
  worstRtt = 0;
  totalJitter = 0;
  totalBitrate = 0;
  qualityAlertFired = false;

  statsInstance = new WebRTCStats({
    getStatsInterval: 10000, // every 10s
  });

  statsInstance.addConnection({
    pc,
    peerId: currentRole === 'a' ? 'debater-a' : 'debater-b',
  });

  statsInstance.on('stats', (ev: Record<string, unknown>) => {
    const data = ev.data as Record<string, unknown> | undefined;
    if (!data) return;

    // Extract key metrics from parsed stats
    const audio = data.audio as Record<string, unknown> | undefined;
    const inbound = audio?.inbound as Record<string, unknown> | undefined;
    const outbound = audio?.outbound as Record<string, unknown> | undefined;

    const packetLoss = Number(inbound?.packetsLostPct ?? inbound?.packetLoss ?? 0);
    const jitter = Number(inbound?.jitter ?? 0) * 1000; // convert to ms
    const rtt = Number(outbound?.roundTripTime ?? data.currentRoundTripTime ?? 0) * 1000;
    const bitrate = Number(inbound?.bitrate ?? 0);

    statsCount++;
    if (packetLoss > worstPacketLoss) worstPacketLoss = packetLoss;
    if (rtt > worstRtt) worstRtt = rtt;
    totalJitter += jitter;
    totalBitrate += bitrate;

    // Fire stats event to PostHog
    phCapture('webrtc_stats', {
      debate_id: debateId,
      role,
      packet_loss_pct: Math.round(packetLoss * 100) / 100,
      jitter_ms: Math.round(jitter * 10) / 10,
      rtt_ms: Math.round(rtt),
      bitrate_kbps: Math.round(bitrate / 1000),
      sample: statsCount,
    });

    // Quality alert — fire once per session
    if (!qualityAlertFired && (packetLoss > 5 || rtt > 500)) {
      qualityAlertFired = true;
      phCapture('webrtc_quality_low', {
        debate_id: debateId,
        role,
        packet_loss_pct: Math.round(packetLoss * 100) / 100,
        rtt_ms: Math.round(rtt),
        trigger: packetLoss > 5 ? 'packet_loss' : 'high_rtt',
      });
    }
  });
}

/**
 * Stop monitoring and fire session summary.
 * Call this from leaveDebate().
 */
export function stopWebRTCMonitor(): void {
  if (statsInstance) {
    // Fire session summary
    if (statsCount > 0) {
      phCapture('webrtc_session_end', {
        debate_id: debateId,
        role,
        samples: statsCount,
        worst_packet_loss_pct: Math.round(worstPacketLoss * 100) / 100,
        worst_rtt_ms: Math.round(worstRtt),
        avg_jitter_ms: Math.round((totalJitter / statsCount) * 10) / 10,
        avg_bitrate_kbps: Math.round(totalBitrate / statsCount / 1000),
        quality_alert_fired: qualityAlertFired,
      });
    }

    statsInstance.destroy();
    statsInstance = null;
  }

  debateId = null;
  role = null;
}

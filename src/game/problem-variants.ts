import type { Challenge, ChallengeCaseVariant } from "./types";

interface ReviewContext {
  readonly id: string;
  readonly label: string;
  readonly sourcePath: string;
}

/**
 * Explicit case contexts multiply every reviewed semantic template without
 * changing its technical claim. The case index is encoded in R2 share seeds,
 * while each seed still drives the template's existing value/type/name branches.
 */
export const REVIEW_CONTEXTS: readonly ReviewContext[] = [
  { id: "api-gateway", label: "API gateway", sourcePath: "gateway/request.rs" },
  { id: "packet-decoder", label: "Packet decoder", sourcePath: "network/frame.rs" },
  { id: "archive-extractor", label: "Archive extractor", sourcePath: "archive/entry.rs" },
  { id: "authentication-service", label: "Authentication service", sourcePath: "auth/session.rs" },
  { id: "authorization-engine", label: "Authorization engine", sourcePath: "policy/authorize.rs" },
  { id: "package-registry", label: "Package registry", sourcePath: "registry/package.rs" },
  { id: "telemetry-collector", label: "Telemetry collector", sourcePath: "telemetry/ingest.rs" },
  { id: "database-proxy", label: "Database proxy", sourcePath: "database/proxy.rs" },
  { id: "message-relay", label: "Message relay", sourcePath: "relay/message.rs" },
  { id: "task-scheduler", label: "Task scheduler", sourcePath: "scheduler/task.rs" },
  { id: "payment-worker", label: "Payment worker", sourcePath: "payments/settle.rs" },
  { id: "image-processor", label: "Image processor", sourcePath: "media/image.rs" },
  { id: "dns-resolver", label: "DNS resolver", sourcePath: "dns/query.rs" },
  { id: "tls-terminator", label: "TLS terminator", sourcePath: "tls/connection.rs" },
  { id: "backup-agent", label: "Backup agent", sourcePath: "backup/snapshot.rs" },
  { id: "plugin-host", label: "Plugin host", sourcePath: "plugins/host.rs" },
  { id: "cli-parser", label: "CLI parser", sourcePath: "cli/args.rs" },
  { id: "config-loader", label: "Config loader", sourcePath: "config/load.rs" },
  { id: "storage-engine", label: "Storage engine", sourcePath: "storage/page.rs" },
  { id: "cache-service", label: "Cache service", sourcePath: "cache/entry.rs" },
  { id: "event-consumer", label: "Event consumer", sourcePath: "events/consumer.rs" },
  { id: "websocket-server", label: "WebSocket server", sourcePath: "websocket/session.rs" },
  { id: "embedded-controller", label: "Embedded controller", sourcePath: "embedded/control.rs" },
  { id: "firmware-updater", label: "Firmware updater", sourcePath: "firmware/update.rs" },
  { id: "build-daemon", label: "Build daemon", sourcePath: "build/worker.rs" },
  { id: "container-runtime", label: "Container runtime", sourcePath: "container/runtime.rs" },
  { id: "secrets-broker", label: "Secrets broker", sourcePath: "secrets/broker.rs" },
  { id: "log-shipper", label: "Log shipper", sourcePath: "logging/shipper.rs" },
  { id: "filesystem-watcher", label: "Filesystem watcher", sourcePath: "filesystem/watch.rs" },
  { id: "rpc-client", label: "RPC client", sourcePath: "rpc/client.rs" },
  { id: "rpc-server", label: "RPC server", sourcePath: "rpc/server.rs" },
  { id: "compression-library", label: "Compression library", sourcePath: "compression/stream.rs" },
  { id: "serialization-layer", label: "Serialization layer", sourcePath: "serde/model.rs" },
  { id: "key-store", label: "Key store", sourcePath: "crypto/keystore.rs" },
  { id: "token-validator", label: "Token validator", sourcePath: "tokens/validate.rs" },
  { id: "sandbox-boundary", label: "Sandbox boundary", sourcePath: "sandbox/bridge.rs" },
  { id: "migration-runner", label: "Migration runner", sourcePath: "database/migrate.rs" },
  { id: "queue-processor", label: "Queue processor", sourcePath: "queue/worker.rs" },
  { id: "sync-engine", label: "Sync engine", sourcePath: "sync/state.rs" },
  { id: "monitoring-agent", label: "Monitoring agent", sourcePath: "monitor/agent.rs" },
] as const;

export const PROBLEM_VARIANT_COUNT = REVIEW_CONTEXTS.length;

export function getChallengeCaseVariant(index: number): ChallengeCaseVariant {
  if (!Number.isSafeInteger(index) || index < 0 || index >= PROBLEM_VARIANT_COUNT) {
    throw new RangeError(`Problem variant must be between 0 and ${PROBLEM_VARIANT_COUNT - 1}`);
  }
  const context = REVIEW_CONTEXTS[index] as ReviewContext;
  return {
    index,
    total: PROBLEM_VARIANT_COUNT,
    id: context.id,
    label: context.label,
    sourcePath: context.sourcePath,
  };
}

export function applyChallengeCaseVariant(
  challenge: Challenge,
  index: number,
): Challenge {
  return {
    ...challenge,
    caseVariant: getChallengeCaseVariant(index),
  } as Challenge;
}

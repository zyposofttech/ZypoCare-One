import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

let started = false;

export async function initOtel() {
  if (started) return;
  started = true;

  // Allow turning OTel on/off without changing code
  if (process.env.OTEL_ENABLED !== "true") return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4317";
  const serviceName = process.env.OTEL_SERVICE_NAME ?? "zypocare-core-api";

  const sdk = new NodeSDK({
    resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();

  const shutdown = async () => {
    try {
      await sdk.shutdown();
    } catch {}
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

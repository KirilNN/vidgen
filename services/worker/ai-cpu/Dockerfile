# services/worker/ai-cpu — production Dockerfile (T-021).
#
# See services/worker/Dockerfile.base for the shared base image
# rationale and the layer-caching contract.
FROM vidgen/worker-base:dev AS runtime
WORKDIR /workspace/services/worker
CMD ["pnpm", "start:ai-cpu"]

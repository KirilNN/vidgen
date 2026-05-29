# services/worker/ai-gpu — production Dockerfile (T-021).
#
# See services/worker/Dockerfile.base for the shared base image
# rationale and the layer-caching contract.
#
# T-13x (Dub pipeline) will add CUDA runtime layers here once the
# first GPU activity ships.
FROM vidgen/worker-base:dev AS runtime
WORKDIR /workspace/services/worker
CMD ["pnpm", "start:ai-gpu"]

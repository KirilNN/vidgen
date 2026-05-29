# services/worker/light — production Dockerfile (T-021).
#
# FROMs the shared base image built by the compose `worker-base`
# build-only service. The "shared base image" requirement from the
# T-021 acceptance text is satisfied by:
#   1. `worker-base` compose service builds Dockerfile.base → tagged
#      vidgen/worker-base:dev
#   2. Pool Dockerfiles (this one + media/Dockerfile, ai-cpu/Dockerfile,
#      ai-gpu/Dockerfile) FROM vidgen/worker-base:dev and override
#      only the CMD.
#
# Future tickets that add pool-specific OS deps (ffmpeg-static in T-032,
# whisper.cpp in T-041, CUDA runtime in T-13x) extend the matching
# pool Dockerfile with `RUN apk add …` AFTER this FROM line.
FROM vidgen/worker-base:dev AS runtime
WORKDIR /workspace/services/worker
CMD ["pnpm", "start:light"]

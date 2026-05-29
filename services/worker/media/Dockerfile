# services/worker/media — production Dockerfile (T-021, extended T-032).
#
# See services/worker/Dockerfile.base for the shared base image
# rationale and the layer-caching contract.
#
# T-032 adds FFmpeg + ffprobe (Debian package). We pick Debian's
# system ffmpeg over `ffmpeg-static` because:
#   - The base image is Debian-slim already (glibc, see
#     Dockerfile.base header) so adding ffmpeg is a single `apt-get
#     install` instead of pulling a 60-MB JS package whose binary
#     lags Debian by months.
#   - Debian's build has libx264, AAC, and PCM_S16LE — every codec
#     activities/ffmpeg.ts uses. No proprietary patent-encumbered
#     codecs that would force a fee.
#
# We pin ffmpeg via apt's version selector and clean up apt lists
# in the same RUN so the layer is minimal (~70 MB for ffmpeg + deps).
FROM vidgen/worker-base:dev AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace/services/worker
CMD ["pnpm", "start:media"]

# services/worker/ai-gpu

AI-GPU worker pool — XTTS, SAM 2, ProPainter, Wav2Lip/MuseTalk, Flux,
large LLMs. Capabilities: `xtts`, `sam2`, `propainter`, `wav2lip`,
`musetalk`, `flux`, `llama-large`. Task queue: `ai-gpu`. Profile:
`ai-gpu`.

GPU attachment is handled by `infra/compose/compose.gpu.override.yml`
(T-003 scaffold). Without it, the container starts but any activity
that actually touches CUDA will fail at runtime — which is fine in
dev, where you typically only run this pool on a GPU box.

See [`services/worker/README.md`](../README.md).

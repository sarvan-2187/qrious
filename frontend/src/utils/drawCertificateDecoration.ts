export function drawWaveDecoration(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Top-right corner waves
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const yOffset = i * 12;
    ctx.moveTo(width * 0.55, -20 + yOffset);
    ctx.bezierCurveTo(
      width * 0.75, height * 0.15 + yOffset,
      width * 0.85, height * 0.05 + yOffset,
      width + 20, height * 0.2 + yOffset
    );
    const gradient = ctx.createLinearGradient(width * 0.5, 0, width, height * 0.3);
    gradient.addColorStop(0, "rgba(168, 85, 247, 0)");
    gradient.addColorStop(0.5, `rgba(168, 85, 247, ${0.15 + i * 0.03})`);
    gradient.addColorStop(1, "rgba(200, 130, 255, 0.05)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Bottom-left corner waves
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const yOffset = i * 10;
    ctx.moveTo(-20, height * 0.7 + yOffset);
    ctx.bezierCurveTo(
      width * 0.15, height * 0.85 + yOffset,
      width * 0.25, height * 0.95 + yOffset,
      width * 0.45, height + 20 + yOffset
    );
    const gradient = ctx.createLinearGradient(0, height * 0.6, width * 0.4, height);
    gradient.addColorStop(0, "rgba(80, 80, 220, 0.1)");
    gradient.addColorStop(1, `rgba(150, 100, 255, ${0.1 + i * 0.02})`);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Faint large watermark letter (optional — "Q" for Qrious, matching your reference image)
  ctx.save();
  ctx.font = "bold 260px Georgia, serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.textAlign = "center";
  ctx.fillText("Q", width * 0.42, height * 0.62);
  ctx.restore();
}

export function createSvgFromText(text, width = 1200) {
  // Create a cleaner, more attractive vertical roadmap SVG.
  const sections = text
    .split(/\n\s*\n/) // split on blank lines
    .map((s) => s.trim())
    .filter(Boolean);

  const padding = 48;
  const contentWidth = width - padding * 2;

  // Estimate per-section height based on text length
  const estimateHeight = (s) => {
    const approxCharsPerLine = Math.floor(contentWidth / 10); // rough
    const lines = Math.max(1, Math.ceil(s.length / approxCharsPerLine));
    return Math.min(240, 28 + lines * 20);
  };

  const sectionHeights = sections.map(estimateHeight);
  const gap = 28;
  const totalHeight = padding * 2 + sectionHeights.reduce((a, b) => a + b, 0) + gap * (sections.length - 1) + 60;

  const esc = (s) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  let y = padding + 36; // leave room for title
  let items = '';

  for (let i = 0; i < sections.length; i++) {
    const content = esc(sections[i]).replace(/\n/g, '<br/>');
    const h = sectionHeights[i];
    const boxX = padding;
    const boxW = contentWidth;

    items += `
      <g>
        <rect x="${boxX}" y="${y}" rx="12" ry="12" width="${boxW}" height="${h}" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" filter="url(#s)"></rect>
        <foreignObject x="${boxX + 20}" y="${y + 12}" width="${boxW - 40}" height="${h - 24}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #0f172a; font-size: 16px; line-height:1.3;">
            ${content}
          </div>
        </foreignObject>
      </g>`;

    // Arrow
    if (i < sections.length - 1) {
      const cx = width / 2;
      const startY = y + h;
      const endY = startY + gap - 8;
      items += `
        <g>
          <line x1="${cx}" y1="${startY + 6}" x2="${cx}" y2="${endY}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" />
          <polygon points="${cx - 8},${endY - 2} ${cx + 8},${endY - 2} ${cx},${endY + 10}" fill="#64748b" />
        </g>`;
    }

    y += h + gap;
  }

  const title = 'Placement Roadmap';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.06" />
      </filter>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0%" stop-color="#06b6d4" />
        <stop offset="100%" stop-color="#0ea5a3" />
      </linearGradient>
      <style>
        .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; font-size:28px; fill:#0f172a; font-weight:600; }
        .subtitle { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; font-size:14px; fill:#475569; }
      </style>
    </defs>

    <rect width="100%" height="100%" fill="#f8fafc" />

    <g transform="translate(0,0)">
      <text x="${padding}" y="${padding}" class="title">${title}</text>
      <text x="${padding}" y="${padding + 24}" class="subtitle">A clear, step-by-step placement preparation roadmap</text>
      ${items}
    </g>
  </svg>`;

  return svg;
}

export async function svgStringToPngBlob(svgString, scale = 2) {
  return new Promise((resolve, reject) => {
    try {
      const svgBase64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas is empty'));
          resolve(blob);
        }, 'image/png', 1.0);
      };
      img.onerror = (e) => reject(new Error('Failed to load SVG into image'));
      img.src = svgBase64;
    } catch (err) {
      reject(err);
    }
  });
}

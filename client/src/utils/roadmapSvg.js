function wrapSvgText(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function escapeSvg(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createSvgFromText(text, width = 1200) {
  const sections = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const padding = 50;
  const cardWidth = width - padding * 2;
  const maxChars = 40;
  const cardSpacing = 32;

  const sectionData = sections.map((section) => {
    const lines = wrapSvgText(section, maxChars);
    return {
      raw: section,
      lines,
      height: 36 + lines.length * 24
    };
  });

  let y = padding + 80;
  let content = '';

  sectionData.forEach((section, index) => {
    const boxX = padding;
    const boxY = y;
    const boxH = section.height;
    const titleLine = section.lines[0] || '';
    const bodyLines = section.lines.slice(1);

    content += `
      <g>
        <rect x="${boxX}" y="${boxY}" width="${cardWidth}" height="${boxH}" rx="24" ry="24" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" filter="url(#cardShadow)" />
        <rect x="${boxX}" y="${boxY}" width="72" height="8" rx="4" fill="url(#accentGradient)" />
        <text x="${boxX + 32}" y="${boxY + 40}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeSvg(titleLine)}</text>
    `;

    bodyLines.forEach((line, lineIndex) => {
      const lineY = boxY + 70 + lineIndex * 24;
      content += `
        <text x="${boxX + 32}" y="${lineY}" font-family="Inter, Arial, sans-serif" font-size="16" fill="#475569">${escapeSvg(line)}</text>
      `;
    });

    content += '</g>';

    if (index < sectionData.length - 1) {
      const arrowX = width / 2;
      const arrowY = boxY + boxH + 14;
      const arrowEnd = arrowY + cardSpacing - 14;
      content += `
        <g>
          <line x1="${arrowX}" y1="${arrowY}" x2="${arrowX}" y2="${arrowEnd}" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
          <polygon points="${arrowX - 10},${arrowEnd - 4} ${arrowX + 10},${arrowEnd - 4} ${arrowX},${arrowEnd + 10}" fill="#475569" />
        </g>
      `;
    }

    y += boxH + cardSpacing;
  });

  const svgHeight = y + padding - cardSpacing;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgHeight}" viewBox="0 0 ${width} ${svgHeight}">
    <defs>
      <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.08" />
      </filter>
      <linearGradient id="accentGradient" x1="0" x2="1">
        <stop offset="0%" stop-color="#2563eb" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
      <style>
        .title { font-family: Inter, Arial, sans-serif; font-size: 34px; font-weight: 700; fill: #0f172a; }
        .subtitle { font-family: Inter, Arial, sans-serif; font-size: 18px; fill: #475569; }
      </style>
    </defs>

    <rect width="100%" height="100%" fill="#eef2ff" />
    <rect x="${padding}" y="${padding / 2}" width="${width - padding * 2}" height="116" rx="28" fill="#ffffff" opacity="0.95" />
    <text x="${padding + 24}" y="${padding + 38}" class="title">Placement Roadmap</text>
    <text x="${padding + 24}" y="${padding + 72}" class="subtitle">Professional, ATS-neutral planning for your placement journey</text>
    ${content}
  </svg>`;
}

export async function svgStringToPngBlob(svgString, scale = 2) {
  return new Promise((resolve, reject) => {
    let objectUrl;
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      objectUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.decoding = 'async';
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
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          if (!blob) return reject(new Error('Canvas is empty'));
          resolve(blob);
        }, 'image/png', 1.0);
      };
      img.onerror = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(new Error('Failed to load SVG into image'));
      };
      img.src = objectUrl;
    } catch (err) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(err);
    }
  });
}

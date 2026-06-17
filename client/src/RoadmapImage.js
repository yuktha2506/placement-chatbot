import React from 'react';
import { createSvgFromText } from './utils/roadmapSvg';

export default function RoadmapImage({ text, width = 800 }) {
  const svg = createSvgFromText(text, width);

  return (
    <div
      className="roadmap-image"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ width: '100%', overflow: 'auto' }}
    />
  );
}

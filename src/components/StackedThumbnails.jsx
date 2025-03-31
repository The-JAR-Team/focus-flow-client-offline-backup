import React, { useState } from 'react';

const StackedThumbnails = ({ videos, maxThumbnails = 3 }) => {
  const thumbnails = videos.slice(0, maxThumbnails);
  const [hovered, setHovered] = useState(false);

  const rotationAngles = [-25, -12, 0];
  const hoverTranslateX = [-60, -30, 0];

  return (
    <div
      className="stacked-thumbnails"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumbnails.map((video, index) => (
        <div
          key={video.video_id}
          data-index={index}
          className="stacked-thumbnail"
          style={{
            // Fix here: reversed z-index to keep leftmost underneath
            zIndex: index,
            transform: hovered
              ? `translateX(${hoverTranslateX[index]}px) rotateZ(${rotationAngles[index]}deg)`
              : `translateX(${index * 5}px) translateZ(${-(maxThumbnails - index) * 10}px) rotateZ(${index * 2}deg) scale(${1 - index * 0.05})`,
            transition: 'transform 0.5s ease',
            transformOrigin: 'left bottom',
          }}
        >
          <img
            src={`https://img.youtube.com/vi/${video.external_id}/mqdefault.jpg`}
            alt={video.video_name}
          />
        </div>
      ))}
    </div>
  );
};

export default StackedThumbnails;

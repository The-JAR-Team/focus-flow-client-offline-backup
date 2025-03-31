import React, { useState } from 'react';

const StackedThumbnails = ({ videos, maxThumbnails = 3 }) => {
  const thumbnails = videos.slice(0, maxThumbnails);
  const [hovered, setHovered] = useState(false);

  const rotationAngles = [-25, -12, 0];
  const hoverTranslateX = [-120, -50, 0];

  return (
    <div
      className="stacked-thumbnails"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }} // ensure parent positioning
    >
      {thumbnails.map((video, index) => (
        <div
          key={video.video_id}
          data-index={index}
          className="stacked-thumbnail"
          style={{
            position: 'absolute', // crucial for centering
            top: 0,
            left: '50%',
            zIndex: index,
            transform: hovered
              ? `translateX(calc(-50% + ${hoverTranslateX[index]}px)) rotateZ(${rotationAngles[index]}deg)`
              : `translateX(calc(-50% + ${index * 5}px)) translateZ(${-(maxThumbnails - index) * 10}px) rotateZ(${index * 2}deg) scale(${1 - index * 0.1})`,
            transition: 'transform 0.5s ease',
            transformOrigin: 'center bottom',
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

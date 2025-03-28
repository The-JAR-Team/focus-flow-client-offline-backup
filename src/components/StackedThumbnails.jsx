import React, { useState } from 'react';

const StackedThumbnails = ({ videos, maxThumbnails = 3 }) => {
  const thumbnails = videos.slice(0, maxThumbnails);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className="stacked-thumbnails">
      {thumbnails.map((video, index) => (
        <div
          key={video.video_id}
          data-index={index}
          className="stacked-thumbnail"
          style={{
            zIndex: thumbnails.length - index,
            transform: `
              translateX(${index * 5}px)
              translateZ(${- (maxThumbnails - index) * 10}px)
              rotateZ(${index * 2}deg)
              rotateY(${index === 0 ? 10 : 0}deg)
              scale(${1 - index * 0.05})
            `,
            transition: 'transform 0.5s ease' // Ensure transition is applied
          }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <img
            src={`https://img.youtube.com/vi/${video.external_id}/mqdefault.jpg`}
            alt={video.video_name}
            style={{
              transform: hoveredIndex === index ? `rotateY(720deg) scale(0.9)` : 'none',
              transition: 'transform 0.5s ease'
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default StackedThumbnails;

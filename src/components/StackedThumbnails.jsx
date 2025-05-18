import React, { useState } from 'react';

const StackedThumbnails = ({ videos = [], maxThumbnails = 3 }) => {    console.log("StackedThumbnails received:", videos);
  
  // Ensure videos is an array and has valid elements
  const validVideos = Array.isArray(videos) 
    ? videos.filter(video => {
        const hasValidId = video && (video.external_id || video.youtube_id);
        if (!hasValidId && video) {
          console.warn("Skipping video without external_id or youtube_id:", video);
        }
        return hasValidId;
      }) 
    : [];
  
  console.log("StackedThumbnails validVideos:", validVideos);
  
  // Only take up to maxThumbnails
  const thumbnails = validVideos.slice(0, maxThumbnails);
  const [hovered, setHovered] = useState(false);

  if (thumbnails.length === 0) {
    return (
      <div className="stacked-thumbnails empty-thumbnails" style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '8px', fontSize: '0.9rem' }}>No thumbnails</div>
      </div>
    );
  }

  const rotationAngles = [-25, -12, 0];
  const hoverTranslateX = [-120, -50, 0];
  return (
    <div
      className="stacked-thumbnails"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ 
        position: 'relative',
        height: '160px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }} // ensure parent positioning
    >      {thumbnails.map((video, index) => (
        <div
          key={video.video_id || video.playlist_item_id || video.external_id || `thumbnail-${index}`}
          data-index={index}
          className="stacked-thumbnail"          style={{
            position: 'absolute', // crucial for centering
            top: 0,
            left: '50%',
            zIndex: index,
            width: '160px',  // Explicit width
            height: '120px', // Explicit height
            transform: hovered
              ? `translateX(calc(-50% + ${hoverTranslateX[index]}px)) rotateZ(${rotationAngles[index]}deg)`
              : `translateX(calc(-50% + ${index * 5}px)) translateZ(${-(maxThumbnails - index) * 10}px) rotateZ(${index * 2}deg) scale(${1 - index * 0.1})`,
            transition: 'transform 0.5s ease',
            transformOrigin: 'center bottom',
          }}
        >          <img
            src={`https://img.youtube.com/vi/${video.external_id || video.youtube_id}/mqdefault.jpg`}
            alt={video.video_name || video.name || 'Video thumbnail'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}            onError={(e) => {
              console.log(`Error loading thumbnail for ${video.external_id || video.youtube_id}`, video);
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/320x180?text=No+Thumbnail';
              
              // Add a border to make the placeholder more visible
              e.target.style.border = '1px solid #ddd';
              e.target.style.backgroundColor = '#f8f8f8';
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default StackedThumbnails;

export const getVideoOwnership = (videoMetadata) => {
    const ownedVideosMap = new Map();
    const otherVideosMap = new Map();

    videoMetadata.playlists.forEach(playlist => {
        const isOwnedPlaylist = playlist.playlist_owner_name === "John Doe"; // Replace with actual user check
        
        playlist.playlist_items.forEach(video => {
            if (isOwnedPlaylist) {
                ownedVideosMap.set(video.external_id, video);
            } else {
                if (!ownedVideosMap.has(video.external_id)) {
                    otherVideosMap.set(video.external_id, video);
                }
            }
        });
    });

    return {
        ownedVideos: Array.from(ownedVideosMap.values()),
        otherVideos: Array.from(otherVideosMap.values()),
        isOwnedVideo: (externalId) => ownedVideosMap.has(externalId)
    };
};

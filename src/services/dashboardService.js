import { fetchVideoMetadata } from './videos';

export const initializeDashboardData = async (userData) => {
  const data = await fetchVideoMetadata();
  
  if (!data?.playlists) {
    throw new Error('No playlists data available');
  }
  
  return await processVideoData(data, userData);
};

const processVideoData = async (data, userData) => {
const processVideoData = async (data, userData) => {
  const genericPlaylists = data.playlists.filter(p => p.playlist_name === 'generic');
  const otherPlaylists = data.playlists.filter(p => p.playlist_name !== 'generic');

  // Process generic playlists
  const myGenericPlaylists = genericPlaylists.filter(p => p.playlist_owner_id === userData.user_id);
  const otherGenericPlaylists = genericPlaylists.filter(p => p.playlist_owner_id !== userData.user_id);

  // Process videos from my playlists
  const myVideos = myGenericPlaylists.flatMap(playlist => 
    playlist.playlist_items.map(item => ({
      ...item,
      video_id: item.external_id,
      group: item.subject,
      uploadby: item.upload_by
    }))
  );

  // Process videos from other playlists
  const otherVideos = otherGenericPlaylists
    .filter(p => ['public', 'unlisted'].includes(p.playlist_permission))
    .flatMap(playlist => 
      playlist.playlist_items.map(item => ({
        ...item,
        video_id: item.external_id,
        group: item.subject,
        uploadby: item.upload_by,
        permission: playlist.playlist_permission,
        playlist_owner_name: playlist.playlist_owner_name
      }))
    );

  // Process regular playlists
  const myPlaylists = otherPlaylists.filter(p => p.playlist_owner_id === userData.user_id);
  const otherRegularPlaylists = otherPlaylists.filter(p => p.playlist_owner_id !== userData.user_id);

  return {
    myGenericVideos: myVideos,
    otherGenericVideos: otherVideos,
    myPlaylists,
    otherPlaylists: otherRegularPlaylists
  };
};
};

import { fetchVideoMetadata } from './videos';

export const initializeDashboardData = async (userData) => {
  console.log('[dashboardService] Initializing dashboard data with userData:', userData);
  try {
    const data = await fetchVideoMetadata();
    console.log('[dashboardService] Data from fetchVideoMetadata:', data);

    if (!data || !data.playlists) { // Added check for data itself being falsy
      console.error('[dashboardService] No playlists data available from fetchVideoMetadata.');
      // Return a default empty structure to prevent undefined issues downstream
      return {
        myGenericVideos: [],
        otherGenericVideos: [],
        myPlaylists: [],
        otherPlaylists: [],
      };
    }

    // Ensure userData is available and has user_id before processing
    if (!userData || typeof userData.user_id === 'undefined') {
      console.error('[dashboardService] userData is invalid or missing user_id.');
      return {
        myGenericVideos: [],
        otherGenericVideos: [],
        myPlaylists: [],
        otherPlaylists: [],
      };
    }

    return await processVideoData(data, userData);
  } catch (error) {
    console.error('[dashboardService] Error in initializeDashboardData:', error);
    // Return a default empty structure on any error
    return {
      myGenericVideos: [],
      otherGenericVideos: [],
      myPlaylists: [],
      otherPlaylists: [],
    };
  }
};

const processVideoData = async (data, userData) => {
  console.log('[dashboardService] Processing video data:', data, 'with userData:', userData);
  try {
    const genericPlaylists = data.playlists.filter(p => p.playlist_name === 'generic');
    const otherPlaylists = data.playlists.filter(p => p.playlist_name !== 'generic');

    const myGenericPlaylists = genericPlaylists.filter(p => p.playlist_owner_id === userData.user_id);
    const otherGenericPlaylists = genericPlaylists.filter(p => p.playlist_owner_id !== userData.user_id);

    const myVideos = myGenericPlaylists.flatMap(playlist =>
      (playlist.playlist_items || []).map(item => ({
        ...item,
        video_id: item.external_id, // Assuming external_id is the correct field for video_id here
        group: item.subject,
        uploadby: item.upload_by
      }))
    );

    const otherVideos = otherGenericPlaylists
      .filter(p => ['public', 'unlisted'].includes(p.playlist_permission))
      .flatMap(playlist =>
        (playlist.playlist_items || []).map(item => ({
          ...item,
          video_id: item.external_id, // Assuming external_id is the correct field for video_id here
          group: item.subject,
          uploadby: item.upload_by,
          permission: playlist.playlist_permission,
          playlist_owner_name: playlist.playlist_owner_name
        }))
      );

    const myPlaylists = otherPlaylists.filter(p => p.playlist_owner_id === userData.user_id);
    const otherRegularPlaylists = otherPlaylists.filter(p => p.playlist_owner_id !== userData.user_id);

    const result = {
      myGenericVideos: myVideos || [],
      otherGenericVideos: otherVideos || [],
      myPlaylists: myPlaylists || [],
      otherPlaylists: otherRegularPlaylists || []
    };
    console.log('[dashboardService] Processed data result:', result);
    return result;
  } catch (error) {
    console.error('[dashboardService] Error in processVideoData:', error);
    // Return a default empty structure on any error
    return {
      myGenericVideos: [],
      otherGenericVideos: [],
      myPlaylists: [],
      otherPlaylists: [],
    };
  }
};

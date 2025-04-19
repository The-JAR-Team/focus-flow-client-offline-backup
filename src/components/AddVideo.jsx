import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import Navbar from './Navbar';
import '../styles/AddVideo.css';
import { uploadVideo, getPlaylists, extractVideoId } from '../services/addVideo';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { initializeDashboardData } from '../services/dashboardService';
import { setDashboardData } from '../redux/dashboardSlice';

const AddVideo = () => {
  const dispatch = useDispatch();
  const [videoId, setVideoId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [uploadby, setUploadby] = useState('');
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [duration, setDuration] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [extractedId, setExtractedId] = useState('');
  const [playlistSearchTerm, setPlaylistSearchTerm] = useState('');
  const { currentUser } = useSelector((state) => state.user);
  
  // New states for loading and status message
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch existing playlists using getPlaylists service
    getPlaylists()
      .then(response => {
        if (response.status === "success") {
          setAllPlaylists(response.playlists);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleVideoInput = (e) => {
    const input = e.target.value;
    setVideoId(input);
    const extracted = extractVideoId(input);
    setExtractedId(extracted);
  };

  const handleReady = (event) => {
    // Get video duration
    // console.log(event)
    const durationInSeconds = event.target.getDuration();
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    setDuration(formattedDuration);

    // Get video data
    const videoData = event.target.getVideoData();
    setVideoTitle(videoData.title);
    
    // Get channel title (uploader)
    setUploadby(videoData.author);
    console.log(videoData);
    

    // Get video description
    const player = event.target;
    player.getIframe().contentWindow.postMessage(JSON.stringify({
      'event': 'command',
      'func': 'getVideoData',
      'args': []
    }), '*');

    // Add event listener to receive description
    const handleMessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.info && data.info.description) {
          setDescription(data.info.description);
          window.removeEventListener('message', handleMessage);
        }
      } catch (error) {
        // Ignore parsing errors from other messages
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      video_id: extractVideoId(videoId),  // Ensure only the video id is sent
      video_name: videoTitle,
      subject: subject,
      playlists: selectedPlaylists.length > 0 ? selectedPlaylists : ['generic'], // Fallback to generic if none selected
      description: description,
      length: duration,
      uploadby: uploadby
    };

    try {
      await uploadVideo(payload);
      clearFields();
      
      const refreshedData = await initializeDashboardData(currentUser);
      dispatch(setDashboardData(refreshedData));

      toast.success('Video added successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear fields after successful upload
  const clearFields = () => {
    setVideoId('');
    setExtractedId('');
    setVideoTitle('');
    setSubject('');
    setDescription('');
    setUploadby('');
    setSelectedPlaylists([]);
    setDuration('');
  };

  const handlePlaylistSelect = (e) => {
    const playlistName = e.target.value;
    if (e.target.checked) {
      setSelectedPlaylists(prev => [...prev, playlistName]);
    } else {
      setSelectedPlaylists(prev => prev.filter(name => name !== playlistName));
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="form-card">
          <h2 className="main-title">Add a New Video</h2>
          
          <form onSubmit={handleAddVideo} className="add-video-form">
            <div className="form-container">
              {/* Left side - Video details */}
              <div className="form-section">
                <label htmlFor="videoId" className="form-label">Video ID</label>
                <input
                  type="text"
                  id="videoId"
                  className="form-input"
                  value={videoId}
                  onChange={handleVideoInput}
                  placeholder="Enter YouTube video ID or URL"
                  required
                />
                
                {videoId && (
                  <div className="extracted-id">
                    {extractedId ? (
                      <span className="valid-id">Valid Video ID: {extractedId}</span>
                    ) : (
                      <span className="invalid-id">Invalid YouTube video ID/URL</span>
                    )}
                  </div>
                )}

                {extractedId && (
                  <div className="video-preview">
                    <YouTube 
                      videoId={extractedId} 
                      opts={{
                        width: '100%',
                        height: '300',
                        playerVars: {
                          controls: 1,
                        },
                      }}
                      onReady={handleReady}
                    />
                    {duration && (
                      <div>
                        <div className="video-duration">Duration: {duration}</div>
                        <div className="video-title">Title: {videoTitle}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-grid">
                  <div>
                    <label htmlFor="subject" className="form-label">Subject</label>
                    <input 
                      type="text" 
                      id="subject" 
                      className="form-input" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Mathematics" 
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="uploadby" className="form-label">Upload-by</label>
                    <input
                      type="text"
                      id="uploadby"
                      className="form-input"
                      value={uploadby}
                      onChange={(e) => setUploadby(e.target.value)}
                      placeholder="e.g., Prof. Smith"
                      required
                    />
                  </div>
                </div>

                <label htmlFor="description" className="form-label">Video Description</label>
                <textarea
                  id="description"
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter video description..."
                  rows="4"
                  required
                />
              </div>
              
              {/* Right side - Playlist selection */}
              <div className="form-section">
                <label htmlFor="playlists" className="form-label">Add to Playlists</label>
                <input
                  type="text"
                  className="form-input playlist-search"
                  placeholder="Search playlists..."
                  value={playlistSearchTerm}
                  onChange={(e) => setPlaylistSearchTerm(e.target.value)}
                />
                <div className="playlist-checkbox-container">
                  {allPlaylists
                    .filter(playlist =>
                      playlist.playlist_name.toLowerCase() !== 'generic' &&
                      playlist.playlist_name.toLowerCase().includes(playlistSearchTerm.toLowerCase())
                    )
                    .map((playlist) => (
                      <label key={playlist.playlist_id} className="playlist-checkbox-label">
                        <input
                          type="checkbox"
                          value={playlist.playlist_name}
                          checked={selectedPlaylists.includes(playlist.playlist_name)}
                          onChange={handlePlaylistSelect}
                          className="playlist-checkbox"
                        />
                        {playlist.playlist_name}
                      </label>
                    ))
                  }
                  {allPlaylists.filter(p =>
                    p.playlist_name.toLowerCase() !== 'generic' &&
                    p.playlist_name.toLowerCase().includes(playlistSearchTerm.toLowerCase())
                  ).length === 0 && playlistSearchTerm && (
                    <div className="no-playlists-found">No playlists match your search</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Centered submit button */}
            <div className="submit-container">
              <button type="submit" className="submit-btn">
                {loading ? 'Uploading...' : 'Add Video'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVideo;

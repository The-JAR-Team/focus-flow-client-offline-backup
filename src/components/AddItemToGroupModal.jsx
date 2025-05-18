import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Spinner from './Spinner';
import StackedThumbnails from './StackedThumbnails';
import { addItemToGroup } from '../services/groupService';
import '../styles/AddItemToGroupModal.css';

const AddItemToGroupModal = ({ groupName, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('myPlaylists');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Get playlists and videos from Redux store
  const { 
    myPlaylists = [], 
    otherPlaylists = [], 
    myGenericVideos = [], 
    otherGenericVideos = [] 
  } = useSelector(state => state.dashboard);
  useEffect(() => {
    console.log("Modal loaded with playlists:", { myPlaylists, otherPlaylists });
    // Check playlist items structure for debugging
    if (myPlaylists.length > 0) {
      console.log("Sample playlist items:", myPlaylists[0].playlist_items);
      
      // Print first few items to see their structure
      if (Array.isArray(myPlaylists[0].playlist_items) && myPlaylists[0].playlist_items.length > 0) {
        console.log("First playlist item details:", myPlaylists[0].playlist_items[0]);
        console.log("Fields available in first item:", 
          Object.keys(myPlaylists[0].playlist_items[0]).join(", "));
      }
    }
  }, [myPlaylists, otherPlaylists]);

  // Filter items based on search query
  const filteredItems = {
    myPlaylists: myPlaylists.filter(playlist => 
      searchQuery === '' || 
      playlist.playlist_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    otherPlaylists: otherPlaylists.filter(playlist => 
      searchQuery === '' || 
      playlist.playlist_name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    myVideos: myGenericVideos.filter(video => 
      searchQuery === '' || 
      video.video_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    otherVideos: otherGenericVideos.filter(video => 
      searchQuery === '' || 
      video.video_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  const handleAddItem = async () => {
    if (!selectedItem) {
      setMessage({ type: 'error', text: 'Please select an item first.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Determine if this is a playlist or video and get the appropriate ID
      const itemType = activeTab.includes('Playlists') ? 'playlist' : 'video';
      const itemId = itemType === 'playlist' ? selectedItem.playlist_id : selectedItem.video_id;
      
      const response = await addItemToGroup(groupName, itemType, itemId);
      
      if (response.status === 'success') {
        setMessage({ type: 'success', text: response.message || `Successfully added to "${groupName}"!` });
        // Notify parent component to refresh the group list
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500); // Give user time to see success message before closing
        }
      } else {
        setMessage({ type: 'error', text: response.reason || 'Failed to add item to group.' });
      }
    } catch (error) {
      console.error('Error adding item to group:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred while adding the item to the group.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const renderItems = () => {
    let items = [];
    let itemType = '';

    switch (activeTab) {
      case 'myPlaylists':
        items = filteredItems.myPlaylists;
        itemType = 'playlist';
        break;
      case 'otherPlaylists':
        items = filteredItems.otherPlaylists;
        itemType = 'playlist';
        break;
      case 'myVideos':
        items = filteredItems.myVideos;
        itemType = 'video';
        break;
      case 'otherVideos':
        items = filteredItems.otherVideos;
        itemType = 'video';
        break;
      default:
        break;
    }

    if (items.length === 0) {
      return (
        <div className="no-items-message">
          {searchQuery ? 'No matching items found.' : 'No items available.'}
        </div>
      );
    }

    if (itemType === 'playlist') {
      return (
        <div className="items-grid">
          {items.map(playlist => {            // Ensure playlist_items exists and has the right structure for StackedThumbnails
            const playlistItems = Array.isArray(playlist.playlist_items) 
              ? playlist.playlist_items.map(item => {
                  // Create a normalized structure for the StackedThumbnails component
                  // Handle all possible field variations to be resilient to data structure changes
                  return {
                    video_id: item.video_id || item.playlist_item_id || item.id || '',
                    external_id: item.external_id || item.youtube_id || '',
                    video_name: item.video_name || item.name || item.subject || 'Untitled'
                  };
                }).filter(item => item.external_id) // Only keep items with a valid external_id
              : [];
                
            // Log converted playlist items for debugging
            console.log("Converted playlist items for StackedThumbnails:", playlistItems);
                
            return (
              <div 
                key={playlist.playlist_id} 
                className={`item-card ${selectedItem && selectedItem.playlist_id === playlist.playlist_id ? 'selected' : ''}`}
                onClick={() => handleItemSelect(playlist)}
              >                <div className="item-thumbnail">
                  <StackedThumbnails videos={playlistItems} />
                  {playlistItems.length === 0 && (
                    <div className="no-thumbnails-message">
                      No video thumbnails available
                    </div>
                  )}
                </div>
                <div className="item-details">
                  <h3 className="item-title">{playlist.playlist_name}</h3>
                  <div className="item-meta">
                    <span className="item-owner">By: {playlist.playlist_owner_name}</span>
                    <span className="item-count">{playlist.playlist_items?.length || 0} videos</span>
                  </div>
                  <div className="item-permission">
                    Permission: {playlist.playlist_permission || 'private'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      return (
        <div className="items-grid">
          {items.map(video => (
            <div 
              key={video.video_id} 
              className={`item-card ${selectedItem && selectedItem.video_id === video.video_id ? 'selected' : ''}`}
              onClick={() => handleItemSelect(video)}
            >
              <div className="item-thumbnail video-thumbnail">
                <img 
                  src={getVideoThumbnail(video.external_id)} 
                  alt={video.video_name} 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/320x180?text=No+Thumbnail';
                  }}
                />
                <span className="video-duration">{video.length}</span>
              </div>
              <div className="item-details">
                <h3 className="item-title">{video.video_name}</h3>
                <div className="item-meta">
                  <span className="item-owner">By: {video.upload_by}</span>
                  {video.subject && <span className="item-subject">Subject: {video.subject}</span>}
                </div>
                <div className="item-description">{video.description}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="add-item-modal">
        <div className="modal-header">
          <h2>Add Item to "{groupName}"</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'myPlaylists' ? 'active' : ''}`}
            onClick={() => handleTabChange('myPlaylists')}
          >
            My Playlists ({filteredItems.myPlaylists.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'otherPlaylists' ? 'active' : ''}`}
            onClick={() => handleTabChange('otherPlaylists')}
          >
            Public Playlists ({filteredItems.otherPlaylists.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'myVideos' ? 'active' : ''}`}
            onClick={() => handleTabChange('myVideos')}
          >
            My Videos ({filteredItems.myVideos.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'otherVideos' ? 'active' : ''}`}
            onClick={() => handleTabChange('otherVideos')}
          >
            Public Videos ({filteredItems.otherVideos.length})
          </button>
        </div>
        
        <div className="modal-body">
          {isLoading && <div className="overlay-spinner"><Spinner size="medium" /></div>}
          {renderItems()}
        </div>
        
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="add-button" 
            onClick={handleAddItem}
            disabled={!selectedItem || isLoading}
          >
            {isLoading ? 'Adding...' : 'Add to Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemToGroupModal;

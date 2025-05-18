import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import Spinner from './Spinner';
import StackedThumbnails from './StackedThumbnails';
import AddItemToGroupModal from './AddItemToGroupModal';
import {
  createGroup,
  getAllUserGroupsWithItems,
  addItemToGroup,
  removeItemFromGroup,
  switchGroupItemOrder, // This is still imported but not used; can be removed if reordering isn't planned soon
  deleteGroup,
} from '../services/groupService';
import '../styles/GroupsPage.css';

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedGroupForItem, setSelectedGroupForItem] = useState(null);

  const { currentUser } = useSelector(state => state.user);

  const fetchUserGroups = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAllUserGroupsWithItems();
      if (response.status === 'success') {
        setGroups(response.groups || []);
      } else {
        setError(response.reason || 'Failed to load groups.');
        setGroups([]);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching groups.');
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserGroups();
  }, [fetchUserGroups]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert('Group name cannot be empty.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await createGroup({
        group_name: newGroupName,
        description: newGroupDescription,
      });
      if (response.status === 'success') {
        setNewGroupName('');
        setNewGroupDescription('');
        setShowCreateModal(false);
        fetchUserGroups();
      } else {
        alert(response.message || 'Failed to create group.');
      }
    } catch (err) {
      alert(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupName) => {
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      setIsLoading(true);
      try {
        const response = await deleteGroup(groupName);
        if (response.status === 'success') {
          fetchUserGroups();
          alert(response.message || 'Group deleted successfully.');
        } else {
          alert(response.reason || 'Failed to delete group.');
        }
      } catch (err) {
        alert(err.message || 'An error occurred while deleting the group.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddItem = async (groupName) => {
    setShowAddItemModal(true);
    setSelectedGroupForItem(groupName);
  };

  const handleAddItemSuccess = () => {
    setTimeout(() => {
      setShowAddItemModal(false);
      fetchUserGroups(); // Refresh groups after successfully adding an item
    }, 1500);
  };

  const handleRemoveItem = async (groupName, itemType, itemId, itemName) => {
    if (window.confirm(`Are you sure you want to remove "${itemName}" (${itemType}) from group "${groupName}"?`)) {
      setIsLoading(true);
      try {
        const response = await removeItemFromGroup(groupName, itemType, itemId);
        if (response.status === 'success') {
          alert(response.message || 'Item removed successfully.');
          fetchUserGroups();
        } else {
          alert(response.reason || 'Failed to remove item.');
        }
      } catch (err) {
        alert(err.message || 'An error occurred.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="groups-page-container" style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>Please log in to manage your groups.</p>
        </div>
      </>
    );
  }

  if (isLoading && groups.length === 0) {
    return (
      <>
        <Navbar />
        <div className="loading-overlay">
          <Spinner size="large" message="Loading groups..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="groups-page-container" style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>
          <p>Error: {error}</p>
          <button onClick={fetchUserGroups}>Try Again</button>
        </div>
      </>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Navbar />
      <div className="groups-page-container">
        <header className="groups-header">
          <h1>My Groups</h1>
          <button onClick={() => setShowCreateModal(true)} className="create-group-btn">
            + Create New Group
          </button>
        </header>

        {showAddItemModal && selectedGroupForItem && (
          <AddItemToGroupModal
            groupName={selectedGroupForItem}
            onClose={() => setShowAddItemModal(false)}
            onSuccess={handleAddItemSuccess}
          />
        )}

        {showCreateModal && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <h2>Create New Group</h2>
              <form onSubmit={handleCreateGroup}>
                <div className="form-group">
                  <label htmlFor="groupName">Group Name:</label>
                  <input
                    type="text"
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="groupDescription">Description (Optional):</label>
                  <textarea
                    id="groupDescription"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Group'}
                  </button>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary" disabled={isLoading}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {groups.length === 0 && !isLoading && (
          <div className="no-groups-message">
            <p>You haven't created or joined any groups yet.</p>
            <p>Why not <button onClick={() => setShowCreateModal(true)} className="inline-link">create one now</button>?</p>
          </div>
        )}

        <div className="groups-grid">
          {groups.map(group => (
            <div key={group.group_id} className="group-card">
              <div className="group-card-header">
                <h3>{group.group_name}</h3>
                {group.group_name.toLowerCase() !== 'favorites' && (
                  <button 
                    onClick={() => handleDeleteGroup(group.group_name)} 
                    className="delete-group-btn"
                    disabled={isLoading}
                  >
                    🗑️
                  </button>
                )}
              </div>
              <p className="group-description">{group.description || 'No description.'}</p>
              
              <div className="group-actions">
                <button onClick={() => handleAddItem(group.group_name)} className="btn-add-item" disabled={isLoading}>
                  + Add Item
                </button>
              </div>              <div className="group-items-section">
                <h4 data-count={group.playlists?.length || 0}>Playlists</h4>
                {group.playlists && group.playlists.length > 0 ? (
                  <ul className="item-list">
                    {group.playlists.map(playlist => (
                      <li key={playlist.playlist_id} className="item-card playlist-item-card">
                        <div className="playlist-item-content">
                          <span className="item-name">{playlist.playlist_name}</span>
                          {playlist.playlist_items && Array.isArray(playlist.playlist_items) && playlist.playlist_items.length > 0 && (
                            <StackedThumbnails videos={playlist.playlist_items} />
                          )}
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(group.group_name, 'playlist', playlist.playlist_id, playlist.playlist_name)} 
                          className="btn-remove-item"
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="no-items-message">No playlists in this group yet.</p>}
              </div>            {/*  <div className="group-items-section">
                <h4 data-count={group.videos?.length || 0}>Videos</h4>
                {group.videos && group.videos.length > 0 ? (
                  <ul className="item-list">
                    {group.videos.map(video => (
                      <li key={video.video_id} className="item-card video-item-card">
                        <span className="item-name">{video.name}</span>
                        <button 
                          onClick={() => handleRemoveItem(group.group_name, 'video', video.video_id, video.name)} 
                          className="btn-remove-item"
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="no-items-message">No videos in this group yet.</p>}
              </div>
                */}
              <small className="group-meta">Last updated: {new Date(group.updated_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GroupsPage;

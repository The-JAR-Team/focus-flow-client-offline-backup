import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { config } from '../config/config';
import '../styles/SummaryView.css';
import Spinner from './Spinner';
import Navbar from './Navbar';

const SummaryView = () => {
  const { videoId } = useParams(); // Database video ID from URL
  const [summary, setSummary] = useState(null);
  const [language, setLanguage] = useState('English'); // Default language
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [externalId, setExternalId] = useState(null); // YouTube ID
  const [summaryStatus, setSummaryStatus] = useState({
    English: 'idle', // idle, pending, success, failed
    Hebrew: 'idle'
  });
  const [checkCount, setCheckCount] = useState({
    English: 0,
    Hebrew: 0
  });
  const pollingRef = useRef(null);
  const [hasAutoScroll, setHasAutoScroll] = useState(false);  

  useEffect(() => {
    fetchAccessibleVideos();
    
    // Cleanup polling interval when component unmounts
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [videoId]);
  
  // When language changes and we already have an external ID, refetch summary
  useEffect(() => {
    if (externalId) {
      fetchSummary(externalId);
    }
  }, [language]);
  const fetchAccessibleVideos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${config.baseURL}/videos/accessible`,
        { withCredentials: true }
      );
      
      if (response.data && response.data.playlists) {
        // Search through all playlists for the matching video ID
        let foundExternalId = null;
        
        // Loop through all playlists
        for (const playlist of response.data.playlists) {
          // Loop through all items in each playlist
          for (const item of playlist.playlist_items) {
            if (parseInt(item.video_id) === parseInt(videoId)) {
              foundExternalId = item.external_id;
              console.log(`Found matching video ID ${videoId}, external ID: ${foundExternalId}`);
              break;
            }
          }
          if (foundExternalId) break;
        }
        
        if (foundExternalId) {
          setExternalId(foundExternalId);
          
          // Check status for both languages
          await checkBothLanguages(foundExternalId);
          
          // Fetch the summary for the current language
          fetchSummary(foundExternalId);
        } else {
          setError(`Could not find external ID for video ID: ${videoId}`);
          setLoading(false);
        }
      } else {
        setError('Failed to fetch accessible videos');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching accessible videos:', err);
      setError(`Error: ${err.message || 'Unknown error occurred'}`);
      setLoading(false);
    }
  };

  const fetchSummary = async (videoExternalId, checkOnly = false) => {
    if (!checkOnly) {
      setLoading(true);
      setError(null);
    }
    
    const currentLang = language;
    
    try {
      // Use the YouTube external ID instead of the database ID
      const response = await axios.get(
        `${config.baseURL}/videos/${videoExternalId}/summary?lang=${currentLang}`,
        { withCredentials: true }
      );

      if (response.data && response.data.status === 'success') {
        // Update the status to success
        setSummaryStatus(prev => ({
          ...prev,
          [currentLang]: 'success'
        }));
        
        // If we're not just checking status, set the summary data
        if (!checkOnly) {
          setSummary(response.data.video_summary);
          // Initialize all subjects as collapsed
          const initialExpanded = {};
          if (response.data.video_summary.summary && response.data.video_summary.summary.Subject) {
            response.data.video_summary.summary.Subject.forEach((_, index) => {
              initialExpanded[index] = false;
            });
          }
          setExpandedSubjects(initialExpanded);
        }
        
        // Stop polling if this is the current language
        if (currentLang === language && pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      } else if (response.data && response.data.status === 'pending') {
        console.log(`Summary for ${currentLang} still generating... (Check: ${checkCount[currentLang] + 1})`);
        
        // Update the status to pending
        setSummaryStatus(prev => ({
          ...prev,
          [currentLang]: 'pending'
        }));
        
        // Increment check count
        setCheckCount(prev => ({
          ...prev,
          [currentLang]: prev[currentLang] + 1
        }));
        
        // If not already polling and this is not a check-only call, start polling
        if (!pollingRef.current && !checkOnly) {
          pollingRef.current = setInterval(() => {
            fetchSummary(videoExternalId, true);
          }, 10000); // Check every 10 seconds
        }
        
        // If we're just checking, don't update loading state
        if (!checkOnly) {
          setError(null);
          setLoading(true);
        }
      } else {
        if (!checkOnly) {
          setError('Failed to fetch summary data');
          setLoading(false);
        }
        
        setSummaryStatus(prev => ({
          ...prev,
          [currentLang]: 'failed'
        }));
      }
    } catch (err) {
      console.error(`Error fetching ${currentLang} summary:`, err);
      
      // Only update error state if this is not a background check
      if (!checkOnly) {
        setError(`Error: ${err.message || 'Unknown error occurred'}`);
        setLoading(false);
      }
      
      setSummaryStatus(prev => ({
        ...prev,
        [currentLang]: 'failed'
      }));
    } finally {
      // Only update loading state if this is not a background check
      if (!checkOnly) {
        setLoading(false);
      }
    }
  };

  const checkBothLanguages = async (videoExternalId) => {
    // Check if English summary is available
    const tempLang = language;
    
    // Check English first
    setLanguage('English');
    await fetchSummary(videoExternalId, true);
    
    // Then check Hebrew
    setLanguage('Hebrew');
    await fetchSummary(videoExternalId, true);
    
    // Restore original language
    setLanguage(tempLang);
  };

  const toggleSubject = (index) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatTime = (timeString) => {
    // Converts time string like "00:01:24" to a more readable format
    return timeString;
  };  if (loading) {
    return (
      <>
        <Navbar />
        <div className="summary-container">
          <Spinner />
          <p className="loading-text">
            {externalId ? `Loading ${language} summary...` : 'Finding video data...'}
          </p>
          
          {externalId && summaryStatus[language] === 'pending' && (
            <div className="language-loading-status">
              <p>
                <strong>{language} summary is being generated.</strong>
                {checkCount[language] > 0 && ` (Check #${checkCount[language]})`}
              </p>
              <div className="loading-progress">
                <div 
                  className="loading-progress-bar" 
                  style={{ width: '70%' }} 
                />
              </div>
              
              {/* Show language buttons if at least one language is available */}
              {(summaryStatus.English === 'success' || summaryStatus.Hebrew === 'success') && (
                <div style={{ marginTop: '20px' }}>
                  <p>Try another available language:</p>
                  <button 
                    className={`lang-btn ${language === 'English' ? 'active' : ''} ${summaryStatus.English === 'pending' ? 'pending' : ''}`}
                    onClick={() => setLanguage('English')}
                    disabled={summaryStatus.English === 'idle' || summaryStatus.English === 'pending'}
                  >
                    English
                  </button>
                  
                  <button 
                    className={`lang-btn ${language === 'Hebrew' ? 'active' : ''} ${summaryStatus.Hebrew === 'pending' ? 'pending' : ''}`}
                    onClick={() => setLanguage('Hebrew')}
                    disabled={summaryStatus.Hebrew === 'idle' || summaryStatus.Hebrew === 'pending'}
                  >
                    Hebrew
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Navbar />
        <div className="summary-container error">
          <h2>Error Loading Summary</h2>
          <p>{error}</p>
          <button 
            className="retry-button" 
            onClick={() => externalId ? fetchSummary(externalId) : fetchAccessibleVideos()}
          >
            Retry
          </button>
        </div>
      </>
    );
  }
  if (!summary || !summary.summary || !summary.summary.Subject) {
    return (
      <>
        <Navbar />
        <div className="summary-container error">
          <h2>No Summary Available</h2>
          <p>There is no summary available for this video in {language}.</p>
          
          <div className="language-loading-status">
            {summaryStatus.English === 'pending' && (
              <p>
                <strong>English summary is being generated.</strong> 
                Check #{checkCount.English} - This may take a few minutes.
              </p>
            )}
            {summaryStatus.Hebrew === 'pending' && (
              <p>
                <strong>Hebrew summary is being generated.</strong>
                Check #{checkCount.Hebrew} - This may take a few minutes.
              </p>
            )}
            
            {(summaryStatus.English === 'pending' || summaryStatus.Hebrew === 'pending') && (
              <div className="loading-progress">
                <div 
                  className="loading-progress-bar" 
                  style={{ width: '70%' }} 
                />
              </div>
            )}
          </div>
          
          <div style={{ margin: '20px 0', textAlign: 'center' }}>
            <button 
              className={`lang-btn ${language === 'English' ? 'active' : ''} ${summaryStatus.English === 'pending' ? 'pending' : ''}`}
              onClick={() => setLanguage('English')}
              disabled={summaryStatus.English === 'idle'}
            >
              English {summaryStatus.English === 'pending' && '(Generating...)'}
            </button>
            
            <button 
              className={`lang-btn ${language === 'Hebrew' ? 'active' : ''} ${summaryStatus.Hebrew === 'pending' ? 'pending' : ''}`}
              onClick={() => setLanguage('Hebrew')}
              disabled={summaryStatus.Hebrew === 'idle'}
            >
              Hebrew {summaryStatus.Hebrew === 'pending' && '(Generating...)'}
            </button>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <div className="summary-container" dir={language === 'Hebrew' ? 'rtl' : 'ltr'}>
        <div className="summary-header">
          <div className="header-left">
            <h2>Video Summary</h2>
            <Link to={`/trivia/${videoId}`} className="back-to-trivia">
              {language === 'Hebrew' ? 'חזרה לחידון ←' : '← Back to Quiz'}
            </Link>
          </div>        <div className="language-selector">
            <div className="language-buttons">
              <button 
                className={`lang-btn ${language === 'English' ? 'active' : ''} ${summaryStatus.English === 'pending' ? 'pending' : ''}`}
                onClick={() => setLanguage('English')}
                disabled={summaryStatus.English !== 'success'}
              >
                English
                {summaryStatus.English === 'pending' && ' (Generating...)'}
              </button>
              
              <button 
                className={`lang-btn ${language === 'Hebrew' ? 'active' : ''} ${summaryStatus.Hebrew === 'pending' ? 'pending' : ''}`}
                onClick={() => setLanguage('Hebrew')}
                disabled={summaryStatus.Hebrew !== 'success'}
              >
                עברית
                {summaryStatus.Hebrew === 'pending' && ' (בתהליך יצירה...)'}
              </button>
            </div>
          </div>
        </div>

        <div className="summary-content">
          {summary.summary.Subject.map((subject, index) => (
            <div className="subject-card" key={index}>
              <div 
                className="subject-header" 
                onClick={() => toggleSubject(index)}
              >
                <h3>{subject.subject_title}</h3>
                <span className="time-range">
                  {formatTime(subject.subject_start_time)} - {formatTime(subject.subject_end_time)}
                </span>
                <span className={`expand-icon ${expandedSubjects[index] ? 'expanded' : ''}`}>
                  {expandedSubjects[index] ? '▼' : '►'}
                </span>
              </div>
              
              <div className="subject-overall-summary">
                <p>{subject.subject_overall_summary}</p>
              </div>

              {expandedSubjects[index] && (
                <div className="subject-details">
                  <p className="subject-description">{subject.description}</p>
                  
                  {subject.sub_summaries.map((subSummary, subIndex) => (
                    <div className="sub-summary" key={subIndex}>
                      {subSummary.properties.map((prop, propIndex) => (
                        <div className="summary-point" key={propIndex}>
                          <div className="time-stamp">
                            {formatTime(prop.source_start_time)} - {formatTime(prop.source_end_time)}
                          </div>
                          <div className="summary-text">
                            {prop.summary_text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default SummaryView;

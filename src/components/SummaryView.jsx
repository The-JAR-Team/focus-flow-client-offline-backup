import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchVideoSummary } from '../services/summaryTimelineService';
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
  const [summaryStatus, setSummaryStatus] = useState({ English: 'idle', Hebrew: 'idle' });
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
      // Offline: read from local accessible JSON
  const res = await fetch(`${import.meta.env.BASE_URL}offline/accessible..json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load offline accessible list');
      const data = await res.json();
      if (data && data.playlists) {
        // Try to interpret param as either DB video_id or YouTube id
        let foundExternalId = null;
        const vidParam = String(videoId);
        for (const playlist of data.playlists) {
          for (const item of playlist.playlist_items) {
            if (
              String(item.video_id) === vidParam || // DB id match
              String(item.external_id) === vidParam // Already a YT id
            ) {
              foundExternalId = item.external_id;
              break;
            }
          }
          if (foundExternalId) break;
        }

        if (foundExternalId) {
          setExternalId(foundExternalId);
          await checkBothLanguages(foundExternalId);
          fetchSummary(foundExternalId);
        } else {
          setError(`Could not find external ID for video: ${videoId}`);
          setLoading(false);
        }
      } else {
        setError('Offline accessible data missing');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading offline accessible videos:', err);
      setError(`Error: ${err.message || 'Unknown error occurred'}`);
      setLoading(false);
    }
  };

  const fetchSummary = async (videoExternalId) => {
    setLoading(true);
    setError(null);
    const currentLang = language;
    try {
      const data = await fetchVideoSummary(videoExternalId, currentLang);
      // Normalize shape: expect { summary: { Subject: [...] } }
      const normalized = data;
      setSummary(normalized);
      // Initialize collapsed map
      const initialExpanded = {};
      if (normalized.summary && normalized.summary.Subject) {
        normalized.summary.Subject.forEach((_, idx) => {
          initialExpanded[idx] = false;
        });
      }
      setExpandedSubjects(initialExpanded);
      setSummaryStatus(prev => ({ ...prev, [currentLang]: 'success' }));
    } catch (err) {
      console.error(`Offline summary not available for ${currentLang}:`, err);
      setSummaryStatus(prev => ({ ...prev, [currentLang]: 'failed' }));
      setError(`No offline summary found for ${currentLang}.`);
    } finally {
      setLoading(false);
    }
  };

  const checkBothLanguages = async (videoExternalId) => {
    // Offline: just try fetching headers to see if files exist
    // English
    try {
      await fetchVideoSummary(videoExternalId, 'English');
      setSummaryStatus(prev => ({ ...prev, English: 'success' }));
    } catch {
      setSummaryStatus(prev => ({ ...prev, English: 'failed' }));
    }
    // Hebrew
    try {
      await fetchVideoSummary(videoExternalId, 'Hebrew');
      setSummaryStatus(prev => ({ ...prev, Hebrew: 'success' }));
    } catch {
      setSummaryStatus(prev => ({ ...prev, Hebrew: 'failed' }));
    }
  };

  const toggleSubject = (index) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatTime = (timeString) => {
    // Offline summary already provides formatted times
    return timeString;
  };

  if (loading) {
    return (
      <>
        <div style={{ padding: '20px' }}>
          <Navbar />
        </div>
        <div className="summary-container">
          <Spinner />
          <p className="loading-text">
            {externalId ? `Loading ${language} summary...` : 'Finding video data...'}
          </p>
          
      {externalId && summaryStatus[language] === 'pending' && (
            <div className="language-loading-status">
              <p>
                <strong>{language} summary is being generated.</strong>
                
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
        <div style={{ padding: '20px' }}>
          <Navbar />
        </div>
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
        <div style={{ padding: '20px' }}>
          <Navbar />
        </div>
        <div className="summary-container error">
          <h2>No Summary Available</h2>
          <p>There is no summary available for this video in {language}.</p>
          
          <div className="language-loading-status">{summaryStatus.English === 'pending' && (
              <p>
                <strong>English summary is being generated.</strong> 
                Check #{checkCount.English} - This may take a few minutes.
              </p>
            )}
      {summaryStatus.Hebrew === 'pending' && (
              <p>
                <strong>Hebrew summary is being generated.</strong>
        This may take a few minutes.
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
      <div style={{ padding: '20px' }}>
        <Navbar />
      </div>
      <div className="summary-container" dir={language === 'Hebrew' ? 'rtl' : 'ltr'}>
        <div className="summary-header">
          <div className="header-left">
            <h2>Video Summary</h2>
            <div className="navigation-links">

                            <Link 
                to="/trivia" 
                className="back-to-trivia-list"
                onClick={() => {
                  // Store current video ID to scroll to it when returning to the list
                  localStorage.setItem('lastViewedVideoId', videoId);
                }}
              >
                {language === 'Hebrew' ? 'חזרה לרשימת הסרטונים ←' : '← Back to Trivia List'}
              </Link>
              
              <Link to={`/trivia/${videoId}`} className="back-to-trivia">
                {language === 'Hebrew' ? 'חזרה לחידון ←' : '← Back to Quiz'}
              </Link>

            </div>
          </div><div className="language-selector">
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

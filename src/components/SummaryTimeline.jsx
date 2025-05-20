import React, { useEffect, useRef, useState } from 'react';
import {
  formatTime,
  processSummaryForTimeline,
  findCurrentAndNextSubject,
  findCurrentSubSummary
} from '../services/summaryTimelineService';
import '../styles/SummaryTimeline.css';

const SummaryTimeline = ({ summaryData, currentTime, language, playerHeight, onTimeClick, isLoading }) => {
  const timelineRef = useRef(null);
  const subjectRefs = useRef({});
  const [processedSubjects, setProcessedSubjects] = useState([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(-1);
  const [nextSubjectIndex, setNextSubjectIndex] = useState(-1);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const lastScrollRef = useRef({ idx: -1, time: 0 }); // Track last scroll target and time

  // Process summary data when it changes
  useEffect(() => {
    if (!summaryData) return;
    
    const processed = processSummaryForTimeline(summaryData);
    console.log(`📋 Processed ${processed.length} subjects from summary`);
    setProcessedSubjects(processed);

    subjectRefs.current = processed.reduce((acc, subject) => {
      acc[subject.id] = React.createRef();
      return acc;
    }, {});
  }, [summaryData]);

  // Update indices based on current time
  useEffect(() => {
    if (processedSubjects.length === 0) return;
    
    const { currentSubjectIndex: currIdx, nextSubjectIndex: nextIdx } = 
      findCurrentAndNextSubject(processedSubjects, currentTime);

    if (currIdx !== currentSubjectIndex) {
      setCurrentSubjectIndex(currIdx);
      
      // Auto-expand the current subject
      if (currIdx !== -1) {
        setExpandedSubjectId(processedSubjects[currIdx].id);
      }
    }
    
    if (nextIdx !== nextSubjectIndex) {
      setNextSubjectIndex(nextIdx);
    }
  }, [currentTime, processedSubjects, currentSubjectIndex, nextSubjectIndex]);

  // Scrolling logic (similar to QuestionTimeline)
  useEffect(() => {
    if (!timelineRef.current || processedSubjects.length === 0) return;
    
    const container = timelineRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    let targetIdx = currentSubjectIndex !== -1 ? currentSubjectIndex : nextSubjectIndex;
    if (targetIdx < 0 || targetIdx >= processedSubjects.length) return;
    
    const displayIdx = Math.max(0, targetIdx);
    
    // Throttle scrolling to avoid unnecessary updates
    const now = Date.now();
    if (now - lastScrollRef.current.time < 500 && displayIdx === lastScrollRef.current.idx) return;
    
    // Calculate target scroll position based on the adjusted index's position in the list
    const scrollRatio = displayIdx / (processedSubjects.length - 1);
    const scrollTarget = Math.floor(scrollRatio * maxScroll);
    const clampedTarget = Math.max(0, Math.min(scrollTarget, maxScroll));
    
    console.log(`Scrolling to subject index ${displayIdx} (${Math.round(scrollRatio*100)}% of timeline)`);
    
    lastScrollRef.current = {
      idx: displayIdx,
      time: now
    };
    
    container.scrollTo({
      top: clampedTarget,
      behavior: 'smooth'
    });
  }, [currentSubjectIndex, nextSubjectIndex, processedSubjects]);

  const toggleSubject = (subjectId) => {
    setExpandedSubjectId(expandedSubjectId === subjectId ? null : subjectId);
  };
  return (
    <div
      className={`timeline-container summary-timeline ${language === 'Hebrew' ? 'rtl-timeline' : ''}`}
      ref={timelineRef}
      style={{ height: `${playerHeight}px` }}
      dir={language === 'Hebrew' ? 'rtl' : 'ltr'}
    >
      <h3 className="timeline-header">{language} Summary Timeline</h3>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading summary data...</p>
        </div>
      ) : (!processedSubjects || processedSubjects.length === 0) ? (
        <p className="no-subjects">No summary data available.</p>      ) : (
        <div>
          <div className="timeline-stats">
            {processedSubjects.length} subjects available
          </div>
          
          {processedSubjects.map((subject, index) => {
            const isCurrent = index === currentSubjectIndex;
            const isNext = !isCurrent && index === nextSubjectIndex;
            const isPast = currentSubjectIndex === -1
              ? (nextSubjectIndex === -1 || index < nextSubjectIndex)
              : index < currentSubjectIndex;
            const isExpanded = expandedSubjectId === subject.id;

            let subjectClass = 'subject-item';
            if (isCurrent) subjectClass += ' current-subject';
            else if (isNext) subjectClass += ' next-subject';
            else if (isPast) subjectClass += ' past-subject';
            if (isExpanded) subjectClass += ' expanded';

            // Find the current sub-summary if this is the current subject
            const currentSubSummaryIndex = isCurrent 
              ? findCurrentSubSummary(subject, currentTime) 
              : -1;

            return (
              <div
                key={subject.id}
                ref={subjectRefs.current[subject.id]}
                className={subjectClass}
                id={`subject-${subject.startTime}-${subject.id}`}
              >
                <div 
                  className="subject-header"
                  onClick={() => toggleSubject(subject.id)}
                  title="Click to expand/collapse this subject"
                >
                  <span className="subject-time">[{formatTime(subject.startTime)} - {formatTime(subject.endTime)}]</span>
                  <span className="subject-title">{subject.title || subject.subjectName}</span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </div>
                
                {isExpanded && (
                  <div className="subject-details">
                    <div className="subject-overall-summary">
                      <p>{subject.overallSummary}</p>
                    </div>
                    
                    {subject.subSummaries && subject.subSummaries.length > 0 && (
                      <div className="sub-summaries">
                        <h4>Detailed Summaries</h4>
                        {subject.subSummaries.map((subSummary, subIndex) => {
                          const isCurrentSub = isCurrent && subIndex === currentSubSummaryIndex;
                          
                          return (
                            <div 
                              key={`${subject.id}-sub-${subIndex}`}
                              className={`sub-summary-item ${isCurrentSub ? 'current-sub-summary' : ''}`}
                              onClick={() => onTimeClick && onTimeClick(subSummary.startTime)}
                              title={`Click to seek to ${formatTime(subSummary.startTime)}`}
                            >
                              <span className="sub-summary-time">
                                [{formatTime(subSummary.startTime)} - {formatTime(subSummary.endTime)}]
                              </span>
                              <span className="sub-summary-text">{subSummary.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SummaryTimeline;

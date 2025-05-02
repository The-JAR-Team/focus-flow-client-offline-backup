import React, { useEffect, useRef, useState } from 'react';
import {
  formatTime,
  processQuestionsForTimeline,
  findNextQuestionIndex
} from '../services/questionTimelineService';
import '../styles/QuestionTimeline.css';

const QuestionTimeline = ({ questions, currentTime, language, playerHeight, onQuestionClick }) => {
  const timelineRef = useRef(null);
  const questionRefs = useRef({});
  const [processedQuestions, setProcessedQuestions] = useState([]);
  const [nextQuestionIndex, setNextQuestionIndex] = useState(-1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const lastScrollRef = useRef({ idx: -1, time: 0 }); // Track last scroll target and time

  // Process questions when they change
  useEffect(() => {
    const sorted = processQuestionsForTimeline(questions);
    console.log(`📋 Processed ${sorted.length} questions`);
    setProcessedQuestions(sorted);
    questionRefs.current = sorted.reduce((acc, q) => {
      acc[q.q_id] = React.createRef();
      return acc;
    }, {});
  }, [questions]);

  // Update indices based on current time
  useEffect(() => {
    const nextIdx = findNextQuestionIndex(processedQuestions, currentTime);
    const currentIdx = processedQuestions.findIndex(q => currentTime >= q.startTime && currentTime < q.endTime);

    if (nextIdx !== nextQuestionIndex) {
      //console.log(`🔄 Next question index changed to ${nextIdx}`);
      setNextQuestionIndex(nextIdx);
    }
    if (currentIdx !== currentQuestionIndex) {
      //console.log(`🔄 Current question index changed to ${currentIdx}`);
      setCurrentQuestionIndex(currentIdx);
    }
  }, [currentTime, processedQuestions, nextQuestionIndex, currentQuestionIndex]);

  // Basic, fixed interval scrolling approach
  useEffect(() => {
    // Skip if no container or no questions
    if (!timelineRef.current || processedQuestions.length === 0) return;
    
    // Get container scroll info
    const container = timelineRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Which question index to target
    const targetIdx = currentQuestionIndex !== -1 ? currentQuestionIndex : nextQuestionIndex;
    if (targetIdx < 0 || targetIdx >= processedQuestions.length) return;
    
    // Basic throttle to avoid too many scrolls
    const now = Date.now();
    if (now - lastScrollRef.current.time < 500 && targetIdx === lastScrollRef.current.idx) return;
    
    
    // The key idea: divide the timeline into fixed segments
    // Use the target index / total questions to determine scroll position
    const scrollRatio = targetIdx / (processedQuestions.length - 1);
    const scrollTarget = Math.floor(scrollRatio * maxScroll);

    // Ensure bounds
    const clampedTarget = Math.max(0, Math.min(scrollTarget, maxScroll));
    
    
    // Record this scroll to avoid duplicates
    lastScrollRef.current = {
      idx: targetIdx,
      time: now
    };
    
    // Execute scroll
    container.scrollTo({
      top: clampedTarget,
      behavior: 'smooth'
    });
  }, [currentQuestionIndex, nextQuestionIndex, processedQuestions]);

  // Render the timeline questions with styling
  return (
    <div
      className="timeline-container"
      ref={timelineRef}
      style={{ height: `${playerHeight}px` }}
    >
      <h3 className="timeline-header">{language} Questions Timeline</h3>
      {processedQuestions.length === 0 && <p className="no-questions">No questions loaded.</p>}
      {processedQuestions.map((q, index) => {
        const isCurrent = index === currentQuestionIndex;
        const isNext = !isCurrent && index === nextQuestionIndex;
        const isPast = currentQuestionIndex === -1
          ? (nextQuestionIndex === -1 || index < nextQuestionIndex)
          : index < currentQuestionIndex;

        let itemClass = 'question-item';
        if (isCurrent) itemClass += ' current-question';
        else if (isNext) itemClass += ' next-question';
        else if (isPast) itemClass += ' past-question';

        return (
          <div
            key={`${q.q_id}-${q.startTime}`}
            ref={questionRefs.current[q.q_id]}
            className={itemClass}
            id={`q${q.startTime}-${q.q_id}`}
            onClick={() => onQuestionClick && onQuestionClick(q.startTime-2)}
            title={`Click to seek to ${formatTime(q.startTime)}`} // Add tooltip
            style={{ cursor: 'pointer' }} // Show pointer cursor on hover
          >
            <span className="question-time">[{formatTime(q.startTime)}]</span>
            <span className="question-text">{q.question}</span>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionTimeline;

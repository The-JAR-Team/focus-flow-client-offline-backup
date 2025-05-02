import React, { useEffect, useRef, useState } from 'react';
// Import functions from the new service file
import {
  formatTime,
  processQuestionsForTimeline,
  findNextQuestionIndex
} from '../services/questionTimelineService';
import '../styles/QuestionTimeline.css';

const QuestionTimeline = ({ questions, currentTime, language, playerHeight }) => {
  const timelineRef = useRef(null);
  const questionRefs = useRef({});
  const [processedQuestions, setProcessedQuestions] = useState([]);
  const [nextQuestionIndex, setNextQuestionIndex] = useState(-1);

  // Process questions using the service function
  useEffect(() => {
    const sorted = processQuestionsForTimeline(questions);
    setProcessedQuestions(sorted);
    // Initialize refs
    questionRefs.current = sorted.reduce((acc, q) => {
      acc[q.q_id] = React.createRef();
      return acc;
    }, {});
  }, [questions]); // Only re-process when the main questions array changes

  // Find the next question index using the service function
  useEffect(() => {
    const foundIndex = findNextQuestionIndex(processedQuestions, currentTime);
    if (foundIndex !== nextQuestionIndex) {
      setNextQuestionIndex(foundIndex);
    }
  }, [currentTime, processedQuestions, nextQuestionIndex]);

  // Effect to scroll the timeline (remains the same)
  useEffect(() => {
    if (nextQuestionIndex >= 0 && nextQuestionIndex < processedQuestions.length && timelineRef.current) {
      const questionIdToScroll = processedQuestions[nextQuestionIndex].q_id;
      const elementRef = questionRefs.current[questionIdToScroll];

      if (elementRef && elementRef.current) {
         // Determine the scroll position: aim to center the 'next' question
         const container = timelineRef.current;
         const element = elementRef.current;
         const containerHeight = container.offsetHeight;
         const elementTop = element.offsetTop - container.offsetTop; // Position relative to container top
         const elementHeight = element.offsetHeight;

         // Calculate the desired scroll position to center the element
         const scrollTo = elementTop - (containerHeight / 2) + (elementHeight / 2);

         container.scrollTo({
             top: Math.max(0, scrollTo), // Ensure not scrolling to negative values
             behavior: 'smooth',
         });
      }
    } else if (nextQuestionIndex === 0 && timelineRef.current) {
        // Scroll to top if the first question becomes next
         timelineRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (nextQuestionIndex === processedQuestions.length && processedQuestions.length > 0 && timelineRef.current) {
        // Scroll towards the last item if we are past all questions
        const lastQuestionId = processedQuestions[processedQuestions.length - 1].q_id;
        const lastElementRef = questionRefs.current[lastQuestionId];
        if (lastElementRef && lastElementRef.current) {
             lastElementRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest', // Scroll just enough to bring it into view
             });
        }
    }
  }, [nextQuestionIndex, processedQuestions]); // Scroll when the next question index changes


  // formatTime is now imported

  // getDisplayRange logic is simplified as we show all questions now

  return (
    <div
      className="timeline-container"
      ref={timelineRef}
      style={{ height: `${playerHeight}px` }} // Set height dynamically
    >
      <h3 className="timeline-header">{language} Questions Timeline</h3>
      {processedQuestions.length === 0 && <p className="no-questions">No questions loaded.</p>}
      {processedQuestions.map((q, index) => {
        const isNext = index === nextQuestionIndex;
        // Adjust logic slightly: current means the video time is between start and end
        const isCurrent = currentTime >= q.startTime && currentTime < q.endTime;
        // Past means the video time is at or after the end time
        const isPast = currentTime >= q.endTime;

        let itemClass = 'question-item';
        if (isCurrent) itemClass += ' current-question'; // Current takes precedence visually
        else if (isNext) itemClass += ' next-question'; // Then next
        else if (isPast) itemClass += ' past-question'; // Then past

        return (
          <div
            key={q.q_id}
            ref={questionRefs.current[q.q_id]}
            className={itemClass}
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

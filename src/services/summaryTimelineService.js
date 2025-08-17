import { parseTimeToSeconds } from './videoPlayerService';

export const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export const parseTimeFromString = (timeStr) => {
  return parseTimeToSeconds(timeStr);
};

/**
 * Fetch summary data for a video
 * @param {string} videoId - YouTube video ID
 * @param {string} language - Language for the summary (English or Hebrew)
 * @returns {Promise<Object>} - Video summary data
 */
export const fetchVideoSummary = async (videoId, language = 'English') => {
  const lang = language === 'Hebrew' ? 'Hebrew' : 'English';
  const res = await fetch(`${import.meta.env.BASE_URL}offline/${videoId}summary=${lang}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Offline summary not found');
  const data = await res.json();
  // Offline file may already be the summary object or wrapped; try common shapes
  return data.video_summary || data.summary || data;
};

/**
 * Process the summary data for the timeline display
 * @param {Object} summaryData - The summary data from the API
 * @returns {Array} - Processed subject data for display
 */
export const processSummaryForTimeline = (summaryData) => {
  if (!summaryData || !summaryData.summary) return [];

  // Extract subjects from the summary
  return Object.entries(summaryData.summary).map(([subjectName, subjectDetails]) => {
    // Process each subject
    const subjects = subjectDetails.map(subject => {
      const startTime = parseTimeFromString(subject.subject_start_time);
      const endTime = parseTimeFromString(subject.subject_end_time);

      // Process sub-summaries if they exist
      const subSummaries = subject.sub_summaries
        ? subject.sub_summaries.flatMap(subSummary => 
            subSummary.properties.map(prop => ({
              startTime: parseTimeFromString(prop.source_start_time),
              endTime: parseTimeFromString(prop.source_end_time),
              text: prop.summary_text
            }))
          )
        : [];

      return {
        id: `${subjectName}-${startTime}`,
        title: subject.subject_title,
        subjectName,
        overallSummary: subject.subject_overall_summary,
        startTime,
        endTime,
        subSummaries
      };
    });

    return subjects;
  }).flat();
};

/**
 * Find the current and next subjects based on the current video time
 * @param {Array} processedSubjects - The processed subjects list
 * @param {number} currentTime - The current video time in seconds
 * @returns {Object} - Object with currentSubjectIndex and nextSubjectIndex
 */
export const findCurrentAndNextSubject = (processedSubjects, currentTime) => {
  let currentSubjectIndex = -1;
  let nextSubjectIndex = -1;

  // Find current subject (the one whose time range includes current time)
  currentSubjectIndex = processedSubjects.findIndex(
    subject => currentTime >= subject.startTime && currentTime < subject.endTime
  );

  // Find next subject (first one that starts after current time)
  nextSubjectIndex = processedSubjects.findIndex(
    subject => subject.startTime > currentTime
  );

  return { currentSubjectIndex, nextSubjectIndex };
};

/**
 * Find the current sub-summary based on current time
 * @param {Object} subject - The current subject
 * @param {number} currentTime - The current video time in seconds
 * @returns {number} - The index of the current sub-summary, or -1 if none
 */
export const findCurrentSubSummary = (subject, currentTime) => {
  if (!subject || !subject.subSummaries) return -1;

  return subject.subSummaries.findIndex(
    summary => currentTime >= summary.startTime && currentTime < summary.endTime
  );
};

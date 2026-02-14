/**
 * ============================================
 * LESSON ENGINE
 * ============================================
 * Manages structured lessons and practice sessions
 * 
 * Responsibilities:
 * - Load lesson data from JSON
 * - Track lesson progress
 * - Provide phrases for practice
 * - Generate contextual prompts
 * - Manage lesson flow
 * 
 * Lesson Categories:
 * - Greetings
 * - Introductions
 * - Daily Conversation
 * - Workplace
 * - Emergency Phrases
 */

class LessonEngine {
    constructor() {
        // Load lessons from HTML
        this.lessons = this.loadLessons();
        
        // Current lesson tracking
        this.currentLesson = 'greetings';
        this.currentPhraseIndex = 0;
        this.practiceAttempts = 0;
        
        // Progress tracking
        this.lessonProgress = this.initializeProgress();
        
        this.log('Lesson Engine initialized');
    }

    /**
     * Load lesson data from HTML script tag
     */
    loadLessons() {
        const dataElement = document.getElementById('lessons-data');
        if (dataElement) {
            return JSON.parse(dataElement.textContent);
        }
        return {};
    }

    /**
     * Initialize progress tracking for all lessons
     */
    initializeProgress() {
        const progress = {};
        
        Object.keys(this.lessons).forEach(lessonKey => {
            progress[lessonKey] = {
                started: false,
                completed: false,
                phrasesCompleted: 0,
                totalPhrases: this.lessons[lessonKey].phrases.length,
                lastAccessed: null
            };
        });

        return progress;
    }

    /**
     * Get a specific lesson
     * @param {string} lessonKey - Lesson identifier
     * @returns {Object} Lesson data
     */
    getLesson(lessonKey) {
        return this.lessons[lessonKey] || null;
    }

    /**
     * Get current lesson
     * @returns {Object} Current lesson data
     */
    getCurrentLesson() {
        return this.getLesson(this.currentLesson);
    }

    /**
     * Switch to a different lesson
     * @param {string} lessonKey - Lesson to switch to
     * @returns {boolean} True if successful
     */
    switchLesson(lessonKey) {
        if (!this.lessons[lessonKey]) {
            this.log(`Lesson "${lessonKey}" not found`, 'error');
            return false;
        }

        this.currentLesson = lessonKey;
        this.currentPhraseIndex = 0;
        this.practiceAttempts = 0;

        // Update progress
        this.lessonProgress[lessonKey].started = true;
        this.lessonProgress[lessonKey].lastAccessed = Date.now();

        this.log(`Switched to lesson: ${lessonKey}`);
        return true;
    }

    /**
     * Get introduction message for current lesson
     * @returns {string} Intro message
     */
    getLessonIntro() {
        const lesson = this.getCurrentLesson();
        return lesson ? lesson.intro : "Welcome! Let's start practicing.";
    }

    /**
     * Get all phrases for current lesson
     * @returns {Array} Array of phrase objects
     */
    getLessonPhrases() {
        const lesson = this.getCurrentLesson();
        return lesson ? lesson.phrases : [];
    }

    /**
     * Get a random phrase from current lesson
     * @returns {Object} Phrase object
     */
    getRandomPhrase() {
        const phrases = this.getLessonPhrases();
        if (phrases.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * phrases.length);
        return phrases[randomIndex];
    }

    /**
     * Get next phrase in sequence
     * @returns {Object} Next phrase object
     */
    getNextPhrase() {
        const phrases = this.getLessonPhrases();
        if (phrases.length === 0) return null;

        const phrase = phrases[this.currentPhraseIndex];
        
        // Move to next phrase
        this.currentPhraseIndex = (this.currentPhraseIndex + 1) % phrases.length;
        
        return phrase;
    }

    /**
     * Get practice prompts for current lesson
     * @returns {Array} Array of prompt strings
     */
    getLessonPrompts() {
        const lesson = this.getCurrentLesson();
        return lesson ? lesson.prompts : [];
    }

    /**
     * Get a random prompt from current lesson
     * @returns {string} Prompt text
     */
    getRandomPrompt() {
        const prompts = this.getLessonPrompts();
        if (prompts.length === 0) return "What would you like to practice?";

        const randomIndex = Math.floor(Math.random() * prompts.length);
        return prompts[randomIndex];
    }

    /**
     * Get context for language analysis
     * @returns {Object} Context object with lesson info
     */
    getContext() {
        const lesson = this.getCurrentLesson();
        
        return {
            lessonKey: this.currentLesson,
            lessonTitle: lesson ? lesson.title : '',
            expectedPhrases: this.getLessonPhrases(),
            prompts: this.getLessonPrompts(),
            phraseIndex: this.currentPhraseIndex,
            attempts: this.practiceAttempts
        };
    }

    /**
     * Record a practice attempt
     * @param {boolean} successful - Whether attempt was successful
     */
    recordAttempt(successful) {
        this.practiceAttempts++;

        if (successful) {
            const progress = this.lessonProgress[this.currentLesson];
            progress.phrasesCompleted++;

            // Check if lesson is completed
            if (progress.phrasesCompleted >= progress.totalPhrases) {
                progress.completed = true;
                this.log(`Lesson "${this.currentLesson}" completed!`);
            }
        }
    }

    /**
     * Get progress for a specific lesson
     * @param {string} lessonKey - Lesson identifier
     * @returns {Object} Progress object
     */
    getLessonProgress(lessonKey) {
        return this.lessonProgress[lessonKey] || null;
    }

    /**
     * Get overall progress across all lessons
     * @returns {Object} Overall progress statistics
     */
    getOverallProgress() {
        const total = Object.keys(this.lessons).length;
        let started = 0;
        let completed = 0;

        Object.values(this.lessonProgress).forEach(progress => {
            if (progress.started) started++;
            if (progress.completed) completed++;
        });

        return {
            totalLessons: total,
            lessonsStarted: started,
            lessonsCompleted: completed,
            completionPercentage: Math.round((completed / total) * 100)
        };
    }

    /**
     * Get all lesson keys
     * @returns {Array} Array of lesson keys
     */
    getAllLessonKeys() {
        return Object.keys(this.lessons);
    }

    /**
     * Get lesson metadata (title, icon, etc.)
     * @param {string} lessonKey - Lesson identifier
     * @returns {Object} Metadata
     */
    getLessonMetadata(lessonKey) {
        const lesson = this.lessons[lessonKey];
        if (!lesson) return null;

        return {
            key: lessonKey,
            title: lesson.title,
            icon: lesson.icon,
            phraseCount: lesson.phrases.length,
            started: this.lessonProgress[lessonKey].started,
            completed: this.lessonProgress[lessonKey].completed
        };
    }

    /**
     * Get all lessons metadata
     * @returns {Array} Array of metadata objects
     */
    getAllLessonsMetadata() {
        return this.getAllLessonKeys().map(key => this.getLessonMetadata(key));
    }

    /**
     * Reset progress for a lesson
     * @param {string} lessonKey - Lesson to reset
     */
    resetLessonProgress(lessonKey) {
        if (this.lessonProgress[lessonKey]) {
            this.lessonProgress[lessonKey] = {
                started: false,
                completed: false,
                phrasesCompleted: 0,
                totalPhrases: this.lessons[lessonKey].phrases.length,
                lastAccessed: null
            };
            this.log(`Progress reset for lesson: ${lessonKey}`);
        }
    }

    /**
     * Reset all progress
     */
    resetAllProgress() {
        this.lessonProgress = this.initializeProgress();
        this.currentPhraseIndex = 0;
        this.practiceAttempts = 0;
        this.log('All progress reset');
    }

    /**
     * Get a friendly welcome message for lesson start
     * @param {string} lessonKey - Lesson starting
     * @returns {string} Welcome message
     */
    getWelcomeMessage(lessonKey) {
        const lesson = this.lessons[lessonKey];
        if (!lesson) return "Let's start practicing!";

        return `${lesson.icon} Welcome to ${lesson.title}! ${lesson.intro}`;
    }

    /**
     * Export progress data (for potential saving)
     * @returns {Object} Progress data
     */
    exportProgress() {
        return {
            currentLesson: this.currentLesson,
            lessonProgress: this.lessonProgress,
            timestamp: Date.now()
        };
    }

    /**
     * Import progress data (for potential loading)
     * @param {Object} data - Progress data to import
     */
    importProgress(data) {
        if (data.currentLesson && this.lessons[data.currentLesson]) {
            this.currentLesson = data.currentLesson;
        }
        
        if (data.lessonProgress) {
            this.lessonProgress = data.lessonProgress;
        }

        this.log('Progress imported');
    }

    /**
     * Log lesson engine information
     * @param {string} message - Message to log
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        const prefix = '[LessonEngine]';
        const timestamp = new Date().toLocaleTimeString();
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${timestamp} - ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} ${timestamp} - ${message}`);
                break;
            default:
                console.log(`${prefix} ${timestamp} - ${message}`);
        }
    }
}

// Export for use in other modules
window.LessonEngine = LessonEngine;

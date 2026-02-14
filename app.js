/**
 * ============================================
 * LINGUABRIDGE AI - MAIN APPLICATION
 * ============================================
 * Integrates all engines and manages the application flow
 * 
 * Architecture:
 * - State Manager: Finite state machine for voice control
 * - Voice Engine: Speech recognition and synthesis
 * - Language Engine: Grammar analysis and teaching
 * - Lesson Engine: Structured lesson management
 * - UI Engine: User interface updates
 */

class LinguaBridgeApp {
    constructor() {
        this.log('=== LinguaBridge AI Starting ===');

        // Initialize all engines
        this.stateManager = new StateManager();
        this.voiceEngine = new VoiceEngine(this.stateManager);
        this.languageEngine = new LanguageEngine();
        this.lessonEngine = new LessonEngine();
        this.uiEngine = new UIEngine(this.stateManager);

        // Language code mappings (ISO codes for speech API)
        this.languageCodes = {
            en: 'en-US',
            es: 'es-ES',
            de: 'de-DE',
            fr: 'fr-FR'
        };

        // Check browser support
        this.checkBrowserSupport();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize first lesson
        this.initializeFirstLesson();

        this.log('=== LinguaBridge AI Ready ===');
    }

    /**
     * Check if browser supports required features
     */
    checkBrowserSupport() {
        const availability = this.voiceEngine.getAvailability();

        if (!availability.fullySupported) {
            let message = 'Your browser does not fully support voice features. ';
            
            if (!availability.recognition) {
                message += 'Speech recognition is not available. ';
            }
            
            if (!availability.synthesis) {
                message += 'Speech synthesis is not available. ';
            }

            message += 'Please use Chrome, Edge, or Safari for the best experience.';
            
            this.uiEngine.showError(message);
            this.uiEngine.disableMicButton();
            
            this.log('Browser support incomplete', 'error');
        } else {
            this.log('Browser fully supports voice features');
        }
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Microphone button click
        const micButton = document.getElementById('micButton');
        micButton.addEventListener('click', () => this.handleMicClick());

        // Language selection changes
        const nativeLang = document.getElementById('native-lang');
        const learningLang = document.getElementById('learning-lang');

        nativeLang.addEventListener('change', () => this.handleLanguageChange());
        learningLang.addEventListener('change', () => this.handleLanguageChange());

        // Lesson button clicks
        const lessonButtons = document.querySelectorAll('.lesson-btn');
        lessonButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lessonKey = btn.dataset.lesson;
                this.switchLesson(lessonKey);
            });
        });

        // Voice engine callbacks
        this.voiceEngine.onTranscript((transcript, confidence) => {
            this.handleTranscript(transcript, confidence);
        });

        this.voiceEngine.onError((errorMessage) => {
            this.uiEngine.showError(errorMessage);
        });

        this.log('Event listeners set up');
    }

    /**
     * Initialize the first lesson
     */
    initializeFirstLesson() {
        const firstLesson = 'greetings';
        this.lessonEngine.switchLesson(firstLesson);
        
        // Set initial languages
        this.handleLanguageChange();
        
        this.log(`Initialized with lesson: ${firstLesson}`);
    }

    /**
     * Handle microphone button click
     */
    handleMicClick() {
        const currentState = this.stateManager.getState();

        this.log(`Mic button clicked in state: ${currentState}`);

        // Can only start listening from IDLE state
        if (currentState === StateManager.STATES.IDLE) {
            this.startListening();
        } 
        // Can cancel listening if currently listening
        else if (currentState === StateManager.STATES.LISTENING) {
            this.voiceEngine.stopListening();
        }
        // Ignore clicks in other states
        else {
            this.log('Mic click ignored - not in IDLE or LISTENING state', 'warn');
        }
    }

    /**
     * Start listening for user speech
     */
    startListening() {
        // Validate language selection
        if (!this.uiEngine.validateLanguageSelections()) {
            return;
        }

        const success = this.voiceEngine.startListening();

        if (success) {
            this.log('Started listening');
            
            // Show hint about the current lesson prompt
            const prompt = this.lessonEngine.getRandomPrompt();
            this.uiEngine.setCustomHint(`Try: ${prompt}`);
        }
    }

    /**
     * Handle received transcript from speech recognition
     * @param {string} transcript - User's speech as text
     * @param {number} confidence - Confidence score
     */
    handleTranscript(transcript, confidence) {
        this.log(`Processing transcript: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

        // Add user message to chat
        this.uiEngine.addMessage(transcript, 'user', false);

        // Show typing indicator
        this.uiEngine.showTypingIndicator();

        // Get lesson context
        const context = this.lessonEngine.getContext();

        // Analyze with language engine
        const response = this.languageEngine.analyzeAndRespond(transcript, context);

        // Record attempt
        const successful = confidence > 0.7; // Consider high confidence as successful
        this.lessonEngine.recordAttempt(successful);

        // Format response text
        const responseText = this.languageEngine.formatResponse(response);

        // Remove typing indicator
        this.uiEngine.removeTypingIndicator();

        // Add assistant response to chat
        this.uiEngine.addMessage(responseText, 'assistant', true);

        // Speak the response
        this.speakResponse(responseText);
    }

    /**
     * Speak the AI response
     * @param {string} text - Text to speak
     */
    async speakResponse(text) {
        try {
            await this.voiceEngine.speak(text);
            this.log('Finished speaking response');
        } catch (error) {
            this.log(`Speech error: ${error.message}`, 'error');
            this.stateManager.reset();
        }
    }

    /**
     * Handle language selection changes
     */
    handleLanguageChange() {
        const selections = this.uiEngine.getLanguageSelections();

        // Validate
        if (selections.native === selections.learning) {
            this.log('Invalid language selection - same language', 'warn');
            return;
        }

        // Update language engine
        this.languageEngine.setNativeLanguage(selections.native);
        this.languageEngine.setLearningLanguage(selections.learning);

        // Update voice engine
        const learningCode = this.languageCodes[selections.learning];
        this.voiceEngine.setRecognitionLanguage(learningCode);
        this.voiceEngine.setSynthesisLanguage(learningCode);

        this.log(`Languages updated - Native: ${selections.native}, Learning: ${selections.learning}`);

        // Show message about language change
        const languageName = this.getLanguageName(selections.learning);
        this.uiEngine.addMessage(
            `Great! Now you're learning ${languageName}. Let's practice!`,
            'assistant',
            false
        );
    }

    /**
     * Switch to a different lesson
     * @param {string} lessonKey - Lesson to switch to
     */
    switchLesson(lessonKey) {
        // Can't switch lessons while speaking or listening
        if (!this.stateManager.is(StateManager.STATES.IDLE)) {
            this.log('Cannot switch lessons - not in IDLE state', 'warn');
            return;
        }

        const success = this.lessonEngine.switchLesson(lessonKey);

        if (success) {
            // Update UI
            this.uiEngine.setActiveLesson(lessonKey);

            // Get lesson intro
            const intro = this.lessonEngine.getLessonIntro();
            this.uiEngine.showLessonIntro(intro);

            // Speak the intro
            this.stateManager.transition(StateManager.STATES.PROCESSING);
            this.speakResponse(intro);

            this.log(`Switched to lesson: ${lessonKey}`);
        }
    }

    /**
     * Get language name from code
     * @param {string} code - Language code
     * @returns {string} Language name
     */
    getLanguageName(code) {
        const names = {
            en: 'English',
            es: 'Spanish',
            de: 'German',
            fr: 'French'
        };
        return names[code] || code;
    }

    /**
     * Get application status for debugging
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            state: this.stateManager.getState(),
            currentLesson: this.lessonEngine.currentLesson,
            languages: this.uiEngine.getLanguageSelections(),
            voiceSupport: this.voiceEngine.getAvailability(),
            progress: this.lessonEngine.getOverallProgress()
        };
    }

    /**
     * Log application information
     * @param {string} message - Message to log
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        const prefix = '[LinguaBridge]';
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

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.linguaBridge = new LinguaBridgeApp();

    // Expose status check to console for debugging
    window.checkStatus = () => {
        console.table(window.linguaBridge.getStatus());
    };

    console.log('%c🎓 LinguaBridge AI Loaded!', 'color: #d97706; font-size: 16px; font-weight: bold;');
    console.log('%cType checkStatus() to see app status', 'color: #78716c; font-size: 12px;');
});

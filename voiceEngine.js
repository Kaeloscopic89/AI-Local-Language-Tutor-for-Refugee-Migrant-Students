/**
 * ============================================
 * VOICE ENGINE
 * ============================================
 * Handles all voice interaction using Web Speech API
 * 
 * Features:
 * - Speech Recognition (listening to user)
 * - Speech Synthesis (speaking responses)
 * - Feedback loop prevention
 * - Duplicate transcript filtering
 * - State-aware operation
 * 
 * Critical Rules:
 * - Recognition MUST stop before synthesis starts
 * - Recognition does NOT auto-restart
 * - Only responds to manual mic button clicks
 * - Ignores duplicates and mic input while speaking
 */

class VoiceEngine {
    constructor(stateManager) {
        this.stateManager = stateManager;
        
        // Speech Recognition setup
        this.recognition = null;
        this.recognitionAvailable = false;
        this.initializeRecognition();
        
        // Speech Synthesis setup
        this.synthesis = window.speechSynthesis;
        this.synthesisAvailable = 'speechSynthesis' in window;
        
        // Track last transcript to prevent duplicates
        this.lastTranscript = '';
        this.lastTranscriptTime = 0;
        
        // Callbacks for events
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        
        // Current language settings
        this.recognitionLang = 'es-ES'; // Language being learned
        this.synthesisLang = 'es-ES';
        
        // Debug mode
        this.debugMode = true;
        
        this.log('Voice Engine initialized');
    }

    /**
     * Initialize Speech Recognition API
     */
    initializeRecognition() {
        // Check for Speech Recognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.log('Speech Recognition not supported', 'error');
            this.recognitionAvailable = false;
            return;
        }

        // Create recognition instance
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = false; // Stop after one phrase
        this.recognition.interimResults = false; // Only final results
        this.recognition.maxAlternatives = 1; // Single best result
        this.recognition.lang = this.recognitionLang;

        // Set up event handlers
        this.setupRecognitionHandlers();
        
        this.recognitionAvailable = true;
        this.log('Speech Recognition ready');
    }

    /**
     * Set up all recognition event handlers
     */
    setupRecognitionHandlers() {
        // Recognition started successfully
        this.recognition.onstart = () => {
            this.log('Recognition started');
        };

        // Recognition ended
        this.recognition.onend = () => {
            this.log('Recognition ended');
            
            // If we're still in LISTENING state, transition to IDLE
            // This happens when no speech detected or user stops manually
            if (this.stateManager.is(StateManager.STATES.LISTENING)) {
                this.stateManager.transition(StateManager.STATES.IDLE);
            }
        };

        // Speech detected and transcribed
        this.recognition.onresult = (event) => {
            const result = event.results[0];
            const transcript = result[0].transcript.trim();
            const confidence = result[0].confidence;

            this.log(`Transcript: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

            // Check for duplicate (same text within 2 seconds)
            const now = Date.now();
            if (transcript === this.lastTranscript && (now - this.lastTranscriptTime) < 2000) {
                this.log('Duplicate transcript ignored', 'warn');
                return;
            }

            // Store this transcript
            this.lastTranscript = transcript;
            this.lastTranscriptTime = now;

            // Only process if in LISTENING state
            if (this.stateManager.is(StateManager.STATES.LISTENING)) {
                // Transition to PROCESSING
                this.stateManager.transition(StateManager.STATES.PROCESSING);
                
                // Call the transcript callback
                if (this.onTranscriptCallback) {
                    this.onTranscriptCallback(transcript, confidence);
                }
            }
        };

        // Error occurred
        this.recognition.onerror = (event) => {
            this.log(`Recognition error: ${event.error}`, 'error');
            
            // Handle specific errors
            switch (event.error) {
                case 'no-speech':
                    this.log('No speech detected', 'warn');
                    break;
                case 'audio-capture':
                    this.log('No microphone found', 'error');
                    if (this.onErrorCallback) {
                        this.onErrorCallback('No microphone detected. Please check your device.');
                    }
                    break;
                case 'not-allowed':
                    this.log('Microphone permission denied', 'error');
                    if (this.onErrorCallback) {
                        this.onErrorCallback('Microphone access denied. Please allow microphone access.');
                    }
                    break;
            }

            // Reset to IDLE on error
            this.stateManager.reset();
        };
    }

    /**
     * Start listening for speech
     * @returns {boolean} True if started successfully
     */
    startListening() {
        // Can only start from IDLE state
        if (!this.stateManager.is(StateManager.STATES.IDLE)) {
            this.log('Cannot start listening - not in IDLE state', 'warn');
            return false;
        }

        // Check if recognition is available
        if (!this.recognitionAvailable) {
            this.log('Speech Recognition not available', 'error');
            if (this.onErrorCallback) {
                this.onErrorCallback('Speech recognition is not supported in your browser.');
            }
            return false;
        }

        try {
            // Transition to LISTENING state
            if (!this.stateManager.transition(StateManager.STATES.LISTENING)) {
                return false;
            }

            // Update recognition language
            this.recognition.lang = this.recognitionLang;
            
            // Start recognition
            this.recognition.start();
            this.log(`Started listening in ${this.recognitionLang}`);
            
            return true;
        } catch (error) {
            this.log(`Failed to start recognition: ${error.message}`, 'error');
            this.stateManager.reset();
            return false;
        }
    }

    /**
     * Stop listening (manual stop)
     */
    stopListening() {
        if (this.recognition && this.stateManager.is(StateManager.STATES.LISTENING)) {
            this.recognition.stop();
            this.log('Stopped listening (manual)');
        }
    }

    /**
     * Speak text using speech synthesis
     * @param {string} text - Text to speak
     * @param {string} lang - Language code (optional, uses synthesisLang by default)
     * @returns {Promise} Resolves when speech finishes
     */
    speak(text, lang = null) {
        return new Promise((resolve, reject) => {
            // Must be in PROCESSING state to start speaking
            if (!this.stateManager.is(StateManager.STATES.PROCESSING)) {
                this.log('Cannot speak - not in PROCESSING state', 'warn');
                reject(new Error('Invalid state for speaking'));
                return;
            }

            // Check if synthesis is available
            if (!this.synthesisAvailable) {
                this.log('Speech Synthesis not available', 'error');
                reject(new Error('Speech synthesis not available'));
                return;
            }

            // CRITICAL: Stop any ongoing speech before starting new one
            if (this.synthesis.speaking) {
                this.synthesis.cancel();
                this.log('Cancelled previous speech');
            }

            // CRITICAL: Ensure recognition is completely stopped
            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch (e) {
                    // Already stopped, ignore
                }
            }

            // Transition to SPEAKING state
            if (!this.stateManager.transition(StateManager.STATES.SPEAKING)) {
                reject(new Error('Failed to transition to SPEAKING state'));
                return;
            }

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang || this.synthesisLang;
            utterance.rate = 0.9; // Slightly slower for learning
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            // Handle speech events
            utterance.onstart = () => {
                this.log(`Started speaking: "${text.substring(0, 50)}..."`);
            };

            utterance.onend = () => {
                this.log('Finished speaking');
                
                // Transition back to IDLE when done speaking
                this.stateManager.transition(StateManager.STATES.IDLE);
                
                resolve();
            };

            utterance.onerror = (event) => {
                this.log(`Speech error: ${event.error}`, 'error');
                this.stateManager.reset();
                reject(new Error(event.error));
            };

            // Speak the utterance
            this.synthesis.speak(utterance);
        });
    }

    /**
     * Cancel any ongoing speech
     */
    cancelSpeech() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
            this.log('Speech cancelled');
        }
    }

    /**
     * Set the recognition language (language being learned)
     * @param {string} langCode - Language code (e.g., 'es-ES', 'de-DE')
     */
    setRecognitionLanguage(langCode) {
        this.recognitionLang = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
        this.log(`Recognition language set to ${langCode}`);
    }

    /**
     * Set the synthesis language (for AI responses)
     * @param {string} langCode - Language code
     */
    setSynthesisLanguage(langCode) {
        this.synthesisLang = langCode;
        this.log(`Synthesis language set to ${langCode}`);
    }

    /**
     * Register callback for when transcript is received
     * @param {Function} callback - Called with (transcript, confidence)
     */
    onTranscript(callback) {
        this.onTranscriptCallback = callback;
    }

    /**
     * Register callback for errors
     * @param {Function} callback - Called with (errorMessage)
     */
    onError(callback) {
        this.onErrorCallback = callback;
    }

    /**
     * Check if voice features are available
     * @returns {Object} Availability status
     */
    getAvailability() {
        return {
            recognition: this.recognitionAvailable,
            synthesis: this.synthesisAvailable,
            fullySupported: this.recognitionAvailable && this.synthesisAvailable
        };
    }

    /**
     * Get available synthesis voices
     * @returns {Array} List of available voices
     */
    getVoices() {
        return this.synthesis.getVoices();
    }

    /**
     * Log voice engine information
     * @param {string} message - Message to log
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        if (!this.debugMode) return;

        const prefix = '[VoiceEngine]';
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
window.VoiceEngine = VoiceEngine;

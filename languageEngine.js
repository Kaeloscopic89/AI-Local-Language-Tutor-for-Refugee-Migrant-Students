/**
 * ============================================
 * LANGUAGE ENGINE
 * ============================================
 * Intelligent language tutor that analyzes, corrects, and teaches
 * 
 * Responsibilities:
 * - Analyze user input for grammar and vocabulary
 * - Provide corrections in a teaching manner
 * - Give simple explanations of mistakes
 * - Encourage the learner
 * - Generate relevant follow-up questions
 * 
 * Response Structure:
 * 1. Correction (if needed)
 * 2. Explanation (simple and clear)
 * 3. Encouragement (positive reinforcement)
 * 4. Next Practice Prompt (relevant question)
 */

class LanguageEngine {
    constructor() {
        // Load language data from HTML
        this.translations = this.loadTranslations();
        
        // Current languages
        this.nativeLanguage = 'en';
        this.learningLanguage = 'es';
        
        // Conversation context
        this.conversationHistory = [];
        this.currentTopic = null;
        
        // Common patterns for basic language learning
        this.initializePatterns();
        
        this.log('Language Engine initialized');
    }

    /**
     * Load translation data from HTML script tag
     */
    loadTranslations() {
        const dataElement = document.getElementById('translations-data');
        if (dataElement) {
            return JSON.parse(dataElement.textContent);
        }
        return {};
    }

    /**
     * Initialize common language patterns for analysis
     */
    initializePatterns() {
        // Greeting patterns
        this.greetingPatterns = {
            en: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'goodbye', 'bye'],
            es: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'adiós', 'hasta luego'],
            de: ['hallo', 'guten morgen', 'guten tag', 'guten abend', 'auf wiedersehen', 'tschüss'],
            fr: ['bonjour', 'salut', 'bonsoir', 'au revoir', 'à bientôt']
        };

        // Introduction patterns
        this.introPatterns = {
            en: ['my name is', 'i am', "i'm", 'what is your name', 'how are you'],
            es: ['me llamo', 'soy', 'cómo te llamas', 'cómo estás', 'qué tal'],
            de: ['ich heiße', 'ich bin', 'wie heißt du', 'wie geht es dir'],
            fr: ["je m'appelle", 'je suis', 'comment tu t\'appelles', 'comment ça va']
        };

        // Encouragement phrases in different languages
        this.encouragements = {
            en: [
                'Great job!',
                'Well done!',
                'Excellent!',
                'You\'re doing great!',
                'Perfect!',
                'Nice work!',
                'Keep it up!'
            ],
            es: [
                '¡Muy bien!',
                '¡Excelente!',
                '¡Perfecto!',
                '¡Buen trabajo!',
                '¡Genial!',
                '¡Sigue así!'
            ],
            de: [
                'Sehr gut!',
                'Ausgezeichnet!',
                'Perfekt!',
                'Gut gemacht!',
                'Prima!',
                'Weiter so!'
            ],
            fr: [
                'Très bien!',
                'Excellent!',
                'Parfait!',
                'Bien joué!',
                'Génial!',
                'Continue comme ça!'
            ]
        };
    }

    /**
     * Main method: Analyze user input and generate teaching response
     * @param {string} userInput - What the user said
     * @param {Object} context - Current lesson context
     * @returns {Object} Teaching response
     */
    analyzeAndRespond(userInput, context = {}) {
        this.log(`Analyzing: "${userInput}"`);

        // Normalize input
        const normalized = userInput.toLowerCase().trim();
        
        // Add to conversation history
        this.conversationHistory.push({
            input: normalized,
            timestamp: Date.now()
        });

        // Determine response based on context and input
        let response;

        // Check if this matches expected lesson content
        if (context.expectedPhrases && context.expectedPhrases.length > 0) {
            response = this.checkAgainstExpected(normalized, context.expectedPhrases);
        } else {
            // General conversation analysis
            response = this.generalAnalysis(normalized);
        }

        // Generate next practice prompt
        response.nextPrompt = this.generateNextPrompt(context);

        return response;
    }

    /**
     * Check user input against expected phrases from lesson
     * @param {string} input - User input
     * @param {Array} expectedPhrases - Expected phrase objects
     * @returns {Object} Response object
     */
    checkAgainstExpected(input, expectedPhrases) {
        const response = {
            correction: null,
            explanation: null,
            encouragement: null,
            type: 'practice'
        };

        // Find the closest match
        let bestMatch = null;
        let bestSimilarity = 0;

        expectedPhrases.forEach(phrase => {
            const targetText = phrase[this.learningLanguage].toLowerCase();
            const similarity = this.calculateSimilarity(input, targetText);
            
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = phrase;
            }
        });

        // If very close match (>80% similar)
        if (bestSimilarity > 0.8) {
            response.correction = bestMatch[this.learningLanguage];
            response.explanation = `Perfect! That's how you say "${bestMatch.text}" in ${this.getLanguageName(this.learningLanguage)}.`;
            response.encouragement = this.getRandomEncouragement();
        }
        // If partial match (50-80% similar)
        else if (bestSimilarity > 0.5) {
            response.correction = bestMatch[this.learningLanguage];
            response.explanation = `Close! You said "${input}", but the correct phrase is "${bestMatch[this.learningLanguage]}". Remember to pay attention to pronunciation.`;
            response.encouragement = "Don't worry, practice makes perfect!";
        }
        // No clear match
        else {
            response.correction = null;
            response.explanation = `I heard "${input}". That's interesting! Let me help you with the phrase we're practicing.`;
            response.encouragement = "Let's try again together!";
            
            if (expectedPhrases.length > 0) {
                const example = expectedPhrases[0];
                response.explanation += ` Try saying: "${example[this.learningLanguage]}"`;
            }
        }

        return response;
    }

    /**
     * General analysis when no specific expected phrases
     * @param {string} input - User input
     * @returns {Object} Response object
     */
    generalAnalysis(input) {
        const response = {
            correction: null,
            explanation: null,
            encouragement: null,
            type: 'conversation'
        };

        // Check if it's a greeting
        const isGreeting = this.greetingPatterns[this.learningLanguage].some(
            pattern => input.includes(pattern)
        );

        if (isGreeting) {
            response.correction = input;
            response.explanation = `Nice! You greeted me in ${this.getLanguageName(this.learningLanguage)}.`;
            response.encouragement = this.getRandomEncouragement();
            return response;
        }

        // Check if it's an introduction
        const isIntro = this.introPatterns[this.learningLanguage].some(
            pattern => input.includes(pattern)
        );

        if (isIntro) {
            response.correction = input;
            response.explanation = `Great! You're introducing yourself in ${this.getLanguageName(this.learningLanguage)}.`;
            response.encouragement = this.getRandomEncouragement();
            return response;
        }

        // Default response for unrecognized input
        response.explanation = `I heard you say: "${input}". That's a good attempt!`;
        response.encouragement = "Keep practicing, and you'll improve quickly!";

        return response;
    }

    /**
     * Generate next practice prompt based on context
     * @param {Object} context - Current lesson context
     * @returns {string} Next prompt
     */
    generateNextPrompt(context) {
        const prompts = context.prompts || [];
        
        if (prompts.length > 0) {
            // Get a random prompt from available prompts
            const randomIndex = Math.floor(Math.random() * prompts.length);
            return prompts[randomIndex];
        }

        // Default prompts based on language
        const defaultPrompts = {
            en: "Can you introduce yourself?",
            es: "Try greeting me in Spanish!",
            de: "Try saying hello in German!",
            fr: "Try greeting me in French!"
        };

        return defaultPrompts[this.learningLanguage] || "What would you like to practice?";
    }

    /**
     * Calculate similarity between two strings (simple Levenshtein-based)
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    calculateSimilarity(str1, str2) {
        // Simple word-based similarity for demonstration
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        let matches = 0;
        words1.forEach(word => {
            if (words2.includes(word)) {
                matches++;
            }
        });

        const maxLength = Math.max(words1.length, words2.length);
        return maxLength > 0 ? matches / maxLength : 0;
    }

    /**
     * Get random encouragement in current learning language
     * @returns {string} Encouragement phrase
     */
    getRandomEncouragement() {
        const phrases = this.encouragements[this.learningLanguage] || this.encouragements.en;
        const randomIndex = Math.floor(Math.random() * phrases.length);
        return phrases[randomIndex];
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
     * Set the native language
     * @param {string} langCode - Language code
     */
    setNativeLanguage(langCode) {
        this.nativeLanguage = langCode;
        this.log(`Native language set to ${langCode}`);
    }

    /**
     * Set the learning language
     * @param {string} langCode - Language code
     */
    setLearningLanguage(langCode) {
        this.learningLanguage = langCode;
        this.log(`Learning language set to ${langCode}`);
    }

    /**
     * Format response for display
     * @param {Object} response - Response object
     * @returns {string} Formatted text for display/speech
     */
    formatResponse(response) {
        let formatted = '';

        if (response.correction) {
            formatted += response.correction + '. ';
        }

        if (response.explanation) {
            formatted += response.explanation + ' ';
        }

        if (response.encouragement) {
            formatted += response.encouragement + ' ';
        }

        if (response.nextPrompt) {
            formatted += response.nextPrompt;
        }

        return formatted.trim();
    }

    /**
     * Get conversation history
     * @returns {Array} History array
     */
    getHistory() {
        return this.conversationHistory;
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        this.log('Conversation history cleared');
    }

    /**
     * Log language engine information
     * @param {string} message - Message to log
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        const prefix = '[LanguageEngine]';
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
window.LanguageEngine = LanguageEngine;

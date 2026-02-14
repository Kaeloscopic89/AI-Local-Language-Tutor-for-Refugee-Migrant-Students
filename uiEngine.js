/**
 * ============================================
 * UI ENGINE
 * ============================================
 * Manages all user interface updates and animations
 * 
 * Responsibilities:
 * - Update status indicators
 * - Add message bubbles to chat
 * - Animate microphone button
 * - Show typing animations
 * - Update lesson navigation
 * - Handle visual feedback
 */

class UIEngine {
    constructor(stateManager) {
        this.stateManager = stateManager;
        
        // Cache DOM elements
        this.elements = {
            chatContainer: document.getElementById('chatContainer'),
            micButton: document.getElementById('micButton'),
            statusText: document.getElementById('statusText'),
            statusDot: document.querySelector('.status-dot'),
            hintText: document.getElementById('hintText'),
            nativeLangSelect: document.getElementById('native-lang'),
            learningLangSelect: document.getElementById('learning-lang'),
            lessonButtons: document.querySelectorAll('.lesson-btn')
        };

        // State labels for display
        this.stateLabels = {
            IDLE: 'Ready',
            LISTENING: 'Listening...',
            PROCESSING: 'Processing...',
            SPEAKING: 'Speaking...'
        };

        // State hints
        this.stateHints = {
            IDLE: 'Click the microphone to speak',
            LISTENING: 'Speak now...',
            PROCESSING: 'Analyzing your response...',
            SPEAKING: 'Playing response...'
        };

        // Listen for state changes
        this.stateManager.addListener((prev, current) => this.onStateChange(prev, current));

        this.log('UI Engine initialized');
    }

    /**
     * Handle state changes and update UI accordingly
     * @param {string} previousState - Previous state
     * @param {string} newState - New state
     */
    onStateChange(previousState, newState) {
        this.log(`UI updating for state: ${previousState} → ${newState}`);

        // Update status indicator
        this.updateStatus(newState);

        // Update microphone button
        this.updateMicButton(newState);

        // Update hint text
        this.updateHint(newState);
    }

    /**
     * Update status indicator (dot and text)
     * @param {string} state - Current state
     */
    updateStatus(state) {
        const { statusText, statusDot } = this.elements;

        // Update text
        statusText.textContent = this.stateLabels[state] || 'Unknown';

        // Update dot classes
        statusDot.classList.remove('listening', 'speaking', 'processing');
        
        switch (state) {
            case StateManager.STATES.LISTENING:
                statusDot.classList.add('listening');
                break;
            case StateManager.STATES.SPEAKING:
                statusDot.classList.add('speaking');
                break;
            case StateManager.STATES.PROCESSING:
                statusDot.classList.add('processing');
                break;
        }
    }

    /**
     * Update microphone button appearance
     * @param {string} state - Current state
     */
    updateMicButton(state) {
        const { micButton } = this.elements;

        // Remove all state classes
        micButton.classList.remove('listening', 'processing', 'speaking');

        // Add current state class
        if (state === StateManager.STATES.LISTENING) {
            micButton.classList.add('listening');
        } else if (state === StateManager.STATES.PROCESSING) {
            micButton.classList.add('processing');
        } else if (state === StateManager.STATES.SPEAKING) {
            micButton.classList.add('speaking');
        }
    }

    /**
     * Update hint text below microphone
     * @param {string} state - Current state
     */
    updateHint(state) {
        const { hintText } = this.elements;
        hintText.textContent = this.stateHints[state] || '';
    }

    /**
     * Clear the welcome message
     */
    clearWelcome() {
        const welcome = this.elements.chatContainer.querySelector('.welcome-message');
        if (welcome) {
            welcome.classList.add('fade-out');
            setTimeout(() => welcome.remove(), 300);
        }
    }

    /**
     * Add a message to the chat
     * @param {string} text - Message text
     * @param {string} sender - 'user' or 'assistant'
     * @param {boolean} animate - Whether to show typing animation
     */
    addMessage(text, sender = 'assistant', animate = false) {
        this.clearWelcome();

        const { chatContainer } = this.elements;

        // Create message container
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🎓';

        // Create content container
        const content = document.createElement('div');
        content.className = 'message-content';

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        // Add to chat
        chatContainer.appendChild(messageDiv);
        
        // Show text (with or without animation)
        if (animate && sender === 'assistant') {
            this.typewriterEffect(content, text);
        } else {
            content.innerHTML = this.formatMessageText(text);
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Format message text with styling
     * @param {string} text - Raw text
     * @returns {string} Formatted HTML
     */
    formatMessageText(text) {
        // Split into sections if response has structure
        const lines = text.split('. ').filter(line => line.trim());
        
        if (lines.length <= 1) {
            return `<p class="message-text">${text}</p>`;
        }

        // Create paragraphs for better readability
        return lines.map(line => {
            // Add period back if missing
            const formatted = line.trim().endsWith('.') ? line : line + '.';
            return `<p class="message-text">${formatted}</p>`;
        }).join('');
    }

    /**
     * Typewriter effect for assistant messages
     * @param {HTMLElement} element - Element to type into
     * @param {string} text - Text to type
     * @param {number} speed - Typing speed in ms
     */
    typewriterEffect(element, text, speed = 30) {
        let index = 0;
        const formatted = this.formatMessageText(text);
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = formatted;
        const paragraphs = temp.querySelectorAll('p');

        // Type each paragraph
        let currentP = 0;
        
        const typeNextParagraph = () => {
            if (currentP >= paragraphs.length) return;

            const p = document.createElement('p');
            p.className = 'message-text';
            element.appendChild(p);

            const paragraphText = paragraphs[currentP].textContent;
            let charIndex = 0;

            const typeChar = () => {
                if (charIndex < paragraphText.length) {
                    p.textContent += paragraphText.charAt(charIndex);
                    charIndex++;
                    this.scrollToBottom();
                    setTimeout(typeChar, speed);
                } else {
                    currentP++;
                    setTimeout(typeNextParagraph, 100);
                }
            };

            typeChar();
        };

        typeNextParagraph();
    }

    /**
     * Show typing indicator (dots animation)
     */
    showTypingIndicator() {
        this.clearWelcome();

        const { chatContainer } = this.elements;

        // Create typing indicator
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant typing-indicator';
        messageDiv.id = 'typing-indicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🎓';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `
            <div class="typing-animation">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatContainer.appendChild(messageDiv);

        this.scrollToBottom();
    }

    /**
     * Remove typing indicator
     */
    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        const { chatContainer } = this.elements;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    /**
     * Update active lesson button
     * @param {string} lessonKey - Active lesson key
     */
    setActiveLesson(lessonKey) {
        this.elements.lessonButtons.forEach(btn => {
            if (btn.dataset.lesson === lessonKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Show an error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.addMessage(`⚠️ ${message}`, 'assistant', false);
    }

    /**
     * Show a success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.addMessage(`✅ ${message}`, 'assistant', false);
    }

    /**
     * Get current language selections
     * @returns {Object} Selected languages
     */
    getLanguageSelections() {
        return {
            native: this.elements.nativeLangSelect.value,
            learning: this.elements.learningLangSelect.value
        };
    }

    /**
     * Validate language selections (can't be the same)
     * @returns {boolean} True if valid
     */
    validateLanguageSelections() {
        const { native, learning } = this.getLanguageSelections();
        
        if (native === learning) {
            this.showError('Please select different languages for native and learning!');
            return false;
        }

        return true;
    }

    /**
     * Show lesson introduction
     * @param {string} introText - Introduction text
     */
    showLessonIntro(introText) {
        this.clearWelcome();
        this.addMessage(introText, 'assistant', true);
    }

    /**
     * Clear all messages from chat
     */
    clearChat() {
        this.elements.chatContainer.innerHTML = '';
    }

    /**
     * Restore welcome message
     */
    showWelcome() {
        this.clearChat();
        
        const welcomeHTML = `
            <div class="welcome-message">
                <div class="avatar-large">
                    <div class="avatar-core"></div>
                    <div class="avatar-ring"></div>
                    <div class="avatar-pulse"></div>
                </div>
                <h2 class="welcome-title">Welcome to LinguaBridge AI</h2>
                <p class="welcome-subtitle">Your personal voice language tutor. Click the microphone to start practicing!</p>
            </div>
        `;
        
        this.elements.chatContainer.innerHTML = welcomeHTML;
    }

    /**
     * Disable microphone button
     */
    disableMicButton() {
        this.elements.micButton.disabled = true;
        this.elements.micButton.style.opacity = '0.5';
        this.elements.micButton.style.cursor = 'not-allowed';
    }

    /**
     * Enable microphone button
     */
    enableMicButton() {
        this.elements.micButton.disabled = false;
        this.elements.micButton.style.opacity = '1';
        this.elements.micButton.style.cursor = 'pointer';
    }

    /**
     * Flash microphone button (for feedback)
     * @param {string} color - Color to flash
     */
    flashMicButton(color = '#059669') {
        const { micButton } = this.elements;
        const originalBg = micButton.style.background;
        
        micButton.style.background = color;
        
        setTimeout(() => {
            micButton.style.background = originalBg;
        }, 200);
    }

    /**
     * Update hint text with custom message
     * @param {string} message - Custom hint
     */
    setCustomHint(message) {
        this.elements.hintText.textContent = message;
    }

    /**
     * Get chat container element (for advanced usage)
     * @returns {HTMLElement} Chat container
     */
    getChatContainer() {
        return this.elements.chatContainer;
    }

    /**
     * Log UI engine information
     * @param {string} message - Message to log
     * @param {string} level - Log level
     */
    log(message, level = 'info') {
        const prefix = '[UIEngine]';
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
window.UIEngine = UIEngine;

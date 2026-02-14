/**
 * ============================================
 * STATE MANAGER
 * ============================================
 * Manages the finite state machine for voice control
 * 
 * States:
 * - IDLE: Ready to start listening
 * - LISTENING: Actively recording user speech
 * - PROCESSING: Analyzing and generating response
 * - SPEAKING: AI is speaking the response
 * 
 * Rules:
 * - Only one state can be active at a time
 * - Recognition must stop before speech synthesis
 * - Recognition does not auto-restart
 * - State transitions must follow valid paths
 */

class StateManager {
    /**
     * Valid state constants
     */
    static STATES = {
        IDLE: 'IDLE',
        LISTENING: 'LISTENING',
        PROCESSING: 'PROCESSING',
        SPEAKING: 'SPEAKING'
    };

    /**
     * Valid state transitions
     * Defines which states can transition to which other states
     */
    static TRANSITIONS = {
        IDLE: ['LISTENING'],
        LISTENING: ['PROCESSING', 'IDLE'],
        PROCESSING: ['SPEAKING', 'IDLE'],
        SPEAKING: ['IDLE']
    };

    constructor() {
        // Initialize in IDLE state
        this.currentState = StateManager.STATES.IDLE;
        
        // Store state change listeners
        this.listeners = [];
        
        // Debug mode flag
        this.debugMode = true;
    }

    /**
     * Get the current state
     * @returns {string} Current state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Check if in a specific state
     * @param {string} state - State to check
     * @returns {boolean} True if in that state
     */
    is(state) {
        return this.currentState === state;
    }

    /**
     * Attempt to transition to a new state
     * @param {string} newState - Target state
     * @returns {boolean} True if transition was successful
     */
    transition(newState) {
        // Validate the new state exists
        if (!StateManager.STATES[newState]) {
            this.log(`ERROR: Invalid state "${newState}"`, 'error');
            return false;
        }

        // Check if transition is allowed
        const allowedTransitions = StateManager.TRANSITIONS[this.currentState];
        if (!allowedTransitions.includes(newState)) {
            this.log(
                `ERROR: Cannot transition from ${this.currentState} to ${newState}`,
                'error'
            );
            return false;
        }

        // Store previous state
        const previousState = this.currentState;
        
        // Update state
        this.currentState = newState;
        
        // Log transition
        this.log(`State: ${previousState} → ${newState}`, 'info');
        
        // Notify all listeners
        this.notifyListeners(previousState, newState);
        
        return true;
    }

    /**
     * Force a transition (for error recovery)
     * Use sparingly - bypasses validation
     * @param {string} newState - Target state
     */
    forceTransition(newState) {
        if (!StateManager.STATES[newState]) {
            this.log(`ERROR: Cannot force transition to invalid state "${newState}"`, 'error');
            return;
        }

        const previousState = this.currentState;
        this.currentState = newState;
        
        this.log(`FORCED State: ${previousState} → ${newState}`, 'warn');
        this.notifyListeners(previousState, newState);
    }

    /**
     * Reset to IDLE state
     */
    reset() {
        this.forceTransition(StateManager.STATES.IDLE);
    }

    /**
     * Register a listener for state changes
     * @param {Function} callback - Called with (previousState, newState)
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * Remove a listener
     * @param {Function} callback - The callback to remove
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners of a state change
     * @param {string} previousState
     * @param {string} newState
     */
    notifyListeners(previousState, newState) {
        this.listeners.forEach(callback => {
            try {
                callback(previousState, newState);
            } catch (error) {
                this.log(`Listener error: ${error.message}`, 'error');
            }
        });
    }

    /**
     * Log state information
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, warn, error)
     */
    log(message, level = 'info') {
        if (!this.debugMode) return;

        const prefix = '[StateManager]';
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

    /**
     * Get state information for debugging
     * @returns {Object} State info
     */
    getInfo() {
        return {
            currentState: this.currentState,
            allowedTransitions: StateManager.TRANSITIONS[this.currentState],
            listenerCount: this.listeners.length
        };
    }
}

// Export for use in other modules
window.StateManager = StateManager;

// Daily Journal Bot Frontend JavaScript
// Handles form submission, API calls, and UI updates

class JournalBot {
    constructor() {
        this.apiUrl = '/journal';
        this.initializeElements();
        this.attachEventListeners();
        this.setupCharacterCounter();
    }

    initializeElements() {
        // Form elements
        this.form = document.getElementById('journalForm');
        this.textarea = document.getElementById('journalEntry');
        this.submitBtn = document.getElementById('submitBtn');
        this.charCount = document.getElementById('charCount');
        
        // Response elements
        this.responseCard = document.getElementById('responseCard');
        this.sentimentBadge = document.getElementById('sentimentBadge');
        this.reflectionText = document.getElementById('reflectionText');
        this.confidenceText = document.getElementById('confidenceText');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.newEntryBtn = document.getElementById('newEntryBtn');
        
        // Error elements
        this.errorCard = document.getElementById('errorCard');
        this.errorMessage = document.getElementById('errorMessage');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
    }

    attachEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // New entry button
        this.newEntryBtn.addEventListener('click', () => {
            this.resetForm();
        });

        // Try again button
        this.tryAgainBtn.addEventListener('click', () => {
            this.hideError();
            this.handleSubmit();
        });

        // Textarea input for character counting
        this.textarea.addEventListener('input', () => {
            this.updateCharacterCount();
        });

        // Auto-resize textarea
        this.textarea.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }

    setupCharacterCounter() {
        this.updateCharacterCount();
    }

    updateCharacterCount() {
        const currentLength = this.textarea.value.length;
        const maxLength = 1000;
        
        this.charCount.textContent = currentLength;
        
        // Update color based on character count
        if (currentLength > maxLength * 0.9) {
            this.charCount.style.color = '#ef4444';
        } else if (currentLength > maxLength * 0.7) {
            this.charCount.style.color = '#f59e0b';
        } else {
            this.charCount.style.color = '#6b7280';
        }
    }

    autoResizeTextarea() {
        // Reset height to auto to get the correct scrollHeight
        this.textarea.style.height = 'auto';
        
        // Set height based on content, with min and max limits
        const minHeight = 120; // Minimum height in pixels
        const maxHeight = 300; // Maximum height in pixels
        const scrollHeight = Math.max(minHeight, Math.min(maxHeight, this.textarea.scrollHeight));
        
        this.textarea.style.height = scrollHeight + 'px';
    }

    async handleSubmit() {
        const text = this.textarea.value.trim();
        
        if (!text) {
            this.showError('Please enter your journal entry before submitting.');
            return;
        }

        if (text.length > 1000) {
            this.showError('Your journal entry is too long. Please keep it under 1000 characters.');
            return;
        }

        try {
            this.setLoadingState(true);
            this.hideError();
            this.hideResponse();

            const response = await this.submitJournalEntry(text);
            
            if (response.ok) {
                const data = await response.json();
                this.showResponse(data);
            } else {
                const errorData = await response.json();
                this.showError(errorData.detail || 'An error occurred while processing your journal entry.');
            }
        } catch (error) {
            console.error('Error submitting journal entry:', error);
            this.showError('Unable to connect to the server. Please check your internet connection and try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async submitJournalEntry(text) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        return response;
    }

    showResponse(data) {
        // Update sentiment badge
        const sentimentClass = data.sentiment.toLowerCase();
        this.sentimentBadge.textContent = data.sentiment;
        this.sentimentBadge.className = `sentiment-badge ${sentimentClass}`;

        // Update response card styling based on sentiment
        this.responseCard.className = `response-card ${sentimentClass}`;

        // Update reflection text with emoji
        this.reflectionText.textContent = `${data.emoji} ${data.reflection}`;

        // Update confidence meter
        const confidencePercent = Math.round(data.confidence * 100);
        this.confidenceText.textContent = `${confidencePercent}%`;
        this.confidenceFill.style.width = `${confidencePercent}%`;

        // Save entry to localStorage for analytics
        this.saveEntryToStorage(data);

        // Show response card with animation
        this.responseCard.style.display = 'block';
        
        // Smooth scroll to response
        setTimeout(() => {
            this.responseCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorCard.style.display = 'block';
        
        // Smooth scroll to error
        setTimeout(() => {
            this.errorCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }

    hideError() {
        this.errorCard.style.display = 'none';
    }

    hideResponse() {
        this.responseCard.style.display = 'none';
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.classList.add('loading');
            this.textarea.disabled = true;
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.classList.remove('loading');
            this.textarea.disabled = false;
        }
    }

    resetForm() {
        // Clear form
        this.textarea.value = '';
        this.updateCharacterCount();
        this.autoResizeTextarea();
        
        // Hide response and error cards
        this.hideResponse();
        this.hideError();
        
        // Reset loading state
        this.setLoadingState(false);
        
        // Focus on textarea
        this.textarea.focus();
        
        // Smooth scroll to form
        setTimeout(() => {
            this.form.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }

    saveEntryToStorage(data) {
        // Create entry object with timestamp and current text
        const entry = {
            id: Date.now(), // Simple ID based on timestamp
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            text: this.textarea.value.trim(),
            sentiment: data.sentiment,
            confidence: data.confidence,
            reflection: data.reflection,
            emoji: data.emoji
        };

        // Get existing entries from localStorage
        const existingEntries = this.getStoredEntries();
        
        // Add new entry
        existingEntries.push(entry);
        
        // Save back to localStorage
        localStorage.setItem('journalEntries', JSON.stringify(existingEntries));
        
        console.log('📝 Entry saved to localStorage:', entry);
    }

    getStoredEntries() {
        try {
            const stored = localStorage.getItem('journalEntries');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading stored entries:', error);
            return [];
        }
    }
}

// Utility functions for better user experience
function addLoadingAnimation() {
    // Add a subtle loading animation to the page
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shimmer {
            0% { background-position: -468px 0; }
            100% { background-position: 468px 0; }
        }
        
        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, transparent 37%, #f0f0f0 63%);
            background-size: 400% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

function handleKeyboardShortcuts() {
    // Add keyboard shortcuts for better accessibility
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.getElementById('journalForm');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to reset form
        if (e.key === 'Escape') {
            const bot = window.journalBot;
            if (bot) {
                bot.resetForm();
            }
        }
    });
}

function addTooltips() {
    // Add helpful tooltips
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.title = 'Submit your journal entry (Ctrl/Cmd + Enter)';
    }
    
    const textarea = document.getElementById('journalEntry');
    if (textarea) {
        textarea.title = 'Press Escape to clear the form';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main journal bot
    window.journalBot = new JournalBot();
    
    // Add enhancements
    addLoadingAnimation();
    handleKeyboardShortcuts();
    addTooltips();
    
    // Focus on textarea when page loads
    const textarea = document.getElementById('journalEntry');
    if (textarea) {
        textarea.focus();
    }
    
    console.log('🤖 Daily Journal Bot initialized successfully!');
});

// Handle page visibility changes (pause/resume animations)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when page is hidden
        document.body.style.animationPlayState = 'paused';
    } else {
        // Resume animations when page becomes visible
        document.body.style.animationPlayState = 'running';
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JournalBot;
} 
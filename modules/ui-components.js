// OptimiCity - UI Components Module
// Handles: UI updates, logging, interface management

window.UIComponents = (function () {
    'use strict';

    // Logging function
    function addLogEntry(message, type = 'system') {
        const logEntries = document.getElementById('logEntries');
        if (!logEntries) return;

        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = message;
        logEntries.appendChild(entry);
        logEntries.scrollTop = logEntries.scrollHeight;

        // Keep only last 20 entries
        while (logEntries.children.length > 40) {
            logEntries.removeChild(logEntries.firstChild);
        }
    }

    // Update all UI components
    function updateAll() {
        updateStatusValues();
        updateAIMayorMetrics();
        updateTimerDisplay();

        if (window.Actions) {
            window.Actions.updateActionButtonStates();
        }
    }

    // Update status values
    function updateStatusValues() {
        const gameState = window.GameCore.getState();

        const communityPowerEl = document.getElementById('communityPower');
        const heatLevelEl = document.getElementById('heatLevel');
        const activeCitizensEl = document.getElementById('activeCitizens');
        const totalPopulationEl = document.getElementById('totalPopulation');
        const citizensImprisonedEl = document.getElementById('citizensImprisoned');
        const citizensKilledEl = document.getElementById('citizensKilled');

        if (communityPowerEl) communityPowerEl.textContent = Math.round(gameState.communityPower);
        if (heatLevelEl) heatLevelEl.textContent = Math.round(gameState.heatLevel);
        if (activeCitizensEl) activeCitizensEl.textContent = gameState.activeCitizens.toLocaleString();
        if (totalPopulationEl) totalPopulationEl.textContent = (gameState.totalPopulation / 1000000).toFixed(1) + 'M';
        if (citizensImprisonedEl) citizensImprisonedEl.textContent = gameState.citizensImprisoned.toLocaleString();
        if (citizensKilledEl) citizensKilledEl.textContent = gameState.citizensKilled.toLocaleString();
    }

    // Update AI Mayor metrics
    function updateAIMayorMetrics() {
        if (window.AIMayor) {
            window.AIMayor.updateMetrics();
        }
    }

    // Update timer display with color coding
    function updateTimerDisplay() {
        const gameState = window.GameCore.getState();
        const timerElement = document.getElementById('gameTimer');

        if (!timerElement || !gameState.startTime) return;

        const elapsed = Date.now() - gameState.startTime;
        const remaining = Math.max(0, gameState.duration - elapsed);

        // Change color based on time remaining
        if (remaining < 60000) { // Last minute
            timerElement.style.background = '#e74c3c';
            timerElement.classList.add('pulse');
        } else if (remaining < 180000) { // Last 3 minutes
            timerElement.style.background = '#f39c12';
            timerElement.classList.remove('pulse');
        } else {
            timerElement.style.background = '#27ae60';
            timerElement.classList.remove('pulse');
        }
    }

    // Update AI interface
    function updateAIInterface(response) {
        const aiResponseLog = document.getElementById('aiResponseLog');
        if (!aiResponseLog) return;

        const time = new Date().toLocaleTimeString().slice(0, 5);
        const responseEntry = document.createElement('div');
        responseEntry.innerHTML = `${time} - ${response}`;
        aiResponseLog.insertBefore(responseEntry, aiResponseLog.firstChild);

        // Keep only last 10 responses
        while (aiResponseLog.children.length > 10) {
            aiResponseLog.removeChild(aiResponseLog.lastChild);
        }
    }

    // Show notification for important events
    function showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#e74c3c'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            font-family: 'Courier New', monospace;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Update neighborhood selection UI
    function updateNeighborhoodSelection(neighborhoodId) {
        if (!window.Neighborhoods) return;

        const neighborhood = window.Neighborhoods.getNeighborhood(neighborhoodId);
        if (!neighborhood) return;

        // Update selected neighborhood display
        const selectedNameEl = document.getElementById('selectedNeighborhoodName');
        if (selectedNameEl) {
            selectedNameEl.textContent = neighborhood.name;
        }

        // Update action button availability
        if (window.Actions) {
            window.Actions.updateActionButtonStates();
        }

        // Show neighborhood info
        const threatStatus = neighborhood.threatened ?
            `⚠️ Under threat - ${neighborhood.gentrificationTimer}h remaining` :
            '🏴 Secure';

        addLogEntry(`Selected ${neighborhood.name}. ${threatStatus}`, 'system');
    }

    // Create progress bar element
    function createProgressBar(current, max, color = '#27ae60') {
        const container = document.createElement('div');
        container.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
        `;

        const fill = document.createElement('div');
        fill.style.cssText = `
            width: ${Math.min(100, (current / max) * 100)}%;
            height: 100%;
            background: ${color};
            transition: width 0.3s ease;
        `;

        container.appendChild(fill);
        return container;
    }

    // Show game stats overlay
    function showGameStats() {
        if (!window.Neighborhoods) return;

        const liberationStatus = window.Neighborhoods.getLiberationStatus();
        const gameState = window.GameCore.getState();
        const timeElapsed = gameState.startTime ? Date.now() - gameState.startTime : 0;
        const minutesElapsed = Math.floor(timeElapsed / 60000);

        const statsHTML = `
            <div style="background: rgba(0,0,0,0.9); color: white; padding: 20px; border-radius: 8px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; min-width: 300px; font-family: 'Courier New', monospace;">
                <h3 style="color: #f39c12; margin-top: 0;">📊 Resistance Statistics</h3>
                <p><strong>Time Elapsed:</strong> ${minutesElapsed} minutes</p>
                <p><strong>Community Power:</strong> ${Math.round(gameState.communityPower)}/100</p>
                <p><strong>Heat Level:</strong> ${Math.round(gameState.heatLevel)}/100</p>
                <p><strong>Active Citizens:</strong> ${gameState.activeCitizens}</p>
                <p><strong>Liberated Neighborhoods:</strong> ${liberationStatus.liberated}/${liberationStatus.total}</p>
                <p><strong>Threatened Neighborhoods:</strong> ${liberationStatus.threatened}</p>
                <button onclick="this.parentElement.remove()" style="background: #27ae60; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; font-family: 'Courier New', monospace;">Close</button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', statsHTML);
    }

    // Flash effect for important UI changes
    function flashElement(elementId, color = '#f39c12', duration = 500) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const originalBackground = element.style.background;
        element.style.background = color;
        element.style.transition = 'background 0.1s';

        setTimeout(() => {
            element.style.background = originalBackground;
            setTimeout(() => {
                element.style.transition = '';
            }, 300);
        }, duration);
    }

    // Animate value changes (like community power increases)
    function animateValueChange(elementId, newValue, color = '#27ae60') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const oldValue = parseInt(element.textContent) || 0;
        const difference = newValue - oldValue;

        if (difference !== 0) {
            // Show the change as a floating number
            const changeIndicator = document.createElement('div');
            changeIndicator.textContent = (difference > 0 ? '+' : '') + difference;
            changeIndicator.style.cssText = `
                position: absolute;
                color: ${color};
                font-weight: bold;
                font-size: 14px;
                z-index: 100;
                animation: floatUp 1s ease-out forwards;
                pointer-events: none;
                font-family: 'Courier New', monospace;
            `;

            const rect = element.getBoundingClientRect();
            changeIndicator.style.left = (rect.left + rect.width / 2) + 'px';
            changeIndicator.style.top = (rect.top - 10) + 'px';

            document.body.appendChild(changeIndicator);

            setTimeout(() => {
                if (changeIndicator.parentNode) {
                    changeIndicator.parentNode.removeChild(changeIndicator);
                }
            }, 1000);
        }

        // Update the actual value
        element.textContent = newValue;
    }

    // Share game result (future feature)
    function shareGameResult() {
        const gameState = window.GameCore.getState();
        const liberationStatus = window.Neighborhoods ? window.Neighborhoods.getLiberationStatus() : { liberated: 0, total: 4 };

        const shareText = `I just played OptimiCity! 🏴\n` +
            `Community Power: ${Math.round(gameState.communityPower)}/100\n` +
            `Liberated Neighborhoods: ${liberationStatus.liberated}/${liberationStatus.total}\n` +
            `The resistance continues! #OptimiCity #ResistTheAlgorithm`;

        if (navigator.share) {
            navigator.share({
                title: 'OptimiCity - Fight the Algorithm',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                showNotification('Result copied to clipboard!', 'success');
            }).catch(() => {
                showNotification('Share feature not available', 'warning');
            });
        }
    }

    // Add CSS animations for UI effects
    function addUIAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatUp {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-30px); opacity: 0; }
            }
            
            @keyframes slideInRight {
                0% { transform: translateX(100%); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(100%); opacity: 0; }
            }
            
            .pulse {
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize UI animations when needed
    function initAnimations() {
        addUIAnimations();
    }

    // Public API
    return {
        init: function () {
            console.log('UIComponents initialized');
            initAnimations();
        },

        addLogEntry: addLogEntry,
        updateAll: updateAll,
        updateStatusValues: updateStatusValues,
        updateAIMayorMetrics: updateAIMayorMetrics,
        updateTimerDisplay: updateTimerDisplay,
        updateAIInterface: updateAIInterface,
        showNotification: showNotification,
        updateNeighborhoodSelection: updateNeighborhoodSelection,
        createProgressBar: createProgressBar,
        showGameStats: showGameStats,
        flashElement: flashElement,
        animateValueChange: animateValueChange,
        shareGameResult: shareGameResult
    };
})();
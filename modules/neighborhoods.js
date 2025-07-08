// OptimiCity - Neighborhoods Module
// Handles: Neighborhood rendering, selection, visual states

window.Neighborhoods = (function () {
    'use strict';

    // Render all neighborhoods
    function renderAll() {
        const cityView = document.getElementById('cityView');
        if (!cityView) return;

        const gameState = window.GameCore.getState();

        gameState.neighborhoods.forEach(neighborhood => {
            const existing = document.getElementById(`neighborhood-${neighborhood.id}`);
            if (existing) existing.remove();

            const element = document.createElement('div');
            element.className = `neighborhood ${neighborhood.threatened ? 'threatened' : ''}`;
            element.id = `neighborhood-${neighborhood.id}`;
            element.style.left = neighborhood.x + 'px';
            element.style.top = neighborhood.y + 'px';
            element.style.width = neighborhood.width + 'px';
            element.style.height = neighborhood.height + 'px';

            element.innerHTML = `
                <div class="neighborhood-name">${neighborhood.name}</div>
                <div class="resistance-info">
                    <span>Resistance: ${neighborhood.resistance}%</span>
                    <span>👥 ${neighborhood.population}</span>
                </div>
                ${neighborhood.threatened ? `<div class="threat-timer">⚠️ ${neighborhood.gentrificationTimer.toFixed(1)} min until gentrification</div>` : ''}
            `;

            element.addEventListener('click', () => {
                selectNeighborhood(neighborhood.id);
            });

            cityView.appendChild(element);
        });

        // Re-apply selection state
        updateSelectionDisplay();
    }

    // Select neighborhood
    function selectNeighborhood(neighborhoodId) {
        const gameState = window.GameCore.getState();
        const neighborhood = gameState.neighborhoods.find(n => n.id === neighborhoodId);

        if (!neighborhood) return;

        // Update game state
        window.GameCore.selectNeighborhood(neighborhoodId);

        // Update visual selection
        updateSelectionDisplay();

        // Update UI display
        const selectedNameElement = document.getElementById('selectedNeighborhoodName');
        if (selectedNameElement) {
            selectedNameElement.textContent = neighborhood.name;
        }

        // Log selection
        if (window.UIComponents) {
            window.UIComponents.addLogEntry(`Selected ${neighborhood.name} for resistance action.`);
        }

        // Update action button states after selection - this is crucial!
        if (window.Actions) {
            window.Actions.updateActionButtonStates();
        }
    }

    // Update selection visual state
    function updateSelectionDisplay() {
        const gameState = window.GameCore.getState();

        document.querySelectorAll('.neighborhood').forEach(el => {
            el.classList.remove('selected');
        });

        if (gameState.selectedNeighborhood) {
            const selectedElement = document.getElementById(`neighborhood-${gameState.selectedNeighborhood}`);
            if (selectedElement) {
                selectedElement.classList.add('selected');
            }
        }
    }

    // Update neighborhood resistance and visual state
    function updateNeighborhoodState(neighborhoodId, resistanceChange) {
        const gameState = window.GameCore.getState();
        const neighborhood = gameState.neighborhoods.find(n => n.id === neighborhoodId);

        if (!neighborhood) return;

        neighborhood.resistance = Math.min(100, neighborhood.resistance + resistanceChange);

        // Check for liberation
        if (neighborhood.resistance >= 60 && neighborhood.threatened) {
            neighborhood.threatened = false;
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`🏴 ${neighborhood.name} has been LIBERATED! Community control established.`, 'citizen');
            }
        }

        // Re-render the specific neighborhood
        renderNeighborhood(neighborhood);
    }

    // Render single neighborhood
    function renderNeighborhood(neighborhood) {
        const element = document.getElementById(`neighborhood-${neighborhood.id}`);
        if (!element) return;

        const gameState = window.GameCore.getState();

        element.className = `neighborhood ${neighborhood.threatened ? 'threatened' : ''} ${gameState.selectedNeighborhood === neighborhood.id ? 'selected' : ''}`;
        element.innerHTML = `
            <div class="neighborhood-name">${neighborhood.name}</div>
            <div class="resistance-info">
                <span>Resistance: ${neighborhood.resistance}%</span>
                <span>👥 ${neighborhood.population}</span>
            </div>
            ${neighborhood.threatened ? `<div class="threat-timer">⚠️ ${neighborhood.gentrificationTimer}m until gentrification</div>` : ''}
        `;
    }

    // Get neighborhood by ID
    function getNeighborhood(neighborhoodId) {
        const gameState = window.GameCore.getState();
        return gameState.neighborhoods.find(n => n.id === neighborhoodId);
    }

    // Get currently selected neighborhood
    function getSelectedNeighborhood() {
        const gameState = window.GameCore.getState();
        if (!gameState.selectedNeighborhood) return null;
        return getNeighborhood(gameState.selectedNeighborhood);
    }

    // Check if neighborhood is threatened
    function isNeighborhoodThreatened(neighborhoodId) {
        const neighborhood = getNeighborhood(neighborhoodId);
        return neighborhood ? neighborhood.threatened : false;
    }

    // Get liberation status
    function getLiberationStatus() {
        const gameState = window.GameCore.getState();
        const total = gameState.neighborhoods.length;
        const liberated = gameState.neighborhoods.filter(n => n.resistance >= 60).length;
        const threatened = gameState.neighborhoods.filter(n => n.threatened).length;

        return {
            total,
            liberated,
            threatened,
            percentage: Math.round((liberated / total) * 100)
        };
    }

    // Get all neighborhoods
    function getAll() {
        const gameState = window.GameCore.getState();
        return gameState.neighborhoods;
    }

    // Auto-select first threatened neighborhood
    function autoSelectFirstThreatened() {
        const gameState = window.GameCore.getState();
        const firstThreatened = gameState.neighborhoods.find(n => n.threatened);
        if (firstThreatened) {
            selectNeighborhood(firstThreatened.id);
        }
    }

    // Public API
    return {
        init: function () {
            console.log('Neighborhoods initialized');
        },

        renderAll: renderAll,
        selectNeighborhood: selectNeighborhood,
        updateNeighborhoodState: updateNeighborhoodState,
        getNeighborhood: getNeighborhood,
        getSelectedNeighborhood: getSelectedNeighborhood,
        isNeighborhoodThreatened: isNeighborhoodThreatened,
        getLiberationStatus: getLiberationStatus,
        getAll: getAll,
        autoSelectFirstThreatened: autoSelectFirstThreatened
    };
})();
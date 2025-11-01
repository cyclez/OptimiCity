// OptimiCity - Game Core Module
// Handles: Game state, timer, victory conditions, main game loop

window.GameCore = (function () {
    'use strict';

    // Game state
    let gameState = {
        isActive: false,
        startTime: null,
        duration: 30 * 60 * 1000, // 30 minutes
        communityPower: 0,
        heatLevel: 0,
        activeCitizens: 1, // Start with 1 active citizen (the player)
        totalPopulation: Math.floor(Math.random() * (20000000 - 5000000 + 1)) + 5000000, // Random 5M-20M
        citizensImprisoned: 0,
        citizensKilled: 0,
        selectedNeighborhood: null,
        actionCooldowns: {},
        // Heat cooldown system
        lastActionTime: 0,
        globalActionCooldown: 3000, // 3 seconds base cooldown between actions
        minHeatLevel: 0, // Heat can't go below this level (ratcheting effect)
        heatThresholds: [25, 50, 75], // Once reached, heat can't drop below these
        // Currency system
        simCoin: 5000, // Starting balance
        totalActionsCompleted: 0,
        infrastructureBonus: 0, // Mining boost from infrastructure actions
        currencyEarningCooldowns: {},
        neighborhoods: [
            { id: 'market', name: 'Market District', resistance: 5, gentrificationTimer: 10, threatened: true, population: 1200 },
            { id: 'riverside', name: 'Riverside', resistance: 12, gentrificationTimer: 18, threatened: true, population: 850 },
            { id: 'oldtown', name: 'Old Town', resistance: 25, gentrificationTimer: 25, threatened: false, population: 950 },
            { id: 'industrial', name: 'Industrial Quarter', resistance: 8, gentrificationTimer: 8, threatened: true, population: 600 }
        ]
    };

    let timerId = null;
    let gameLoopId = null;

    // Dynamic neighborhood positioning
    function calculateNeighborhoodPositions(neighborhoods) {
        const count = neighborhoods.length;

        // Available area calculation
        // Left side: from 0 to 65% of window width
        const availableWidth = Math.floor(window.innerWidth * 0.65) - 40; // 40px total margins
        const availableHeight = window.innerHeight - 70 - 320 - 40; // Minus status bar (70px), actions panel (320px), margins (40px)

        // Calculate grid dimensions
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        // Calculate spacing and size
        const spacing = 20; // Spacing between neighborhoods
        const internalGap = 5; // Gap inside each neighborhood square

        // Calculate maximum possible square size based on available space
        const maxWidthPerSquare = Math.floor((availableWidth - (spacing * (cols + 1))) / cols);
        const maxHeightPerSquare = Math.floor((availableHeight - (spacing * (rows + 1))) / rows);

        // Use the smaller dimension to ensure squares fit in both directions
        const squareSize = Math.min(maxWidthPerSquare, maxHeightPerSquare);

        // Calculate actual grid dimensions with the square size
        const gridWidth = cols * squareSize + (cols + 1) * spacing;
        const gridHeight = rows * squareSize + (rows + 1) * spacing;

        // Center the grid in available space
        const startX = Math.floor((availableWidth - gridWidth) / 2) + 20; // 20px left margin
        const startY = 70 + Math.floor((availableHeight - gridHeight) / 2) + 20; // 70px status bar + centering + 20px top margin

        // Position neighborhoods as squares with internal gap
        neighborhoods.forEach((neighborhood, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            // Position with internal gap applied
            neighborhood.x = startX + spacing + col * (squareSize + spacing) + internalGap;
            neighborhood.y = startY + spacing + row * (squareSize + spacing) + internalGap;
            neighborhood.width = squareSize - (internalGap * 2); // Reduce size to create internal gap
            neighborhood.height = squareSize - (internalGap * 2); // Always square with internal gap!
        });
    }

    // Victory conditions
    const VICTORY_CONDITIONS = {
        COMMUNITY_POWER_WIN: 80,
        ALL_NEIGHBORHOODS_LIBERATED: 60,
        SURVEILLANCE_STATE_THRESHOLD: 95
    };

    // Timer update
    function updateTimer() {
        if (!gameState.isActive || !gameState.startTime) return;

        const elapsed = Date.now() - gameState.startTime;
        const remaining = Math.max(0, gameState.duration - elapsed);

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        const timerElement = document.getElementById('gameTimer');
        if (timerElement) {
            timerElement.textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (remaining <= 0) {
            endGame('timeout');
        }
    }

    // Check victory conditions
    function checkVictoryConditions() {
        const liberatedCount = gameState.neighborhoods.filter(n => n.resistance >= VICTORY_CONDITIONS.ALL_NEIGHBORHOODS_LIBERATED).length;

        if (gameState.communityPower >= VICTORY_CONDITIONS.COMMUNITY_POWER_WIN) {
            endGame('victory', 'Community power reached critical mass! Participatory democracy established.');
        } else if (liberatedCount === gameState.neighborhoods.length) {
            endGame('victory', 'All neighborhoods liberated! The AI Mayor has been overthrown.');
        } else if (gameState.heatLevel >= VICTORY_CONDITIONS.SURVEILLANCE_STATE_THRESHOLD) {
            endGame('defeat', 'Surveillance state fully implemented. The resistance has been crushed.');
        }
    }

    // End game
    function endGame(result, message = '') {
        gameState.isActive = false;

        // Clear intervals
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        if (gameLoopId) {
            clearInterval(gameLoopId);
            gameLoopId = null;
        }

        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const messageEl = document.getElementById('gameOverMessage');

        if (result === 'victory') {
            title.textContent = '🏴 VICTORY!';
            title.style.color = '#27ae60';
        } else if (result === 'defeat') {
            title.textContent = '💔 DEFEAT';
            title.style.color = '#e74c3c';
        } else {
            title.textContent = '⏰ TIME UP';
            title.style.color = '#f39c12';
            message = gameState.communityPower >= 50 ?
                'Time\'s up! The resistance continues, but the struggle is far from over.' :
                'Time\'s up! The AI Mayor\'s optimization proceeded unchallenged.';
        }

        messageEl.textContent = message || 'The resistance continues...';
        modal.style.display = 'flex';
    }

    // Restart game
    function restartGame() {
        const modal = document.getElementById('gameOverModal');
        if (modal) modal.style.display = 'none';

        // Clear existing intervals
        if (timerId) clearInterval(timerId);
        if (gameLoopId) clearInterval(gameLoopId);

        // Reset game state
        gameState.isActive = false;
        gameState.startTime = null;
        gameState.communityPower = 0;
        gameState.heatLevel = 0;
        gameState.activeCitizens = Math.floor(Math.random() * (300 - 100 + 1)) + 100; // Re-randomize
        gameState.totalPopulation = Math.floor(Math.random() * (20000000 - 5000000 + 1)) + 5000000; // Re-randomize
        gameState.citizensImprisoned = 0;
        gameState.citizensKilled = 0;
        gameState.selectedNeighborhood = null;
        gameState.actionCooldowns = {};
        // Reset currency system
        gameState.simCoin = 5000;
        gameState.totalActionsCompleted = 0;
        gameState.infrastructureBonus = 0;
        gameState.currencyEarningCooldowns = {};

        // Reset neighborhoods
        gameState.neighborhoods.forEach(n => {
            if (n.id === 'market') {
                n.resistance = 5;
                n.gentrificationTimer = 10;
                n.threatened = true;
            } else if (n.id === 'riverside') {
                n.resistance = 12;
                n.gentrificationTimer = 18;
                n.threatened = true;
            } else if (n.id === 'oldtown') {
                n.resistance = 25;
                n.gentrificationTimer = 25;
                n.threatened = false;
            } else if (n.id === 'industrial') {
                n.resistance = 8;
                n.gentrificationTimer = 8;
                n.threatened = true;
            }
        });

        // Clear log
        const logEntries = document.getElementById('logEntries');
        if (logEntries) {
            logEntries.innerHTML = '<div class="log-entry log-system">Game restarted. The resistance begins anew.</div>';
        }

        startGame();
    }

    // Start game
    function startGame() {
        // Calculate dynamic positions for neighborhoods
        calculateNeighborhoodPositions(gameState.neighborhoods);

        gameState.isActive = true;
        gameState.startTime = Date.now();

        // Use UIComponents if available, otherwise basic logging
        if (window.UIComponents) {
            UIComponents.addLogEntry('🏴 Resistance network activated. Organize, resist, liberate!', 'system');
            UIComponents.addLogEntry('Select a neighborhood and choose your first action.', 'system');
        }

        // Start timer - update every second exactly
        timerId = setInterval(updateTimer, 1000);

        // Start game loop
        gameLoopId = setInterval(() => {
            if (!gameState.isActive) return;

            // Update neighborhood timers
            gameState.neighborhoods.forEach(neighborhood => {
                if (neighborhood.threatened && neighborhood.gentrificationTimer > 0) {
                    // Decrement in minutes: every 5 seconds = 5/60 = 0.0833 minutes
                    neighborhood.gentrificationTimer -= (5 / 60); // 0.0833 minutes per tick

                    // Round to avoid precision problems
                    neighborhood.gentrificationTimer = Math.max(0, Math.round(neighborhood.gentrificationTimer * 100) / 100);

                    if (neighborhood.gentrificationTimer <= 0) {
                        if (neighborhood.resistance < 40) {
                            if (window.UIComponents) {
                                UIComponents.addLogEntry(`💔 ${neighborhood.name} has been gentrified. Residents displaced.`, 'ai');
                            }
                            neighborhood.threatened = false;
                            neighborhood.resistance = 0;
                        } else {
                            if (window.UIComponents) {
                                UIComponents.addLogEntry(`✊ ${neighborhood.name} successfully defended against gentrification!`, 'citizen');
                            }
                            neighborhood.threatened = false;
                            neighborhood.resistance += 10;
                            gameState.communityPower += 10;
                        }

                        // Re-render neighborhoods
                        if (window.Neighborhoods) {
                            Neighborhoods.renderAll();
                        }

                        // Update UI
                        if (window.UIComponents) {
                            UIComponents.updateAll();
                        }

                        checkVictoryConditions();
                    }
                }
            });

            // Trigger AI Mayor actions
            if (window.AIMayor) {
                AIMayor.triggerRandomAction();
            }

            // Trigger community actions
            if (window.AICitizens) {
                AICitizens.triggerCommunityAction();
            }

        }, 5000); // Update every 5 seconds

        // Initial UI update
        if (window.UIComponents) {
            UIComponents.updateAll();
        }
    }

    // Public API
    return {
        init: function () {
            console.log('GameCore initialized');
        },

        getState: function () {
            return gameState;
        },

        startGame: startGame,
        restartGame: restartGame,
        endGame: endGame,
        checkVictoryConditions: checkVictoryConditions,

        // State modifiers
        updateCommunityPower: function (change) {
            gameState.communityPower = Math.max(0, Math.min(100, gameState.communityPower + change));
        },

        updateHeatLevel: function (change) {
            // Apply heat change but respect minimum heat level (ratcheting effect)
            const newHeatLevel = Math.max(gameState.minHeatLevel, Math.min(100, gameState.heatLevel + change));
            gameState.heatLevel = newHeatLevel;

            // Check if we've crossed any surveillance thresholds
            this.checkHeatThresholds();
        },

        updateActiveCitizens: function (change) {
            gameState.activeCitizens = Math.max(0, gameState.activeCitizens + change);
        },

        updateCitizensImprisoned: function (change) {
            gameState.citizensImprisoned = Math.max(0, gameState.citizensImprisoned + change);
        },

        updateCitizensKilled: function (change) {
            gameState.citizensKilled = Math.max(0, gameState.citizensKilled + change);
            // Remove from total population
            gameState.totalPopulation = Math.max(0, gameState.totalPopulation - change);
        },

        setActionCooldown: function (cooldownKey, duration) {
            gameState.actionCooldowns[cooldownKey] = Date.now() + duration;
        },

        clearActionCooldown: function (cooldownKey) {
            delete gameState.actionCooldowns[cooldownKey];
        },

        isActionOnCooldown: function (cooldownKey) {
            const cooldownEnd = gameState.actionCooldowns[cooldownKey];
            return cooldownEnd && Date.now() < cooldownEnd;
        },

        getActionCooldownRemaining: function (cooldownKey) {
            const cooldownEnd = gameState.actionCooldowns[cooldownKey];
            return cooldownEnd ? Math.max(0, cooldownEnd - Date.now()) : 0;
        },

        // Heat cooldown system
        isGlobalActionOnCooldown: function () {
            return Date.now() < gameState.lastActionTime + gameState.globalActionCooldown;
        },

        getGlobalActionCooldownRemaining: function () {
            return Math.max(0, (gameState.lastActionTime + gameState.globalActionCooldown) - Date.now());
        },

        setGlobalActionCooldown: function () {
            gameState.lastActionTime = Date.now();
        },

        checkSpamPenalty: function () {
            const timeSinceLastAction = Date.now() - gameState.lastActionTime;
            let heatPenalty = 0;

            if (timeSinceLastAction < 2000) {
                // Very rapid action (under 2 seconds)
                heatPenalty = 8;
            } else if (timeSinceLastAction < 5000) {
                // Quick action (2-5 seconds)
                heatPenalty = 4;
            } else if (timeSinceLastAction < 10000) {
                // Moderate action (5-10 seconds)
                heatPenalty = 2;
            }
            // No penalty for actions 10+ seconds apart

            if (heatPenalty > 0) {
                this.updateHeatLevel(heatPenalty);
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(`⚠️ Rapid actions detected! +${heatPenalty} surveillance heat`, 'system');
                }
            }

            return heatPenalty;
        },

        checkHeatThresholds: function () {
            // Check if we've crossed any heat thresholds that lock in minimum heat
            for (const threshold of gameState.heatThresholds) {
                if (gameState.heatLevel >= threshold && gameState.minHeatLevel < threshold) {
                    gameState.minHeatLevel = threshold;
                    if (window.UIComponents) {
                        window.UIComponents.addLogEntry(`🚨 SURVEILLANCE THRESHOLD REACHED: Heat level locked at minimum ${threshold}%`, 'system');
                    }
                }
            }
        },

        selectNeighborhood: function (neighborhoodId) {
            gameState.selectedNeighborhood = neighborhoodId;
        },

        // Currency management functions
        updateSimCoin: function (amount) {
            gameState.simCoin = Math.max(0, gameState.simCoin + amount);
        },

        getSimCoin: function () {
            return gameState.simCoin;
        },

        canAfford: function (cost) {
            return gameState.simCoin >= cost;
        },

        incrementActionsCompleted: function () {
            gameState.totalActionsCompleted++;
        },

        updateInfrastructureBonus: function (amount) {
            gameState.infrastructureBonus += amount;
        },

        setCurrencyEarningCooldown: function (type, duration) {
            gameState.currencyEarningCooldowns[type] = Date.now() + duration;
        },

        isCurrencyEarningOnCooldown: function (type) {
            const cooldownEnd = gameState.currencyEarningCooldowns[type];
            return cooldownEnd && Date.now() < cooldownEnd;
        },

        getCurrencyEarningCooldownRemaining: function (type) {
            const cooldownEnd = gameState.currencyEarningCooldowns[type];
            return cooldownEnd ? Math.max(0, cooldownEnd - Date.now()) : 0;
        }
    };
})();
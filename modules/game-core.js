// OptimiCity - Game Core Module - FULLY COMMENTED VERSION
// Handles: Game state, timer, victory conditions, main game loop
// 
// DATA FLOW SUMMARY:
// INPUT SOURCES: actions.js, ai-mayor.js, ai-citizens.js, neighborhoods.js, currency.js, ui-components.js
// OUTPUT TARGETS: ui-components.js (UI updates), neighborhoods.js (rendering), victory modal (HTML)
//
// KEY INTERACTIONS:
// - actions.js calls GameCore state modifiers (updateCommunityPower, updateHeatLevel, etc.)
// - ai-mayor.js calls GameCore state modifiers for casualties and escalation
// - ai-citizens.js calls GameCore state modifiers for community boosts
// - Game loop triggers AIMayor.triggerRandomAction() and AICitizens.triggerCommunityAction()
// - All state changes propagate to UIComponents.updateAll() for display

window.GameCore = (function () {
    'use strict';

    // ============================================================================
    // GAME STATE - CENTRAL DATA STORE
    // ============================================================================
    // This object is the SINGLE SOURCE OF TRUTH for all game state
    // ACCESSED BY: All modules via GameCore.getState()
    // MODIFIED BY: Only through GameCore public API functions
    let gameState = {
        // Game status
        isActive: false,                          // READ BY: All action functions to check if game running
        startTime: null,                          // SET BY: startGame() | READ BY: updateTimer()
        duration: 30 * 60 * 1000,                // CONSTANT: 30 minutes = 1,800,000ms

        // Core metrics
        communityPower: 0,                        // MODIFIED BY: actions.js, ai-citizens.js, game loop (gentrification defense)
        // READ BY: checkVictoryConditions(), ai-citizens.js (morale), ai-mayor.js (efficiency calc)

        heatLevel: 0,                            // MODIFIED BY: actions.js (action heat), checkSpamPenalty(), ai-mayor.js (escalation)
        // READ BY: checkVictoryConditions(), actions.js (risk calc), ai-mayor.js (escalation level)

        activeCitizens: 1,                       // MODIFIED BY: actions.js (casualties), ai-mayor.js (arrests), ai-citizens.js (recruitment)
        // READ BY: actions.js (casualty calc), ai-mayor.js (resistance factor)

        totalPopulation: Math.floor(Math.random() * (20000000 - 5000000 + 1)) + 5000000, // Random 5M-20M
        // MODIFIED BY: updateCitizensKilled() (decreases on death)
        // READ BY: ai-mayor.js (routine action arrests)

        citizensImprisoned: 0,                   // MODIFIED BY: actions.js, ai-mayor.js
        // READ BY: ui-components.js for display

        citizensKilled: 0,                       // MODIFIED BY: actions.js, ai-mayor.js
        // READ BY: ui-components.js for display

        selectedNeighborhood: null,              // MODIFIED BY: neighborhoods.js (user clicks), selectNeighborhood()
        // READ BY: actions.js (determines target for action)

        // Cooldown systems
        actionCooldowns: {},                     // MODIFIED BY: setActionCooldown(), clearActionCooldown()
        // READ BY: isActionOnCooldown(), actions.js (prevents rapid spam)
        // FORMAT: { 'actionType_neighborhoodId': timestamp }

        lastActionTime: 0,                       // MODIFIED BY: setGlobalActionCooldown() called by actions.js
        // READ BY: checkSpamPenalty(), isGlobalActionOnCooldown()

        globalActionCooldown: 3000,              // CONSTANT: 3 seconds = 3000ms

        // Heat ratcheting system
        minHeatLevel: 0,                         // MODIFIED BY: checkHeatThresholds() when crossing 25, 50, 75
        // READ BY: updateHeatLevel() (prevents heat from going below this)

        heatThresholds: [25, 50, 75],           // CONSTANT: Once crossed, heat cannot drop below these values

        // Currency system
        simCoin: 5000,                           // MODIFIED BY: currency.js (earning), actions.js (spending)
        // READ BY: actions.js (check affordability), currency.js

        totalActionsCompleted: 0,                // MODIFIED BY: actions.js via incrementActionsCompleted()
        // READ BY: currency.js (for bonus calculations)

        infrastructureBonus: 0,                  // MODIFIED BY: actions.js (infrastructure actions)
        // READ BY: currency.js (mining boost)

        currencyEarningCooldowns: {},            // MODIFIED BY: setCurrencyEarningCooldown()
        // READ BY: isCurrencyEarningOnCooldown(), currency.js

        // Neighborhoods data
        neighborhoods: [                         // MODIFIED BY: actions.js (resistance changes), game loop (timer countdown), ai-mayor.js (acceleration)
            // READ BY: neighborhoods.js (rendering), checkVictoryConditions(), ai-mayor.js, ai-citizens.js
            { id: 'market', name: 'Market District', resistance: 5, gentrificationTimer: 10, threatened: true, population: 1200 },
            { id: 'riverside', name: 'Riverside', resistance: 12, gentrificationTimer: 18, threatened: true, population: 850 },
            { id: 'oldtown', name: 'Old Town', resistance: 25, gentrificationTimer: 25, threatened: false, population: 950 },
            { id: 'industrial', name: 'Industrial Quarter', resistance: 8, gentrificationTimer: 8, threatened: true, population: 600 }
        ]
    };

    // ============================================================================
    // PRIVATE INTERVAL REFERENCES
    // ============================================================================
    // These store the setInterval IDs for cleanup
    let timerId = null;                          // STORES: updateTimer() interval (every 1000ms)
    let gameLoopId = null;                       // STORES: main game loop interval (every 5000ms)

    // ============================================================================
    // DYNAMIC NEIGHBORHOOD POSITIONING (RENDERING HELPER)
    // ============================================================================
    // INPUT: neighborhoods array from gameState
    // OUTPUT: Modifies neighborhood objects by adding x, y, width, height properties
    // CALLED BY: startGame()
    // USED BY: neighborhoods.js for rendering positions
    function calculateNeighborhoodPositions(neighborhoods) {
        const count = neighborhoods.length;

        // Available area calculation - based on window size
        const availableWidth = Math.floor(window.innerWidth * 0.65) - 40;  // Left 65% of screen minus margins
        const availableHeight = window.innerHeight - 70 - 320 - 40;        // Minus status bar, action panel, margins

        // Calculate grid layout
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);

        // Spacing constants
        const spacing = 20;                      // CONSTANT: pixels between neighborhoods
        const internalGap = 5;                   // CONSTANT: gap inside each square

        // Calculate square size to fit all neighborhoods
        const maxWidthPerSquare = Math.floor((availableWidth - (spacing * (cols + 1))) / cols);
        const maxHeightPerSquare = Math.floor((availableHeight - (spacing * (rows + 1))) / rows);
        const squareSize = Math.min(maxWidthPerSquare, maxHeightPerSquare);  // Use smaller dimension for squares

        // Calculate total grid dimensions
        const gridWidth = cols * squareSize + (cols + 1) * spacing;
        const gridHeight = rows * squareSize + (rows + 1) * spacing;

        // Center the grid in available space
        const startX = Math.floor((availableWidth - gridWidth) / 2) + 20;   // 20px left margin
        const startY = 70 + Math.floor((availableHeight - gridHeight) / 2) + 20;  // 70px status bar + centering

        // Position each neighborhood as a square
        // OUTPUT: Sets x, y, width, height on each neighborhood object
        neighborhoods.forEach((neighborhood, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            neighborhood.x = startX + spacing + col * (squareSize + spacing) + internalGap;
            neighborhood.y = startY + spacing + row * (squareSize + spacing) + internalGap;
            neighborhood.width = squareSize - (internalGap * 2);
            neighborhood.height = squareSize - (internalGap * 2);  // Always square!
        });
    }

    // ============================================================================
    // VICTORY CONDITIONS - CONSTANTS
    // ============================================================================
    // These values are checked by checkVictoryConditions()
    const VICTORY_CONDITIONS = {
        COMMUNITY_POWER_WIN: 80,                 // Victory if communityPower reaches 80
        ALL_NEIGHBORHOODS_LIBERATED: 60,         // Victory if all neighborhoods.resistance >= 60
        SURVEILLANCE_STATE_THRESHOLD: 95         // Defeat if heatLevel reaches 95
    };

    // ============================================================================
    // TIMER UPDATE - CALLED EVERY 1 SECOND
    // ============================================================================
    // INPUT: gameState.startTime, gameState.duration
    // OUTPUT: Updates DOM element 'gameTimer' with remaining time
    // CALLED BY: setInterval in startGame() every 1000ms
    // TRIGGERS: endGame('timeout') if time runs out
    function updateTimer() {
        // Safety check
        if (!gameState.isActive || !gameState.startTime) return;

        // Calculate remaining time
        const elapsed = Date.now() - gameState.startTime;           // INPUT: gameState.startTime
        const remaining = Math.max(0, gameState.duration - elapsed); // INPUT: gameState.duration (30 minutes)

        // Convert to minutes:seconds
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        // Update UI
        const timerElement = document.getElementById('gameTimer');  // OUTPUT: DOM element
        if (timerElement) {
            timerElement.textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // Check timeout
        if (remaining <= 0) {
            endGame('timeout');                                      // TRIGGERS: Game end
        }
    }

    // ============================================================================
    // CHECK VICTORY CONDITIONS - CALLED AFTER SIGNIFICANT STATE CHANGES
    // ============================================================================
    // INPUT: gameState.communityPower, gameState.neighborhoods, gameState.heatLevel
    // OUTPUT: Calls endGame() if any condition is met
    // CALLED BY: game loop (after gentrification resolution), actions.js (after player action)
    function checkVictoryConditions() {
        // Count liberated neighborhoods
        // INPUT: gameState.neighborhoods array
        // CHECKS: resistance >= VICTORY_CONDITIONS.ALL_NEIGHBORHOODS_LIBERATED (60)
        const liberatedCount = gameState.neighborhoods.filter(n => n.resistance >= VICTORY_CONDITIONS.ALL_NEIGHBORHOODS_LIBERATED).length;

        // Victory condition 1: High community power
        // INPUT: gameState.communityPower
        if (gameState.communityPower >= VICTORY_CONDITIONS.COMMUNITY_POWER_WIN) {  // >= 80
            endGame('victory', 'Community power reached critical mass! Participatory democracy established.');
        }

        // Victory condition 2: All neighborhoods liberated
        else if (liberatedCount === gameState.neighborhoods.length) {
            endGame('victory', 'All neighborhoods liberated! The AI Mayor has been overthrown.');
        }

        // Defeat condition: Surveillance state
        // INPUT: gameState.heatLevel
        else if (gameState.heatLevel >= VICTORY_CONDITIONS.SURVEILLANCE_STATE_THRESHOLD) {  // >= 95
            endGame('defeat', 'Surveillance state fully implemented. The resistance has been crushed.');
        }
    }

    // ============================================================================
    // END GAME - FINAL STATE
    // ============================================================================
    // INPUT: result ('victory', 'defeat', or 'timeout'), optional message
    // OUTPUT: Stops all intervals, shows game over modal, updates DOM
    // CALLED BY: checkVictoryConditions(), updateTimer()
    function endGame(result, message = '') {
        // Stop game
        gameState.isActive = false;              // OUTPUT: Stops game loop checks

        // Clear all intervals
        if (timerId) {
            clearInterval(timerId);               // Stops timer updates
            timerId = null;
        }
        if (gameLoopId) {
            clearInterval(gameLoopId);            // Stops main game loop
            gameLoopId = null;
        }

        // Get DOM elements for modal
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const messageEl = document.getElementById('gameOverMessage');

        // Set modal content based on result
        // INPUT: result parameter ('victory', 'defeat', 'timeout')
        if (result === 'victory') {
            title.textContent = '🏴 VICTORY!';
            title.style.color = '#27ae60';
        } else if (result === 'defeat') {
            title.textContent = '💔 DEFEAT';
            title.style.color = '#e74c3c';
        } else {
            title.textContent = '⏰ TIME UP';
            title.style.color = '#f39c12';
            // Determine message based on final communityPower
            // INPUT: gameState.communityPower
            message = gameState.communityPower >= 50 ?
                'Time\'s up! The resistance continues, but the struggle is far from over.' :
                'Time\'s up! The AI Mayor\'s optimization proceeded unchallenged.';
        }

        // Display modal
        messageEl.textContent = message || 'The resistance continues...';
        modal.style.display = 'flex';            // OUTPUT: Shows game over modal
    }

    // ============================================================================
    // RESTART GAME - RESET TO INITIAL STATE
    // ============================================================================
    // INPUT: None (resets all gameState to defaults)
    // OUTPUT: Resets gameState, clears DOM elements, calls startGame()
    // CALLED BY: User clicking restart button (optimicity.html line 339)
    function restartGame() {
        // Hide game over modal
        const modal = document.getElementById('gameOverModal');
        if (modal) modal.style.display = 'none';

        // Clear existing intervals (safety)
        if (timerId) clearInterval(timerId);
        if (gameLoopId) clearInterval(gameLoopId);

        // Reset core game state
        gameState.isActive = false;
        gameState.startTime = null;
        gameState.communityPower = 0;
        gameState.heatLevel = 0;
        gameState.activeCitizens = Math.floor(Math.random() * (300 - 100 + 1)) + 100;  // Re-randomize 100-300
        gameState.totalPopulation = Math.floor(Math.random() * (20000000 - 5000000 + 1)) + 5000000;  // Re-randomize 5M-20M
        gameState.citizensImprisoned = 0;
        gameState.citizensKilled = 0;
        gameState.selectedNeighborhood = null;
        gameState.actionCooldowns = {};

        // Reset currency system
        gameState.simCoin = 5000;
        gameState.totalActionsCompleted = 0;
        gameState.infrastructureBonus = 0;
        gameState.currencyEarningCooldowns = {};

        // Reset neighborhoods to initial values
        // OUTPUT: Resets resistance, gentrificationTimer, threatened for each neighborhood
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

        // Clear game log
        const logEntries = document.getElementById('logEntries');
        if (logEntries) {
            logEntries.innerHTML = '<div class="log-entry log-system">Game restarted. The resistance begins anew.</div>';
        }

        // Start fresh game
        startGame();                             // TRIGGERS: New game initialization
    }

    // ============================================================================
    // START GAME - INITIALIZE GAME LOOP
    // ============================================================================
    // INPUT: gameState (all initial values)
    // OUTPUT: Sets gameState.isActive, starts timer and game loop intervals
    // CALLED BY: optimicity.html (line 388), restartGame()
    // TRIGGERS: Timer updates (1s), game loop (5s)
    function startGame() {
        // Calculate neighborhood positions for rendering
        // INPUT: gameState.neighborhoods
        // OUTPUT: Adds x, y, width, height to each neighborhood
        calculateNeighborhoodPositions(gameState.neighborhoods);

        // Activate game
        gameState.isActive = true;               // OUTPUT: Enables game loop and actions
        gameState.startTime = Date.now();        // OUTPUT: Start timer reference

        // Add initial log messages
        // OUTPUT: Calls UIComponents.addLogEntry() if available
        if (window.UIComponents) {
            UIComponents.addLogEntry('🏴 Resistance network activated. Organize, resist, liberate!', 'system');
            UIComponents.addLogEntry('Select a neighborhood and choose your first action.', 'system');
        }

        // Start timer - updates every 1 second
        // OUTPUT: Creates interval that calls updateTimer() every 1000ms
        timerId = setInterval(updateTimer, 1000);

        // ========================================================================
        // MAIN GAME LOOP - RUNS EVERY 5 SECONDS
        // ========================================================================
        // This is the CORE TEMPORAL LOOP that drives all autonomous actions
        // INPUT: gameState (all properties)
        // OUTPUT: Updates neighborhoods, triggers AI Mayor and Citizens actions
        // TRIGGERS: ai-mayor.js, ai-citizens.js, neighborhoods.js, ui-components.js
        gameLoopId = setInterval(() => {
            // Safety check
            if (!gameState.isActive) return;

            // ====================================================================
            // NEIGHBORHOOD GENTRIFICATION COUNTDOWN
            // ====================================================================
            // INPUT: gameState.neighborhoods (threatened, gentrificationTimer, resistance)
            // OUTPUT: Decrements timers, resolves gentrification outcomes
            gameState.neighborhoods.forEach(neighborhood => {
                if (neighborhood.threatened && neighborhood.gentrificationTimer > 0) {
                    // Decrement timer
                    // Each tick = 5 seconds = 5/60 = 0.0833 minutes
                    neighborhood.gentrificationTimer -= (5 / 60);

                    // Round to avoid floating point precision problems
                    neighborhood.gentrificationTimer = Math.max(0, Math.round(neighborhood.gentrificationTimer * 100) / 100);

                    // Check if timer expired
                    if (neighborhood.gentrificationTimer <= 0) {
                        // OUTCOME 1: Gentrification succeeds (low resistance)
                        // INPUT: neighborhood.resistance
                        if (neighborhood.resistance < 40) {
                            if (window.UIComponents) {
                                // OUTPUT: Log gentrification event
                                UIComponents.addLogEntry(`💔 ${neighborhood.name} has been gentrified. Residents displaced.`, 'ai');
                            }
                            neighborhood.threatened = false;   // OUTPUT: No longer threatened
                            neighborhood.resistance = 0;       // OUTPUT: Resistance crushed
                        }

                        // OUTCOME 2: Defense succeeds (high resistance)
                        else {
                            if (window.UIComponents) {
                                // OUTPUT: Log successful defense
                                UIComponents.addLogEntry(`✊ ${neighborhood.name} successfully defended against gentrification!`, 'citizen');
                            }
                            neighborhood.threatened = false;         // OUTPUT: Saved
                            neighborhood.resistance += 10;           // OUTPUT: Resistance boost
                            gameState.communityPower += 10;         // OUTPUT: Community power boost
                        }

                        // Re-render neighborhoods after resolution
                        // TRIGGERS: neighborhoods.js renderAll()
                        if (window.Neighborhoods) {
                            Neighborhoods.renderAll();
                        }

                        // Update UI display
                        // TRIGGERS: ui-components.js updateAll()
                        if (window.UIComponents) {
                            UIComponents.updateAll();
                        }

                        // Check if this resolution caused victory/defeat
                        // TRIGGERS: checkVictoryConditions()
                        checkVictoryConditions();
                    }
                }
            });

            // ====================================================================
            // AI MAYOR AUTONOMOUS ACTIONS
            // ====================================================================
            // TRIGGERS: ai-mayor.js triggerRandomAction()
            // INPUT: gameState (communityPower, heatLevel, neighborhoods)
            // OUTPUT: May modify heatLevel, citizensImprisoned, citizensKilled, activeCitizens, gentrificationTimer
            if (window.AIMayor) {
                AIMayor.triggerRandomAction();
            }

            // ====================================================================
            // COMMUNITY AUTONOMOUS ACTIONS
            // ====================================================================
            // TRIGGERS: ai-citizens.js triggerCommunityAction()
            // INPUT: gameState (communityPower, activeCitizens, heatLevel, threatened neighborhoods)
            // OUTPUT: May modify communityPower (+1 if triggered)
            if (window.AICitizens) {
                AICitizens.triggerCommunityAction();
            }

        }, 5000); // Update every 5 seconds (5000ms)

        // Initial UI update at game start
        // TRIGGERS: ui-components.js updateAll()
        if (window.UIComponents) {
            UIComponents.updateAll();
        }
    }

    // ============================================================================
    // PUBLIC API - EXPORTED FUNCTIONS
    // ============================================================================
    // These functions are the ONLY way external modules can interact with gameState
    // USED BY: actions.js, ai-mayor.js, ai-citizens.js, currency.js, neighborhoods.js
    return {
        // ====================================================================
        // INITIALIZATION
        // ====================================================================
        // CALLED BY: optimicity.html (line 310)
        init: function () {
            console.log('GameCore initialized');
        },

        // ====================================================================
        // STATE ACCESS
        // ====================================================================
        // INPUT: None
        // OUTPUT: Returns entire gameState object
        // CALLED BY: All modules that need to read state (actions.js, ai-mayor.js, ai-citizens.js, etc.)
        getState: function () {
            return gameState;
        },

        // ====================================================================
        // GAME CONTROL
        // ====================================================================
        startGame: startGame,                    // EXPOSED: For optimicity.html to start game
        restartGame: restartGame,                // EXPOSED: For restart button
        endGame: endGame,                        // EXPOSED: For manual game ending (if needed)
        checkVictoryConditions: checkVictoryConditions,  // EXPOSED: For actions.js to check after player action

        // ====================================================================
        // COMMUNITY POWER MODIFIER
        // ====================================================================
        // INPUT: change (positive or negative integer)
        // OUTPUT: Modifies gameState.communityPower (clamped 0-100)
        // CALLED BY: 
        //   - actions.js: after successful player action (+powerGain)
        //   - ai-citizens.js: triggerCommunityAction() (+1), celebrateLiberation() (+5), respondToAIEscalation() (+2)
        //   - game loop: neighborhood defense success (+10)
        updateCommunityPower: function (change) {
            gameState.communityPower = Math.max(0, Math.min(100, gameState.communityPower + change));
        },

        // ====================================================================
        // HEAT LEVEL MODIFIER
        // ====================================================================
        // INPUT: change (positive or negative integer)
        // OUTPUT: Modifies gameState.heatLevel (clamped minHeatLevel-100)
        // SIDE EFFECT: Calls checkHeatThresholds() to check ratcheting
        // CALLED BY:
        //   - actions.js: after player action (+heatGain)
        //   - checkSpamPenalty(): rapid actions (+2 to +8)
        //   - ai-mayor.js: triggerEscalation() (+3)
        updateHeatLevel: function (change) {
            // Apply heat change but respect minimum heat level (ratcheting effect)
            // INPUT: gameState.minHeatLevel (set by checkHeatThresholds)
            const newHeatLevel = Math.max(gameState.minHeatLevel, Math.min(100, gameState.heatLevel + change));
            gameState.heatLevel = newHeatLevel;

            // Check if we've crossed any surveillance thresholds
            // TRIGGERS: checkHeatThresholds()
            this.checkHeatThresholds();
        },

        // ====================================================================
        // ACTIVE CITIZENS MODIFIER
        // ====================================================================
        // INPUT: change (usually negative from casualties/arrests)
        // OUTPUT: Modifies gameState.activeCitizens (min 0)
        // CALLED BY:
        //   - actions.js: casualties from player action (negative)
        //   - ai-mayor.js: arrests and killings (negative)
        //   - ai-citizens.js: celebrateLiberation() (+1)
        updateActiveCitizens: function (change) {
            gameState.activeCitizens = Math.max(0, gameState.activeCitizens + change);
        },

        // ====================================================================
        // IMPRISONED COUNTER MODIFIER
        // ====================================================================
        // INPUT: change (usually positive)
        // OUTPUT: Modifies gameState.citizensImprisoned (min 0)
        // CALLED BY:
        //   - actions.js: casualties from player action
        //   - ai-mayor.js: autonomous arrests
        updateCitizensImprisoned: function (change) {
            gameState.citizensImprisoned = Math.max(0, gameState.citizensImprisoned + change);
        },

        // ====================================================================
        // KILLED COUNTER MODIFIER
        // ====================================================================
        // INPUT: change (usually positive)
        // OUTPUT: Modifies gameState.citizensKilled (min 0)
        // SIDE EFFECT: Also decreases gameState.totalPopulation
        // CALLED BY:
        //   - actions.js: casualties from player action
        //   - ai-mayor.js: killings from escalation
        updateCitizensKilled: function (change) {
            gameState.citizensKilled = Math.max(0, gameState.citizensKilled + change);
            // Remove from total population
            gameState.totalPopulation = Math.max(0, gameState.totalPopulation - change);
        },

        // ====================================================================
        // ACTION COOLDOWN SYSTEM
        // ====================================================================
        // These manage per-action, per-neighborhood cooldowns
        // KEY FORMAT: 'actionType_neighborhoodId' (e.g., 'occupy_market')

        // Set cooldown
        // INPUT: cooldownKey (string), duration (milliseconds)
        // OUTPUT: Sets gameState.actionCooldowns[cooldownKey] = timestamp
        // CALLED BY: actions.js after performing action
        setActionCooldown: function (cooldownKey, duration) {
            gameState.actionCooldowns[cooldownKey] = Date.now() + duration;
        },

        // Clear cooldown
        // INPUT: cooldownKey (string)
        // OUTPUT: Deletes gameState.actionCooldowns[cooldownKey]
        // CALLED BY: actions.js setTimeout after cooldown expires
        clearActionCooldown: function (cooldownKey) {
            delete gameState.actionCooldowns[cooldownKey];
        },

        // Check if action on cooldown
        // INPUT: cooldownKey (string)
        // OUTPUT: Boolean - true if still on cooldown
        // CALLED BY: actions.js canPerformAction(), performAction()
        isActionOnCooldown: function (cooldownKey) {
            const cooldownEnd = gameState.actionCooldowns[cooldownKey];
            return cooldownEnd && Date.now() < cooldownEnd;
        },

        // Get remaining cooldown time
        // INPUT: cooldownKey (string)
        // OUTPUT: Milliseconds remaining (0 if not on cooldown)
        // CALLED BY: actions.js updateActionButtonStates() (for countdown display)
        getActionCooldownRemaining: function (cooldownKey) {
            const cooldownEnd = gameState.actionCooldowns[cooldownKey];
            return cooldownEnd ? Math.max(0, cooldownEnd - Date.now()) : 0;
        },

        // ====================================================================
        // GLOBAL ACTION COOLDOWN SYSTEM (HEAT SYSTEM)
        // ====================================================================
        // This is the 3-second cooldown between ANY actions
        // Prevents spam and enables spam penalty calculation

        // Check if global cooldown active
        // INPUT: None (reads gameState.lastActionTime, gameState.globalActionCooldown)
        // OUTPUT: Boolean - true if cannot act yet
        // CALLED BY: actions.js performAction(), canPerformAction()
        isGlobalActionOnCooldown: function () {
            return Date.now() < gameState.lastActionTime + gameState.globalActionCooldown;
        },

        // Get remaining global cooldown time
        // INPUT: None
        // OUTPUT: Milliseconds remaining
        // CALLED BY: actions.js updateActionButtonStates() (for countdown display)
        getGlobalActionCooldownRemaining: function () {
            return Math.max(0, (gameState.lastActionTime + gameState.globalActionCooldown) - Date.now());
        },

        // Set global cooldown (called after action)
        // INPUT: None
        // OUTPUT: Sets gameState.lastActionTime = now
        // CALLED BY: actions.js performAction()
        setGlobalActionCooldown: function () {
            gameState.lastActionTime = Date.now();
        },

        // ====================================================================
        // SPAM PENALTY SYSTEM
        // ====================================================================
        // INPUT: None (reads gameState.lastActionTime)
        // OUTPUT: Returns heat penalty applied, modifies gameState.heatLevel
        // CALLED BY: actions.js performAction() before applying action effects
        checkSpamPenalty: function () {
            const timeSinceLastAction = Date.now() - gameState.lastActionTime;
            let heatPenalty = 0;

            // Very rapid action (under 2 seconds)
            if (timeSinceLastAction < 2000) {
                heatPenalty = 8;                 // CONSTANT: +8 heat penalty
            }
            // Quick action (2-5 seconds)
            else if (timeSinceLastAction < 5000) {
                heatPenalty = 4;                 // CONSTANT: +4 heat penalty
            }
            // Moderate action (5-10 seconds)
            else if (timeSinceLastAction < 10000) {
                heatPenalty = 2;                 // CONSTANT: +2 heat penalty
            }
            // No penalty for actions 10+ seconds apart

            if (heatPenalty > 0) {
                // Apply penalty
                // TRIGGERS: updateHeatLevel()
                this.updateHeatLevel(heatPenalty);

                // Log penalty
                if (window.UIComponents) {
                    window.UIComponents.addLogEntry(`⚠️ Rapid actions detected! +${heatPenalty} surveillance heat`, 'system');
                }
            }

            return heatPenalty;
        },

        // ====================================================================
        // HEAT THRESHOLD RATCHETING SYSTEM
        // ====================================================================
        // INPUT: None (reads gameState.heatLevel, gameState.heatThresholds)
        // OUTPUT: May modify gameState.minHeatLevel (locks minimum heat)
        // CALLED BY: updateHeatLevel() after every heat change
        checkHeatThresholds: function () {
            // Check each threshold
            // INPUT: gameState.heatThresholds = [25, 50, 75]
            for (const threshold of gameState.heatThresholds) {
                // If crossed threshold and haven't locked it yet
                if (gameState.heatLevel >= threshold && gameState.minHeatLevel < threshold) {
                    // Lock minimum heat at this threshold
                    gameState.minHeatLevel = threshold;  // OUTPUT: Heat cannot drop below this

                    // Log threshold crossing
                    if (window.UIComponents) {
                        window.UIComponents.addLogEntry(`🚨 SURVEILLANCE THRESHOLD REACHED: Heat level locked at minimum ${threshold}%`, 'system');
                    }
                }
            }
        },

        // ====================================================================
        // NEIGHBORHOOD SELECTION
        // ====================================================================
        // INPUT: neighborhoodId (string like 'market', 'riverside')
        // OUTPUT: Sets gameState.selectedNeighborhood
        // CALLED BY: neighborhoods.js when user clicks a neighborhood
        selectNeighborhood: function (neighborhoodId) {
            gameState.selectedNeighborhood = neighborhoodId;
        },

        // ====================================================================
        // CURRENCY MANAGEMENT FUNCTIONS
        // ====================================================================
        // These manage the SimCoin economy

        // Update SimCoin balance
        // INPUT: amount (positive = earn, negative = spend)
        // OUTPUT: Modifies gameState.simCoin (min 0)
        // CALLED BY: currency.js (earning methods), actions.js (spending on actions)
        updateSimCoin: function (amount) {
            gameState.simCoin = Math.max(0, gameState.simCoin + amount);
        },

        // Get current SimCoin balance
        // INPUT: None
        // OUTPUT: Returns gameState.simCoin
        // CALLED BY: currency.js, actions.js
        getSimCoin: function () {
            return gameState.simCoin;
        },

        // Check if can afford cost
        // INPUT: cost (integer)
        // OUTPUT: Boolean - true if simCoin >= cost
        // CALLED BY: actions.js canPerformAction()
        canAfford: function (cost) {
            return gameState.simCoin >= cost;
        },

        // Increment actions completed counter
        // INPUT: None
        // OUTPUT: Increments gameState.totalActionsCompleted
        // CALLED BY: actions.js performAction()
        incrementActionsCompleted: function () {
            gameState.totalActionsCompleted++;
        },

        // Update infrastructure bonus (mining boost)
        // INPUT: amount (usually positive)
        // OUTPUT: Modifies gameState.infrastructureBonus
        // CALLED BY: actions.js after infrastructure actions (hackCams, meshNet, pirateBroad)
        updateInfrastructureBonus: function (amount) {
            gameState.infrastructureBonus += amount;
        },

        // Set currency earning cooldown
        // INPUT: type (string like 'nft', 'crowdfund'), duration (milliseconds)
        // OUTPUT: Sets gameState.currencyEarningCooldowns[type] = timestamp
        // CALLED BY: currency.js after earning action
        setCurrencyEarningCooldown: function (type, duration) {
            gameState.currencyEarningCooldowns[type] = Date.now() + duration;
        },

        // Check if currency earning on cooldown
        // INPUT: type (string)
        // OUTPUT: Boolean - true if still on cooldown
        // CALLED BY: currency.js before allowing earning action
        isCurrencyEarningOnCooldown: function (type) {
            const cooldownEnd = gameState.currencyEarningCooldowns[type];
            return cooldownEnd && Date.now() < cooldownEnd;
        },

        // Get remaining currency earning cooldown time
        // INPUT: type (string)
        // OUTPUT: Milliseconds remaining
        // CALLED BY: currency.js for countdown display
        getCurrencyEarningCooldownRemaining: function (type) {
            const cooldownEnd = gameState.currencyEarningCooldowns[type];
            return cooldownEnd ? Math.max(0, cooldownEnd - Date.now()) : 0;
        }
    };
})();

// ============================================================================
// DATA FLOW SUMMARY
// ============================================================================
//
// PRIMARY INPUTS TO GAME-CORE:
// - actions.js: performAction() → calls updateCommunityPower, updateHeatLevel, updateActiveCitizens, etc.
// - ai-mayor.js: triggerEscalation() → calls updateHeatLevel, updateCitizensImprisoned, updateCitizensKilled
// - ai-citizens.js: triggerCommunityAction() → calls updateCommunityPower
// - neighborhoods.js: user click → calls selectNeighborhood()
// - currency.js: earning/spending → calls updateSimCoin
//
// PRIMARY OUTPUTS FROM GAME-CORE:
// - ui-components.js: updateAll() → reads gameState via getState()
// - neighborhoods.js: renderAll() → reads gameState.neighborhoods
// - actions.js: canPerformAction() → reads gameState via isActionOnCooldown(), canAfford()
// - ai-mayor.js: buildPrompt() → reads gameState for context
// - ai-citizens.js: buildPrompt() → reads gameState for morale level
//
// TEMPORAL TRIGGERS:
// - Every 1s: updateTimer() → updates DOM timer
// - Every 5s: game loop → updates gentrification timers, triggers AI Mayor, triggers Citizens
//
// ============================================================================
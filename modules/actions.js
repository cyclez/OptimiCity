// OptimiCity - Actions Module - FULLY COMMENTED VERSION
// Handles: Player actions, cooldowns, effects calculation, casualties, recruitment
//
// DATA FLOW SUMMARY:
// INPUT SOURCES: 
//   - optimicity.html: User clicks action buttons → calls performAction()
//   - game-core.js: Provides gameState via getState()
//   - currency.js: Checks affordability, deducts SimCoin
//   - neighborhoods.js: Provides selected neighborhood info
//
// OUTPUT TARGETS:
//   - game-core.js: Updates communityPower, heatLevel, activeCitizens, imprisoned, killed
//   - neighborhoods.js: Updates neighborhood resistance via updateNeighborhoodState()
//   - ui-components.js: Logs actions, updates UI display
//   - ai-mayor.js: Triggers AI response after 1s delay
//   - ai-citizens.js: Triggers citizen response after 2.5s (25% chance)
//
// KEY TEMPORAL FLOWS:
//   1. User clicks action → performAction() executes immediately
//   2. Cooldown set → clearActionCooldown() after duration expires
//   3. AI Mayor response → triggered after 1000ms delay
//   4. Citizens response → triggered after 2500ms delay (25% probability)
//   5. Button states → updated every 1000ms via setInterval
//
// CRITICAL SYSTEMS:
//   - Per-action cooldowns: Each action in each neighborhood has separate cooldown
//   - Global cooldown: 3-second heat system prevents rapid actions
//   - Risk/Casualty system: Heat determines probability and severity of casualties
//   - Recruitment system: Three phases based on active citizen count
//   - Dynamic cooldown: Calculated based on heat and power gains

window.Actions = (function () {
    'use strict';

    // ============================================================================
    // ACTION DEFINITIONS - CORE DATA
    // ============================================================================
    // This object defines ALL player actions with their ranges
    // STRUCTURE: { actionType: { power: [min, max], heat: [min, max], description } }
    // READ BY: performAction() for effect calculation, getActionDefinition() for external access
    // USED IN: calculateActionCooldown(), performAction(), updateActionButtonStates()
    const actionDefinitions = {

        // ACTIONS ARRAY KEY:
        actionType: ["Direct, Cultural Resistance, Infrastructure Hack, Organizing"],

        // DIRECT ACTION CATEGORY
        occupy: {
            actionType: [1],
            power: [6, 10],                      // Community power gain range
            heat: [12, 18],                      // Heat gain range
            description: 'Organized building occupation'  // Used in AI prompts and logs
        },
        blockDemo: {
            actionType: [1],
            power: [8, 12],
            heat: [15, 25],
            description: 'Blocked demolition crews'
        },
        protest: {
            actionType: [1],
            power: [5, 8],
            heat: [10, 15],
            description: 'Led protest march'
        },

        // CULTURAL RESISTANCE CATEGORY
        streetArt: {
            actionType: [2],
            power: [3, 6],
            heat: [4, 8],
            description: 'Created inspiring mural'
        },
        garden: {
            actionType: [2],
            power: [4, 7],
            heat: [2, 5],
            description: 'Planted community garden'
        },
        festival: {
            actionType: [2],
            power: [6, 9],
            heat: [6, 10],
            description: 'Organized block festival'
        },

        // INFRASTRUCTURE HACK CATEGORY
        hackCams: {
            actionType: [3],
            power: [5, 8],
            heat: [8, 12],
            description: 'Disabled surveillance cameras'
        },
        meshNet: {
            actionType: [3],
            power: [4, 6],
            heat: [5, 8],
            description: 'Installed mesh network nodes'
        },
        pirateBroad: {
            actionType: [3],
            power: [7, 10],
            heat: [12, 16],
            description: 'Hijacked city communications'
        },

        // ORGANIZING CATEGORY
        meeting: {
            actionType: [4],
            power: [3, 5],
            heat: [1, 3],
            description: 'Held secret organizing meeting'
        },
        recruit: {
            actionType: [3],
            power: [5, 8],
            heat: [3, 6],
            description: 'Recruited new allies'
        },
        intel: {
            actionType: [3],
            power: [2, 4],
            heat: [1, 2],
            description: 'Gathered intelligence on AI Mayor'
        }
    };

    // ============================================================================
    // DYNAMIC COOLDOWN CALCULATOR
    // ============================================================================
    // INPUT: heatGain (from action), powerGain (from action)
    // OUTPUT: Cooldown duration in milliseconds (500ms - 180000ms)
    // CALLED BY: performAction() after calculating action effects
    // FORMULA: min(180000, 500 + (heatGain/25)*150000 + (powerGain/12)*30000)
    // PURPOSE: Higher risk/reward actions have longer cooldowns
    function calculateActionCooldown(heatGain, powerGain) {
        // Base cooldown: always at least 500ms
        const baseCooldown = 500;                // CONSTANT: Minimum cooldown

        // Heat factor: more heat = longer cooldown (up to 2.5 minutes extra)
        // FORMULA: (heatGain / 25) * 150000
        // EXAMPLE: heatGain=25 → 150s, heatGain=12.5 → 75s
        const heatFactor = (heatGain / 25) * 150000;  // Max 150,000ms (150 seconds)

        // Power factor: more power = slightly longer cooldown (up to 30 seconds extra)
        // FORMULA: (powerGain / 12) * 30000
        // EXAMPLE: powerGain=12 → 30s, powerGain=6 → 15s
        const powerFactor = (powerGain / 12) * 30000;  // Max 30,000ms (30 seconds)

        // Total cooldown (capped at 3 minutes)
        // OUTPUT: Used by GameCore.setActionCooldown()
        return Math.min(180000, baseCooldown + heatFactor + powerFactor);  // CONSTANT: Max 180,000ms (3 minutes)
    }

    // ============================================================================
    // RISK LEVEL CALCULATOR
    // ============================================================================
    // INPUT: gameState (specifically gameState.heatLevel)
    // OUTPUT: Risk level string ('low', 'medium', 'high', 'extreme')
    // CALLED BY: performAction() to determine casualty probability
    // USED BY: calculateCasualties(), getRiskProbability()
    function calculateActionRisk(gameState, projectedHeat = null) {
        const heatLevel = projectedHeat !== null ? projectedHeat : gameState.heatLevel;   // INPUT: From game-core.js or projected

        // Risk thresholds based on heat
        if (heatLevel < 25) return 'low';        // CONSTANT: 0-24 heat
        if (heatLevel < 50) return 'medium';     // CONSTANT: 25-49 heat
        if (heatLevel < 75) return 'high';       // CONSTANT: 50-74 heat
        return 'extreme';                        // CONSTANT: 75-100 heat
    }

    // ============================================================================
    // CASUALTY PROBABILITY LOOKUP
    // ============================================================================
    // INPUT: riskLevel (from calculateActionRisk)
    // OUTPUT: Probability as decimal (0.05 to 0.75)
    // CALLED BY: performAction() to determine if casualties occur
    function getRiskProbability(riskLevel) {
        switch (riskLevel) {
            case 'low': return 0.05;             // CONSTANT: 5% chance of casualties
            case 'medium': return 0.25;          // CONSTANT: 25% chance
            case 'high': return 0.55;            // CONSTANT: 55% chance
            case 'extreme': return 0.75;         // CONSTANT: 75% chance
            default: return 0;
        }
    }

    // ============================================================================
    // CASUALTY CALCULATOR - COMPLEX SCALING SYSTEM
    // ============================================================================
    // INPUT: riskLevel (string), actionType (string)
    // OUTPUT: { killed: number, imprisoned: number }
    // CALLED BY: performAction() if casualty probability check succeeds
    // PURPOSE: Calculate realistic casualties based on resistance size and risk
    function calculateCasualties(riskLevel, actionType) {
        // Get current game state
        const gameState = window.GameCore.getState();  // INPUT: From game-core.js

        // Action type classification
        // CONSTANT: Direct actions are more dangerous
        const directActions = ['occupy', 'blockDemo', 'protest'];
        // CONSTANT: Low-risk actions have 90% casualty reduction
        const lowRiskActions = ['garden', 'meeting', 'intel'];

        const isDirectAction = directActions.includes(actionType);
        const isLowRiskAction = lowRiskActions.includes(actionType);

        // ========================================================================
        // SIZE FACTOR: Scale casualties based on active resistance size
        // ========================================================================
        // INPUT: gameState.activeCitizens
        // PURPOSE: Smaller movements face proportionally fewer casualties
        const activeCitizens = gameState.activeCitizens;

        let sizeFactor;
        if (activeCitizens < 100) {
            sizeFactor = 0.1;                    // CONSTANT: Small groups (10% risk)
        } else if (activeCitizens < 1000) {
            sizeFactor = 0.3;                    // CONSTANT: Medium groups (30% risk)
        } else {
            sizeFactor = 0.5;                    // CONSTANT: Large movements (50% risk)
        }

        // ========================================================================
        // HEAT FACTOR: Higher heat = more violent repression
        // ========================================================================
        // INPUT: gameState.heatLevel
        // FORMULA: max(0.5, heatLevel / 100)
        // PURPOSE: Heat amplifies casualties (minimum 50% of base)
        const heatFactor = Math.max(0.5, gameState.heatLevel / 100);

        let killed = 0;
        let imprisoned = 0;

        // ========================================================================
        // LOW-RISK MULTIPLIER: Organizing actions are much safer
        // ========================================================================
        // CONSTANT: Low-risk actions get 90% casualty reduction
        const lowRiskMultiplier = isLowRiskAction ? 0.1 : 1.0;

        // ========================================================================
        // CASUALTY CALCULATION BY RISK LEVEL
        // ========================================================================
        // Each risk level has different base casualty ranges
        // FORMULA: floor(random * range × sizeFactor × [heatFactor] × lowRiskMultiplier)
        switch (riskLevel) {
            case 'low':
                // Base: 1-2 imprisoned
                imprisoned = Math.floor((Math.random() * 2 + 1) * sizeFactor * lowRiskMultiplier);

                // Rare deaths for direct actions only
                // CONSTANT: 5% chance of 1 death even at low risk
                if (isDirectAction && Math.random() < 0.05) {
                    killed = 1;
                }
                break;

            case 'medium':
                // Base: 2-7 imprisoned
                imprisoned = Math.floor((Math.random() * 5 + 2) * sizeFactor * lowRiskMultiplier);

                // Occasional deaths for direct actions
                // CONSTANT: 15% chance of 1-2 deaths
                if (isDirectAction && Math.random() < 0.15) {
                    killed = Math.floor((Math.random() * 2 + 1) * sizeFactor * lowRiskMultiplier);
                }
                break;

            case 'high':
                // Base: 3-11 imprisoned (scaled by heat)
                imprisoned = Math.floor((Math.random() * 8 + 3) * sizeFactor * heatFactor * lowRiskMultiplier);

                // Base: 1-4 killed (scaled by heat)
                killed = Math.floor((Math.random() * 3 + 1) * sizeFactor * heatFactor * lowRiskMultiplier);

                // Direct actions get additional casualties
                if (isDirectAction) {
                    killed += Math.floor((Math.random() * 2 + 1) * sizeFactor);
                }
                break;

            case 'extreme':
                // Base: 5-17 imprisoned (scaled by heat)
                imprisoned = Math.floor((Math.random() * 12 + 5) * sizeFactor * heatFactor * lowRiskMultiplier);

                // Base: 2-7 killed (scaled by heat)
                killed = Math.floor((Math.random() * 5 + 2) * sizeFactor * heatFactor * lowRiskMultiplier);

                // Direct actions get heavy additional casualties
                if (isDirectAction) {
                    killed += Math.floor((Math.random() * 3 + 1) * sizeFactor * heatFactor);
                }
                break;
        }

        // OUTPUT: Object with calculated casualties
        return { killed, imprisoned };
    }

    // ============================================================================
    // PERFORM ACTION - MAIN ACTION EXECUTION FUNCTION
    // ============================================================================
    // This is the CORE FUNCTION that executes when a player takes any action
    // INPUT: actionType (string like 'occupy', 'protest', etc.)
    // OUTPUT: Multiple side effects (state changes, UI updates, AI triggers)
    // CALLED BY: optimicity.html event listeners on action buttons
    // TRIGGERS: game-core updates, UI updates, AI responses, neighborhood updates
    async function performAction(actionType) {
        // ====================================================================
        // STEP 1: GET CURRENT GAME STATE
        // ====================================================================
        // INPUT: None
        // OUTPUT: gameState object from game-core.js
        const gameState = window.GameCore.getState();

        // ====================================================================
        // STEP 2: CHECK PER-ACTION COOLDOWN
        // ====================================================================
        // PURPOSE: Each action in each neighborhood has separate cooldown
        // KEY FORMAT: 'actionType_neighborhoodId' (e.g., 'occupy_market')
        const cooldownKey = `${actionType}_${gameState.selectedNeighborhood}`;

        // CHECK: Is this specific action still on cooldown in this neighborhood?
        // INPUT: cooldownKey
        // CALLS: game-core.js isActionOnCooldown()
        if (window.GameCore.isActionOnCooldown(cooldownKey)) {
            if (window.UIComponents) {
                // OUTPUT: Log message to UI
                window.UIComponents.addLogEntry(`${actionType} is still on cooldown in this neighborhood.`);
            }
            return;  // ABORT: Action not available yet
        }

        // ====================================================================
        // STEP 3: CHECK GLOBAL COOLDOWN (HEAT SYSTEM)
        // ====================================================================
        // PURPOSE: 3-second cooldown between ANY actions to prevent spam
        // CALLS: game-core.js isGlobalActionOnCooldown()
        if (window.GameCore.isGlobalActionOnCooldown()) {
            // Get remaining time for user feedback
            const remaining = Math.ceil(window.GameCore.getGlobalActionCooldownRemaining() / 1000);

            if (window.UIComponents) {
                // OUTPUT: Warning message with countdown
                window.UIComponents.addLogEntry(`⏱️ Action too rapid! Wait ${remaining}s to avoid surveillance detection.`, 'system');
            }
            return;  // ABORT: Too soon since last action
        }

        // ====================================================================
        // STEP 4: CHECK NEIGHBORHOOD SELECTION
        // ====================================================================
        // INPUT: gameState.selectedNeighborhood (set by neighborhoods.js)
        if (!gameState.selectedNeighborhood) {
            if (window.UIComponents) {
                // OUTPUT: Instruction to select neighborhood
                window.UIComponents.addLogEntry("Select a neighborhood first to take action.");
            }
            return;  // ABORT: No target selected
        }

        // ====================================================================
        // STEP 5: CHECK AFFORDABILITY (CURRENCY SYSTEM)
        // ====================================================================
        // CALLS: currency.js canAffordAction()
        // INPUT: actionType
        if (window.Currency && !window.Currency.canAffordAction(actionType)) {
            // Get cost for user feedback
            // CALLS: currency.js getActionCost()
            const cost = window.Currency.getActionCost(actionType);

            if (window.UIComponents) {
                // OUTPUT: Insufficient funds message
                window.UIComponents.addLogEntry(`Insufficient SimCoin for ${actionType}. Need ${cost.toLocaleString()} SimCoin.`, 'system');
            }
            return;  // ABORT: Cannot afford action
        }

        // ====================================================================
        // STEP 6: GET ACTION DATA
        // ====================================================================
        // Find the target neighborhood from gameState
        // INPUT: gameState.neighborhoods array, gameState.selectedNeighborhood
        const neighborhood = gameState.neighborhoods.find(n => n.id === gameState.selectedNeighborhood);

        // Get action definition
        // INPUT: actionType
        // SOURCE: actionDefinitions object
        const action = actionDefinitions[actionType];

        // Safety check
        if (!neighborhood || !action) return;  // ABORT: Invalid data

        // ====================================================================
        // STEP 7: PURCHASE ACTION (DEDUCT SIMCOIN)
        // ====================================================================
        // CALLS: currency.js purchaseAction()
        // OUTPUT: Deducts SimCoin from gameState
        if (window.Currency && !window.Currency.purchaseAction(actionType)) {
            if (window.UIComponents) {
                // OUTPUT: Transaction error message
                window.UIComponents.addLogEntry(`Failed to purchase ${actionType}. Transaction error.`, 'system');
            }
            return;  // ABORT: Purchase failed
        }

        // ====================================================================
        // STEP 8: CALCULATE ACTION EFFECTS
        // ====================================================================
        // Random values within action's defined range
        // INPUT: action.power[min, max], action.heat[min, max]
        // FORMULA: floor(random * (max - min + 1)) + min
        const powerGain = Math.floor(Math.random() * (action.power[1] - action.power[0] + 1)) + action.power[0];
        const heatGain = Math.floor(Math.random() * (action.heat[1] - action.heat[0] + 1)) + action.heat[0];

        // ====================================================================
        // STEP 9: CALCULATE DYNAMIC COOLDOWN
        // ====================================================================
        // CALLS: calculateActionCooldown()
        // INPUT: heatGain, powerGain
        // OUTPUT: Cooldown duration (500ms - 180000ms)
        const cooldownDuration = calculateActionCooldown(heatGain, powerGain);

        // ====================================================================
        // STEP 10: CALCULATE RISK LEVEL
        // ====================================================================
        // CALLS: calculateActionRisk()
        // INPUT: gameState (uses heatLevel + projected heatGain)
        // OUTPUT: 'low', 'medium', 'high', or 'extreme'
        // NOTE: Risk calculated with projected heat (current + gain) because
        //       casualties reflect the danger level the action creates
        const projectedHeat = Math.min(100, gameState.heatLevel + heatGain);
        const riskLevel = calculateActionRisk(gameState, projectedHeat);

        // ====================================================================
        // STEP 11: SET ACTION COOLDOWN
        // ====================================================================
        // Start cooldown for this specific action in this neighborhood
        // CALLS: game-core.js setActionCooldown()
        // OUTPUT: Sets gameState.actionCooldowns[cooldownKey] = timestamp
        window.GameCore.setActionCooldown(cooldownKey, cooldownDuration);

        // Schedule cooldown clear
        // TRIGGERS: clearActionCooldown() after duration expires
        // SIDE EFFECT: Updates button states after cooldown
        setTimeout(() => {
            window.GameCore.clearActionCooldown(cooldownKey);
            updateActionButtonStates();  // TRIGGERS: UI update
        }, cooldownDuration);

        // ====================================================================
        // STEP 12: APPLY CORE EFFECTS TO GAME STATE
        // ====================================================================
        // Update community power
        // CALLS: game-core.js updateCommunityPower()
        // OUTPUT: Modifies gameState.communityPower (+powerGain)
        window.GameCore.updateCommunityPower(powerGain);

        // NOTE: Heat update moved to STEP 19 - only applied if AI Mayor notices action
        // This enables true stealth gameplay at low heat levels

        // NOTE: Spam penalty removed - global cooldown (3s) + action-specific cooldowns
        //       provide sufficient spam prevention. Heat now only increases if action noticed.

        // Set global cooldown timestamp
        // CALLS: game-core.js setGlobalActionCooldown()
        // OUTPUT: Sets gameState.lastActionTime = now
        window.GameCore.setGlobalActionCooldown();

        // ====================================================================
        // STEP 14: CASUALTY SYSTEM
        // ====================================================================
        // Check if casualties occur based on risk probability
        console.log(`Risk level: ${riskLevel}, Heat: ${gameState.heatLevel}`);

        const forceCasualties = false;  // DEBUG: Can force casualties for testing

        // Roll for casualties
        // INPUT: Risk probability from getRiskProbability()
        // FORMULA: random < probability
        if (forceCasualties || Math.random() < getRiskProbability(riskLevel)) {
            // Calculate casualty numbers
            // CALLS: calculateCasualties()
            // INPUT: riskLevel, actionType
            // OUTPUT: { killed: number, imprisoned: number }
            const casualties = calculateCasualties(riskLevel, actionType);
            console.log(`Casualties calculated:`, casualties);

            // Process killed
            if (casualties.killed > 0) {
                // CALLS: game-core.js updateCitizensKilled()
                // OUTPUT: Increments gameState.citizensKilled
                // SIDE EFFECT: Also decreases gameState.totalPopulation
                window.GameCore.updateCitizensKilled(casualties.killed);

                // CALLS: game-core.js updateActiveCitizens()
                // OUTPUT: Decreases gameState.activeCitizens
                window.GameCore.updateActiveCitizens(-casualties.killed);

                if (window.UIComponents) {
                    // OUTPUT: Log casualties
                    window.UIComponents.addLogEntry(`💀 ${casualties.killed} citizens killed by AI Mayor forces`, 'ai');
                }
            }

            // Process imprisoned
            if (casualties.imprisoned > 0) {
                // CALLS: game-core.js updateCitizensImprisoned()
                // OUTPUT: Increments gameState.citizensImprisoned
                window.GameCore.updateCitizensImprisoned(casualties.imprisoned);

                // CALLS: game-core.js updateActiveCitizens()
                // OUTPUT: Decreases gameState.activeCitizens
                window.GameCore.updateActiveCitizens(-casualties.imprisoned);

                if (window.UIComponents) {
                    // OUTPUT: Log arrests
                    window.UIComponents.addLogEntry(`🚔 ${casualties.imprisoned} citizens arrested`, 'ai');
                }
            }
        } else {
            console.log(`No casualties this time - probability was ${getRiskProbability(riskLevel)}`);
        }

        // ====================================================================
        // STEP 15: RECRUITMENT SYSTEM (THREE-PHASE SCALING)
        // ====================================================================
        // PURPOSE: Actions that organize/inspire recruit new resistance members
        // PHASES: Individual Network → Local Movement → City-Wide Resistance

        // Action categories that trigger recruitment
        const culturalActions = ['streetArt', 'garden', 'festival'];       // CONSTANT: Inspire through culture
        const organizingActions = ['meeting', 'recruit', 'intel'];         // CONSTANT: Direct organizing
        const mobilizingActions = ['protest'];                             // CONSTANT: High-visibility mobilization

        // Check if this action type triggers recruitment
        if (organizingActions.includes(actionType) || culturalActions.includes(actionType) || mobilizingActions.includes(actionType)) {
            // Get current resistance size
            const currentCitizens = gameState.activeCitizens;      // INPUT: From game-core.js
            const totalPopulation = gameState.totalPopulation;      // INPUT: From game-core.js

            // ================================================================
            // HONG KONG-STYLE EXPONENTIAL GROWTH MODEL
            // ================================================================
            // Based on real-world protest diffusion: 0.5% → 25% in 2 months (HK 2019)
            // FORMULA: Combines network effects, critical mass, safety, and morale

            const currentPercentage = currentCitizens / totalPopulation;
            const maxRealistic = 0.25;  // 25% of population (massive movement)

            // Base recruitment (randomized)
            const baseRecruit = Math.floor(Math.random() * 101) + 100;  // 100-200

            // Network effect: More people = exponential word-of-mouth spread
            const networkEffect = Math.pow(currentCitizens, 0.85);

            // Saturation: Growth slows as approaching maximum capacity
            const saturation = 1 - (currentPercentage / maxRealistic);

            // Critical mass bonus: 5x boost after crossing 0.1% threshold
            const criticalMassBonus = currentPercentage > 0.001 ? 5 : 1;

            // Safety bonus: Repression reduces recruitment
            // Heat <40 = safe (1.5x), 40-70 = medium (1x), >70 = dangerous (0.5x)
            const heatLevel = gameState.heatLevel;
            const safetyBonus = heatLevel < 40 ? 1.5 : (heatLevel < 70 ? 1 : 0.5);

            // Morale multiplier: Higher community power = more attractive movement
            const communityPower = gameState.communityPower;
            const moraleMultiplier = 1 + (communityPower / 50);

            // Action type multipliers (different tactics have different recruitment power)
            let actionMultiplier = 1;
            if (mobilizingActions.includes(actionType)) {
                actionMultiplier = 1.5;  // Protests/demonstrations most visible
            } else if (organizingActions.includes(actionType)) {
                actionMultiplier = 1.2;  // Direct organizing slightly better
            } else {
                actionMultiplier = 0.8;  // Cultural actions slower but safer
            }

            // Final calculation
            let citizenGain = Math.floor(
                baseRecruit +
                (networkEffect * saturation * criticalMassBonus * safetyBonus * moraleMultiplier * actionMultiplier)
            );

            // Minimum gain (always recruit at least some people)
            citizenGain = Math.max(50, citizenGain);

            // Maximum gain (cap to prevent overflow, max 5% of remaining population per action)
            const remainingPopulation = totalPopulation - currentCitizens;
            const maxGainPerAction = Math.floor(remainingPopulation * 0.05);
            citizenGain = Math.min(citizenGain, maxGainPerAction);

            // Phase name for logging (based on percentage)
            let phaseName = '';
            if (currentPercentage < 0.0001) {
                phaseName = 'Early Adopters';
            } else if (currentPercentage < 0.01) {
                phaseName = 'Critical Mass';
            } else if (currentPercentage < 0.05) {
                phaseName = 'Mainstream Movement';
            } else {
                phaseName = 'Mass Mobilization';
            }

            // ================================================================
            // APPLY RECRUITMENT
            // ================================================================
            if (citizenGain > 0) {
                // Update active citizens count
                // CALLS: game-core.js updateActiveCitizens()
                // OUTPUT: Increases gameState.activeCitizens
                window.GameCore.updateActiveCitizens(citizenGain);

                // Calculate new total and percentage
                const newTotal = currentCitizens + citizenGain;
                const populationPercentage = (newTotal / totalPopulation * 100).toFixed(3);

                // Log recruitment message
                if (window.UIComponents) {
                    // Different messages for different action types
                    if (mobilizingActions.includes(actionType)) {
                        // OUTPUT: Protest recruitment message
                        window.UIComponents.addLogEntry(`✊ ${phaseName}: Protest mobilized ${citizenGain.toLocaleString()} new resistance members (${populationPercentage}% of city)`, 'player');
                    } else if (organizingActions.includes(actionType)) {
                        // OUTPUT: Organizing recruitment message
                        window.UIComponents.addLogEntry(`📢 ${phaseName}: Recruited ${citizenGain.toLocaleString()} new resistance members (${populationPercentage}% of city)`, 'player');
                    } else {
                        // OUTPUT: Cultural inspiration message
                        window.UIComponents.addLogEntry(`🎭 ${phaseName}: Inspired ${citizenGain.toLocaleString()} citizens to join (${populationPercentage}% of city)`, 'player');
                    }
                }
            }
        }

        // ====================================================================
        // STEP 16: UPDATE NEIGHBORHOOD STATE
        // ====================================================================
        // Apply resistance increase to the target neighborhood
        // CALLS: neighborhoods.js updateNeighborhoodState()
        // INPUT: neighborhood.id, powerGain
        // OUTPUT: Increases neighborhood.resistance
        if (window.Neighborhoods) {
            window.Neighborhoods.updateNeighborhoodState(neighborhood.id, powerGain);
        }

        // ====================================================================
        // STEP 17: LOG ACTION TO UI
        // ====================================================================
        if (window.UIComponents) {
            // Get action cost for logging
            // CALLS: currency.js getActionCost()
            const cost = window.Currency ? window.Currency.getActionCost(actionType) : 0;

            // OUTPUT: Action description log
            window.UIComponents.addLogEntry(`${action.description} in ${neighborhood.name}`, 'player');

            // OUTPUT: Cost and effects log
            window.UIComponents.addLogEntry(`-${cost.toLocaleString()} SimCoin, +${powerGain} power, +${heatGain} heat`, 'player');

            // OUTPUT: Risk warning for dangerous operations
            if (riskLevel !== 'low') {
                window.UIComponents.addLogEntry(`⚠️ ${riskLevel.toUpperCase()} risk operation - surveillance heavy`, 'player');
            }

            // OUTPUT: Cooldown notification
            const cooldownSeconds = Math.round(cooldownDuration / 1000);
            if (cooldownSeconds > 2) {
                window.UIComponents.addLogEntry(`🕐 ${actionType} cooldown in ${neighborhood.name}: ${cooldownSeconds}s`, 'system');
            }
        }

        // ====================================================================
        // STEP 18: UPDATE UI DISPLAY
        // ====================================================================
        // Refresh all UI elements with new game state
        // CALLS: ui-components.js updateAll()
        // OUTPUT: Updates all status bar values, metrics
        if (window.UIComponents) {
            window.UIComponents.updateAll();
        }

        // Re-render neighborhoods with new resistance values
        // CALLS: neighborhoods.js renderAll()
        // OUTPUT: Updates neighborhood visual display
        if (window.Neighborhoods) {
            window.Neighborhoods.renderAll();
        }

        // Update action button states immediately
        // CALLS: updateActionButtonStates() (below)
        // OUTPUT: Updates button availability and cooldown displays
        updateActionButtonStates();

        // ====================================================================
        // STEP 19: TRIGGER AI MAYOR RESPONSE (DELAYED)
        // ====================================================================
        // AI Mayor maybe notices action (based on heat level and action type)
        // PURPOSE: Give time for UI updates before AI response
        setTimeout(async () => {
            if (window.AIMayor) {
                // CALLS: ai-mayor.js maybeRespondToAction()
                // INPUT: action.description, neighborhood.name, actionType
                // OUTPUT: AI Mayor text response (via LLM or fallback) OR null if unnoticed
                const aiResponse = await window.AIMayor.maybeRespondToAction(
                    action.description,
                    neighborhood.name,
                    actionType
                );

                if (aiResponse) {
                    // AI Mayor noticed the action - apply heat now
                    // CALLS: game-core.js updateHeatLevel()
                    // OUTPUT: Modifies gameState.heatLevel (+heatGain)
                    // CRITICAL: Heat only increases if action was noticed
                    window.GameCore.updateHeatLevel(heatGain);

                    if (window.UIComponents) {
                        // OUTPUT: Explicit notice warning
                        window.UIComponents.addLogEntry(`⚠️ AI Mayor detected action (+${heatGain} heat)`, 'system');

                        // OUTPUT: Log AI Mayor response
                        window.UIComponents.addLogEntry(aiResponse, 'ai');

                        // OUTPUT: Update AI interface metrics
                        window.UIComponents.updateAIInterface(aiResponse);
                    }
                } else {
                    // Action went unnoticed - no heat increase (true stealth)
                    if (window.UIComponents) {
                        window.UIComponents.addLogEntry('🤫 Action went unnoticed by AI Mayor', 'system');
                    }
                }
            }
        }, 1000);  // CONSTANT: 1000ms delay

        // ====================================================================
        // STEP 20: TRIGGER CITIZENS RESPONSE (DELAYED, PROBABILISTIC)
        // ====================================================================
        // 25% chance of citizens responding after 2.5 second delay
        // PURPOSE: Not every action gets community response
        if (Math.random() < 0.25) {  // CONSTANT: 25% probability
            setTimeout(async () => {
                if (window.AICitizens) {
                    // CALLS: ai-citizens.js getResponse()
                    // INPUT: action.description, neighborhood.name
                    // OUTPUT: Citizens text response (via LLM or fallback)
                    const citizenResponse = await window.AICitizens.getResponse(action.description, neighborhood.name);

                    if (window.UIComponents) {
                        // OUTPUT: Log citizens response
                        window.UIComponents.addLogEntry(citizenResponse, 'citizen');
                    }
                }
            }, 2500);  // CONSTANT: 2500ms delay
        }

        // ====================================================================
        // STEP 21: CHECK VICTORY CONDITIONS
        // ====================================================================
        // After all effects applied, check if game should end
        // CALLS: game-core.js checkVictoryConditions()
        // OUTPUT: May trigger game over if victory/defeat conditions met
        window.GameCore.checkVictoryConditions();
    }

    // ============================================================================
    // CAN PERFORM ACTION - AVAILABILITY CHECKER
    // ============================================================================
    // INPUT: actionType (string)
    // OUTPUT: Boolean (true if action can be performed)
    // CALLED BY: updateActionButtonStates() to enable/disable buttons
    // PURPOSE: Central validation for all action requirements
    function canPerformAction(actionType) {
        // Get current game state
        const gameState = window.GameCore.getState();  // INPUT: From game-core.js

        // CHECK 1: Must have neighborhood selected
        if (!gameState.selectedNeighborhood) return false;

        // CHECK 2: Game must be active
        if (!gameState.isActive) return false;

        // CHECK 3: Per-action cooldown
        // CALLS: game-core.js isActionOnCooldown()
        const cooldownKey = `${actionType}_${gameState.selectedNeighborhood}`;
        if (window.GameCore.isActionOnCooldown(cooldownKey)) return false;

        // CHECK 4: Global cooldown (heat system)
        // CALLS: game-core.js isGlobalActionOnCooldown()
        if (window.GameCore.isGlobalActionOnCooldown()) return false;

        // CHECK 5: Affordability
        // CALLS: currency.js canAffordAction()
        if (window.Currency && !window.Currency.canAffordAction(actionType)) return false;

        // ====================================================================
        // SPECIAL ACTION REQUIREMENTS
        // ====================================================================
        switch (actionType) {
            case 'blockDemo':
                // REQUIREMENT: Can only block demolition if neighborhood is threatened
                // CALLS: neighborhoods.js getSelectedNeighborhood()
                // INPUT: neighborhood.threatened status
                const neighborhood = window.Neighborhoods ?
                    window.Neighborhoods.getSelectedNeighborhood() : null;
                return neighborhood && neighborhood.threatened;

            case 'pirateBroad':
                // REQUIREMENT: Requires high coordination (20+ community power)
                // INPUT: gameState.communityPower
                return gameState.communityPower >= 20;  // CONSTANT: Minimum 20 power

            default:
                // All other actions: no special requirements
                return true;
        }
    }

    // ============================================================================
    // GET ACTION EFFECTIVENESS - CONTEXTUAL BONUS CALCULATOR
    // ============================================================================
    // INPUT: actionType (string), neighborhoodId (string)
    // OUTPUT: effectiveness multiplier (float, typically 1.0 - 1.5)
    // CALLED BY: Not currently used in performAction, but available for future use
    // PURPOSE: Calculate situational bonuses for actions
    function getActionEffectiveness(actionType, neighborhoodId) {
        // Get game state
        const gameState = window.GameCore.getState();  // INPUT: From game-core.js

        // Find target neighborhood
        const neighborhood = gameState.neighborhoods.find(n => n.id === neighborhoodId);

        if (!neighborhood) return 1.0;  // DEFAULT: No bonus

        let effectiveness = 1.0;  // BASE: 100% effectiveness

        // BONUS 1: High resistance neighborhoods (easier to organize)
        // CONSTANT: +10% bonus if resistance > 40
        if (neighborhood.resistance > 40) {
            effectiveness *= 1.1;
        }

        // BONUS 2: Threatened neighborhoods (urgency bonus)
        // CONSTANT: +20% bonus if threatened and timer < 30 minutes
        if (neighborhood.threatened && neighborhood.gentrificationTimer < 30) {
            effectiveness *= 1.2;
        }

        // BONUS 3: High heat (risky but impactful)
        // CONSTANT: +15% bonus if heat > 70
        if (gameState.heatLevel > 70) {
            effectiveness *= 1.15;
        }

        // OUTPUT: Total effectiveness multiplier
        return effectiveness;
    }

    // ============================================================================
    // BUTTON TEXT STORAGE
    // ============================================================================
    // PURPOSE: Store original button texts before cooldown countdowns overwrite them
    // STRUCTURE: { actionType: originalText }
    // READ BY: updateActionButtonStates() to restore text after cooldown
    const originalButtonTexts = {};

    // ============================================================================
    // INITIALIZE BUTTON TEXTS
    // ============================================================================
    // INPUT: None (reads DOM)
    // OUTPUT: Populates originalButtonTexts object
    // CALLED BY: init() with 100ms delay, updateActionButtonStates() as safety check
    // PURPOSE: Capture original button labels before any modifications
    function initializeButtonTexts() {
        document.querySelectorAll('.action-btn').forEach(button => {
            const actionType = button.dataset.action;
            if (actionType) {
                const actionNameEl = button.querySelector('.action-name');
                if (actionNameEl && !originalButtonTexts[actionType]) {
                    // STORE: Original text for this action type
                    originalButtonTexts[actionType] = actionNameEl.textContent;
                }
            }
        });
    }

    // ============================================================================
    // UPDATE ACTION BUTTON STATES - UI SYNC FUNCTION
    // ============================================================================
    // INPUT: None (reads gameState and cooldowns)
    // OUTPUT: Updates all action button DOM elements
    // CALLED BY: 
    //   - setInterval every 1000ms (continuous updates for cooldown countdown)
    //   - performAction() after action completes
    //   - clearActionCooldown() setTimeout callback
    // PURPOSE: Keep button UI in sync with game state
    function updateActionButtonStates() {
        // Safety: Initialize texts if not done yet
        if (Object.keys(originalButtonTexts).length === 0) {
            initializeButtonTexts();
        }

        // Process each action button
        document.querySelectorAll('.action-btn').forEach(button => {
            const actionType = button.dataset.action;
            if (actionType) {
                // Get current state
                const gameState = window.GameCore.getState();  // INPUT: From game-core.js

                // Check cooldown status
                const cooldownKey = `${actionType}_${gameState.selectedNeighborhood}`;
                const isOnCooldown = window.GameCore.isActionOnCooldown(cooldownKey);
                const isGlobalCooldown = window.GameCore.isGlobalActionOnCooldown();

                // Check overall availability
                const canPerform = canPerformAction(actionType);

                // Get DOM elements
                const actionNameEl = button.querySelector('.action-name');
                const actionStatsEl = button.querySelector('.action-stats');

                // Set disabled state
                button.disabled = !canPerform;

                // Always reset to original text first
                if (actionNameEl && originalButtonTexts[actionType]) {
                    actionNameEl.textContent = originalButtonTexts[actionType];
                }

                // Update action stats to show cost and power range
                if (actionStatsEl && window.Currency) {
                    const cost = window.Currency.getActionCost(actionType);
                    const action = actionDefinitions[actionType];
                    if (action) {
                        // OUTPUT: Display cost and power range
                        actionStatsEl.textContent = `${cost.toLocaleString()} SimCoin, +${action.power[0]}-${action.power[1]} Power`;
                    }
                }

                // ============================================================
                // DISPLAY STATE 1: GLOBAL COOLDOWN (HIGHEST PRIORITY)
                // ============================================================
                if (isGlobalCooldown) {
                    // Global cooldown affects all actions
                    button.classList.add('loading');
                    button.style.opacity = '0.3';
                    button.style.background = '#e74c3c';  // CONSTANT: Red for global cooldown

                    // Show countdown
                    const globalRemaining = window.GameCore.getGlobalActionCooldownRemaining();
                    if (globalRemaining > 0 && actionNameEl) {
                        const seconds = Math.ceil(globalRemaining / 1000);
                        // OUTPUT: Override button text with countdown
                        actionNameEl.textContent = `⚠️ Heat Cooldown (${seconds}s)`;
                    }
                }

                // ============================================================
                // DISPLAY STATE 2: PER-ACTION COOLDOWN
                // ============================================================
                else if (isOnCooldown && gameState.selectedNeighborhood) {
                    button.classList.add('loading');
                    button.style.opacity = '0.5';
                    button.style.background = '';  // Reset to default

                    // Show cooldown timer
                    const remainingTime = window.GameCore.getActionCooldownRemaining(cooldownKey);
                    if (remainingTime > 0 && actionNameEl) {
                        const seconds = Math.ceil(remainingTime / 1000);
                        // OUTPUT: Show original text with countdown
                        actionNameEl.textContent = `${originalButtonTexts[actionType]} (${seconds}s)`;
                    }
                }

                // ============================================================
                // DISPLAY STATE 3: AVAILABLE OR UNAVAILABLE
                // ============================================================
                else {
                    button.classList.remove('loading');
                    button.style.opacity = canPerform ? '1' : '0.6';  // Dim if unavailable
                    button.style.background = '';  // Reset to default
                }
            }
        });
    }

    // ============================================================================
    // START CONTINUOUS BUTTON STATE UPDATES
    // ============================================================================
    // TRIGGERS: updateActionButtonStates() every 1000ms
    // PURPOSE: Keep cooldown countdown display updated in real-time
    setInterval(updateActionButtonStates, 1000);  // CONSTANT: 1000ms interval

    // ============================================================================
    // GET ACTION DEFINITION - PUBLIC ACCESSOR
    // ============================================================================
    // INPUT: actionType (string)
    // OUTPUT: Action definition object or undefined
    // CALLED BY: External modules that need action data
    function getActionDefinition(actionType) {
        return actionDefinitions[actionType];
    }

    // ============================================================================
    // PUBLIC API - EXPORTED FUNCTIONS
    // ============================================================================
    return {
        // ====================================================================
        // INITIALIZATION
        // ====================================================================
        // CALLED BY: optimicity.html (line 316)
        init: function () {
            console.log('Actions initialized');
            // Initialize button texts with small delay to ensure DOM ready
            setTimeout(initializeButtonTexts, 100);  // CONSTANT: 100ms delay
        },

        // ====================================================================
        // CORE FUNCTIONS
        // ====================================================================
        performAction: performAction,                    // EXPOSED: For action button clicks
        canPerformAction: canPerformAction,              // EXPOSED: For button state checks
        getActionEffectiveness: getActionEffectiveness,  // EXPOSED: For future effectiveness bonuses
        updateActionButtonStates: updateActionButtonStates,  // EXPOSED: For manual UI updates
        getActionDefinition: getActionDefinition         // EXPOSED: For reading action data
    };
})();

// ============================================================================
// DATA FLOW SUMMARY
// ============================================================================
//
// PRIMARY INPUTS TO ACTIONS MODULE:
// - User interaction: Button clicks → performAction()
// - game-core.js: gameState via getState()
// - currency.js: Cost checks via canAffordAction(), purchaseAction()
// - neighborhoods.js: Selected neighborhood info
//
// PRIMARY OUTPUTS FROM ACTIONS MODULE:
// - game-core.js: Updates via updateCommunityPower(), updateHeatLevel(), etc.
// - neighborhoods.js: Resistance updates via updateNeighborhoodState()
// - ui-components.js: Logs via addLogEntry(), updates via updateAll()
// - ai-mayor.js: Response trigger via getResponse() after 1s delay
// - ai-citizens.js: Response trigger via getResponse() after 2.5s (25% chance)
//
// TEMPORAL SEQUENCE:
// 1. User clicks button → performAction() executes
// 2. Validations (cooldowns, affordability, selection)
// 3. Purchase action (deduct SimCoin)
// 4. Calculate effects (power, heat, cooldown)
// 5. Apply core effects (power, heat to game-core)
// 6. Spam penalty check
// 7. Casualty system (risk-based)
// 8. Recruitment system (phase-based)
// 9. Neighborhood resistance update
// 10. UI logs and updates
// 11. [+1s] AI Mayor response
// 12. [+2.5s] Citizens response (25% chance)
// 13. Victory conditions check
//
// COOLDOWN SYSTEM:
// - Global cooldown: 3s between ANY actions (anti-spam)
// - Per-action cooldown: Dynamic 0.5s-3min based on heat/power gains
// - Button state updates: Every 1s via setInterval
//
// ============================================================================
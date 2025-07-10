// OptimiCity - Currency Module
// Handles: SimCoin mining, NFT generation, crowdfunding

window.Currency = (function () {
    'use strict';

    let miningInterval = null;

    // Action costs in SimCoin - Significance-based scaling
    const actionCosts = {
        // LOW SIGNIFICANCE - Grassroots Building (50-200 SimCoin)
        meeting: 75,        // Safe organizing, builds citizens
        intel: 100,         // Information gathering, low risk
        garden: 50,         // Community building, very safe
        streetArt: 125,     // Cultural expression, some visibility
        
        // MEDIUM SIGNIFICANCE - Organized Resistance (400-800 SimCoin)
        recruit: 500,       // Coordinated recruitment drives
        festival: 600,      // Large community events
        meshNet: 700,       // Technical infrastructure
        hackCams: 750,      // Technical sabotage
        
        // HIGH SIGNIFICANCE - Direct Confrontation (1,500-4,000 SimCoin)
        protest: 2000,      // Public confrontation
        occupy: 3500,       // Building occupation 
        blockDemo: 4000,    // Stopping demolition
        pirateBroad: 3000   // Communications hijacking
    };

    // Start mining SimCoin
    function startMining() {
        if (miningInterval) return; // Already mining
        
        miningInterval = setInterval(() => {
            if (!window.GameCore.getState().isActive) return;
            
            const gameState = window.GameCore.getState();
            
            // Mining requires Phase 2: Local Movement (0.01% of population)
            const miningThreshold = Math.floor(gameState.totalPopulation * 0.0001); // 0.01% of population
            if (gameState.activeCitizens < miningThreshold) {
                if (window.UIComponents && Math.random() < 0.1) { // Only log occasionally
                    window.UIComponents.addLogEntry(`⛏️ Mining inactive: Need ${miningThreshold.toLocaleString()}+ citizens for Local Movement phase (have ${gameState.activeCitizens.toLocaleString()})`, 'system');
                }
                return;
            }
            
            // Exponential scaling based on active citizens (adjusted for larger numbers)
            // Formula: (citizens^1.5 / 1000) + random factor for city-scale resistance
            const citizenPower = Math.pow(gameState.activeCitizens, 1.5) / 1000;
            const randomFactor = Math.floor(Math.random() * 101) + 50; // 50-150
            
            // Infrastructure multiplier (not additive, multiplicative)
            const infrastructureMultiplier = 1 + (gameState.infrastructureBonus * 0.3);
            
            // Heat penalty: reduce by percentage
            const heatPenalty = 1 - (gameState.heatLevel / 200); // Max 50% reduction
            
            // Calculate final mining rate with exponential scaling
            const baseRate = citizenPower + randomFactor;
            const miningRate = Math.max(10, baseRate * infrastructureMultiplier * Math.max(0.1, heatPenalty));
            const cappedRate = Math.min(5000, Math.floor(miningRate)); // Max 5000 per cycle
            
            // Add coins
            window.GameCore.updateSimCoin(cappedRate);
            
            // Mining generates heat (surveillance detection)
            window.GameCore.updateHeatLevel(1);
            
            // Log mining activity (less frequently)
            if (window.UIComponents && Math.random() < 0.3) {
                window.UIComponents.addLogEntry(`⛏️ Mining: +${cappedRate.toLocaleString()} SimCoin (${gameState.activeCitizens} citizens)`, 'system');
            }
            
            // Update UI
            if (window.UIComponents) {
                window.UIComponents.updateAll();
            }
        }, 15000); // Every 15 seconds (increased from 10)
    }

    // Stop mining
    function stopMining() {
        if (miningInterval) {
            clearInterval(miningInterval);
            miningInterval = null;
        }
    }

    // Generate NFT Art Collection
    function generateNFT() {
        if (window.GameCore.isCurrencyEarningOnCooldown('nft')) {
            if (window.UIComponents) {
                const remaining = Math.ceil(window.GameCore.getCurrencyEarningCooldownRemaining('nft') / 1000);
                window.UIComponents.addLogEntry(`NFT generation on cooldown: ${remaining}s remaining`, 'system');
            }
            return;
        }

        const gameState = window.GameCore.getState();
        let cost, reward;
        
        // Determine tier based on community power
        if (gameState.communityPower <= 25) {
            // Tier 1
            cost = 1000;
            reward = Math.floor(Math.random() * 2001) + 2000; // 2000-4000
        } else if (gameState.communityPower <= 50) {
            // Tier 2
            cost = 2500;
            reward = Math.floor(Math.random() * 4001) + 6000; // 6000-10000
        } else {
            // Tier 3
            cost = 5000;
            reward = Math.floor(Math.random() * 10001) + 15000; // 15000-25000
        }

        // Check if player can afford
        if (!window.GameCore.canAfford(cost)) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`Insufficient SimCoin for NFT generation. Need ${cost.toLocaleString()}`, 'system');
            }
            return;
        }

        // Deduct cost
        window.GameCore.updateSimCoin(-cost);
        
        // Add reward
        window.GameCore.updateSimCoin(reward);
        
        // Generate heat
        window.GameCore.updateHeatLevel(8);
        
        // Set cooldown (45 seconds)
        window.GameCore.setCurrencyEarningCooldown('nft', 45000);
        
        // Log activity
        if (window.UIComponents) {
            window.UIComponents.addLogEntry(`🎨 NFT Collection generated: -${cost.toLocaleString()}, +${reward.toLocaleString()} SimCoin`, 'player');
        }
        
        // Update UI
        if (window.UIComponents) {
            window.UIComponents.updateAll();
        }
    }

    // Crowdfunding campaign
    function startCrowdfunding() {
        const gameState = window.GameCore.getState();
        
        // Crowdfunding requires Phase 2: Local Movement (0.01% of population)  
        const crowdfundingThreshold = Math.floor(gameState.totalPopulation * 0.0001); // 0.01% of population
        if (gameState.activeCitizens < crowdfundingThreshold) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`Crowdfunding requires ${crowdfundingThreshold.toLocaleString()}+ active citizens for Local Movement phase (have ${gameState.activeCitizens.toLocaleString()})`, 'system');
            }
            return;
        }
        
        if (window.GameCore.isCurrencyEarningOnCooldown('crowdfunding')) {
            if (window.UIComponents) {
                const remaining = Math.ceil(window.GameCore.getCurrencyEarningCooldownRemaining('crowdfunding') / 1000);
                window.UIComponents.addLogEntry(`Crowdfunding on cooldown: ${remaining}s remaining`, 'system');
            }
            return;
        }

        const cost = 500;
        
        // Check if player can afford
        if (!window.GameCore.canAfford(cost)) {
            if (window.UIComponents) {
                window.UIComponents.addLogEntry(`Insufficient SimCoin for crowdfunding. Need ${cost.toLocaleString()}`, 'system');
            }
            return;
        }

        // Calculate reward: (Active Citizens × 10) + (Community Power × 100)
        const citizenContribution = gameState.activeCitizens * 10;
        const powerBonus = gameState.communityPower * 100;
        const baseReward = citizenContribution + powerBonus;
        
        // Minimum 2000, maximum 30000
        const reward = Math.max(2000, Math.min(30000, baseReward));
        
        // Deduct cost
        window.GameCore.updateSimCoin(-cost);
        
        // Add reward
        window.GameCore.updateSimCoin(reward);
        
        // Generate small amount of heat
        window.GameCore.updateHeatLevel(3);
        
        // Set cooldown (60 seconds)
        window.GameCore.setCurrencyEarningCooldown('crowdfunding', 60000);
        
        // Log activity
        if (window.UIComponents) {
            window.UIComponents.addLogEntry(`💰 Crowdfunding successful: -${cost.toLocaleString()}, +${reward.toLocaleString()} SimCoin`, 'player');
        }
        
        // Update UI
        if (window.UIComponents) {
            window.UIComponents.updateAll();
        }
    }

    // Get action cost
    function getActionCost(actionType) {
        const baseCost = actionCosts[actionType] || 1000;
        const gameState = window.GameCore.getState();
        
        // Cost multiplier based on heat level (1.0x to 1.5x)
        const heatMultiplier = 1 + (gameState.heatLevel / 200);
        
        // Emergency discount: 50% off for threatened neighborhoods
        const neighborhood = gameState.neighborhoods.find(n => n.id === gameState.selectedNeighborhood);
        const emergencyDiscount = (neighborhood && neighborhood.threatened) ? 0.5 : 1.0;
        
        // Bulk discount: 10% off when community power > 50
        const bulkDiscount = (gameState.communityPower > 50) ? 0.9 : 1.0;
        
        const finalCost = Math.floor(baseCost * heatMultiplier * emergencyDiscount * bulkDiscount);
        return Math.max(100, finalCost); // Minimum cost of 100
    }

    // Check if action is affordable
    function canAffordAction(actionType) {
        const cost = getActionCost(actionType);
        return window.GameCore.canAfford(cost);
    }

    // Purchase action (deduct cost)
    function purchaseAction(actionType) {
        const cost = getActionCost(actionType);
        if (window.GameCore.canAfford(cost)) {
            window.GameCore.updateSimCoin(-cost);
            window.GameCore.incrementActionsCompleted();
            
            // Infrastructure actions boost mining
            const infrastructureActions = ['meshNet', 'hackCams', 'pirateBroad'];
            if (infrastructureActions.includes(actionType)) {
                window.GameCore.updateInfrastructureBonus(1);
            }
            
            return true;
        }
        return false;
    }

    // Public API
    return {
        init: function () {
            console.log('Currency system initialized');
            // Start mining automatically when game starts
            startMining();
        },

        startMining: startMining,
        stopMining: stopMining,
        generateNFT: generateNFT,
        startCrowdfunding: startCrowdfunding,
        getActionCost: getActionCost,
        canAffordAction: canAffordAction,
        purchaseAction: purchaseAction,
        
        // Get cooldown info for UI
        getNFTCooldownRemaining: function() {
            return window.GameCore.getCurrencyEarningCooldownRemaining('nft');
        },
        
        getCrowdfundingCooldownRemaining: function() {
            return window.GameCore.getCurrencyEarningCooldownRemaining('crowdfunding');
        },
        
        isNFTOnCooldown: function() {
            return window.GameCore.isCurrencyEarningOnCooldown('nft');
        },
        
        isCrowdfundingOnCooldown: function() {
            return window.GameCore.isCurrencyEarningOnCooldown('crowdfunding');
        }
    };
})();
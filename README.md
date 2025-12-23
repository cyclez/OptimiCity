# 🏴 OptimiCity b0.2

> Fight algorithmic authoritarianism. Organize your community. Liberate your city.

A radical inversion of SimCity where you're not the mayor—you're the resistance.

---

## 📋 Changelog b0.2 (2025-12-23)

**Major Gameplay Improvements:**
- **Hong Kong Recruitment Model**: Exponential citizen growth (network effect formula)
- **True Stealth System**: Heat only increases if AI Mayor notices action (10-90% based on heat level)
- **Heat Decay**: -1 heat per 30s of inactivity (strategic waiting viable)
- **Autonomous AI Commentary**: Timer-based LLM responses (replaced constant spam)
- **Randomized Neighborhoods**: All 4 start threatened with random resistance (5-15) and timers (8-13 min)

**Balance Fixes:**
- Stealth actions: ×0.7 notice probability, capped at 50% (recovery possible at high heat)
- Casualty system: Uses projected heat for consistency
- Gentrification defeat: Game ends if all neighborhoods gentrified
- Removed spam penalty (redundant with cooldowns)
- Removed neighborhood population field (only citywide population remains)

---

## 🚀 Quick Start

### 1. Install Ollama (AI Engine)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the AI model
ollama pull llama3.2

# Start Ollama with web access
OLLAMA_ORIGINS="*" ollama serve
```

### 2. Play

Open `optimicity.html` in your browser. Select a neighborhood. Start resisting.

**Keyboard Shortcuts:**
- `1-4`: Select neighborhoods
- `Esc`: Debug panel

---

## 🎮 What is OptimiCity?

You are a citizen in a city controlled by an **AI Mayor** that treats neighborhoods as data points to be "optimized" through gentrification and surveillance. Your mission: organize with other citizens, build community power, and overthrow the algorithm before your neighborhoods are erased.

**The AI Mayor doesn't know everything.** Stay under the radar at low heat levels. Build your movement in the shadows. Strike when you're ready.

---

## 🎯 How to Play

### Build Power
Take actions to increase **Community Power** (target: 80) across 4 categories:
- **Direct Action**: Occupy buildings, block demolitions, organize protests
- **Cultural Resistance**: Street art, community gardens, block festivals  
- **Infrastructure Hacking**: Disable cameras, build mesh networks, pirate broadcasts
- **Organizing**: Secret meetings, recruit allies, gather intelligence

### Manage Heat
Every action risks detection by the AI Mayor's surveillance systems. Higher heat = higher chance of being noticed. **Unnoticed actions don't increase heat.**

Strategic patience wins: wait 30 seconds between actions and heat slowly decreases.

### Save Neighborhoods
Each neighborhood has a **gentrification countdown timer**. Raise its resistance to 60% before time runs out to liberate it permanently.

---

## ✊ Victory & Defeat

**WIN:**
- Reach 80 Community Power, OR
- Liberate all 4 neighborhoods (60% resistance each)

**LOSE:**
- Heat reaches 95% (surveillance state), OR  
- All neighborhoods gentrified (timers expire)
- 30-minute time limit

---

## 🎨 Game Features

- **12 Resistance Actions** with dynamic costs (50-4000 SimCoin)
- **Stealth System**: Low heat = low detection chance (10-90% based on heat level)
- **Exponential Recruitment**: Small groups grow into mass movements (Hong Kong 2019 model)
- **AI Mayor**: Responds via local Ollama AI (llama3.2) with escalating tactics
- **AI Citizens**: Autonomous solidarity actions and mutual aid coordination
- **SimCoin Economy**: Alternative currency through mining, NFTs, crowdfunding
- **4 Unique Neighborhoods**: Each with randomized starting conditions
- **Real-time 30-minute Countdown**: Every second matters

---

## 🗂️ Project Structure

```
optimicity.html              # Main game
modules/
├── game-core.js            # Game state, timers
├── actions.js              # 12 resistance actions
├── neighborhoods.js        # 4 neighborhoods
├── ai-mayor.js             # AI Mayor responses
├── ai-citizens.js          # Community solidarity
├── currency.js             # SimCoin economy
├── ui-components.js        # Interface
└── styles.css              # Visual design
```

---

## 🛠️ Technical Notes

**No dependencies.** Pure HTML/CSS/JavaScript.

**Requires Ollama** running locally for AI Mayor and Citizens responses. Without it, the game uses pre-written fallback responses.

**Browser-based.** No server, no backend (yet). All game logic runs client-side.

---

## 💡 Philosophy

OptimiCity critiques "smart city" techno-solutionism. It argues that:
- True democracy requires active resistance to systems that treat people as data points
- Community organizing—not efficient algorithms—creates livable cities
- Grassroots movements can overcome algorithmic authoritarianism

The aesthetic contrasts sterile corporate interfaces with vibrant street art and community life.

---

## 🤝 Contributing

Inspired by real-world organizing. Contributions welcome for:
- New action types and mechanics
- UI/UX improvements
- Translation/localization
- Community organizing insights

---

## 📜 License

Built with grassroots principles in mind.

**Technology**: Vanilla JavaScript, Ollama AI  
**Testing**: Local llama3.2 model

---

*"The resistance continues! Organize, resist, liberate!"* 🏴

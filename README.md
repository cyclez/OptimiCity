# 🏴 OptimiCity - Fight the Algorithm

> A radical inversion of SimCity where you play as a grassroots insurgent fighting algorithmic authoritarianism

## 🎮 Game Overview

OptimiCity transforms players from omnipotent mayors into grassroots insurgents fighting against an AI Mayor that treats the city as a corporate efficiency problem. The AI continuously implements gentrification projects, surveillance infrastructure, and demolitions based on cold algorithmic logic that maximizes profit while erasing communities.

### Core Concept

You are a citizen in a city marked for "optimization" by an AI Mayor. Your mission: organize with other citizens, build community power, and overthrow the algorithmic dictatorship through grassroots resistance, cultural action, and infrastructure hacking.

## 🚀 Current Features

### ✅ Complete Systems

**Modular Architecture** (7 JS modules + HTML + CSS)
- Clean separation of concerns
- Easy to maintain and extend
- Robust error handling

**Dynamic Action System**
- 12 resistance actions across 4 categories with significance-based costs
- Per-neighborhood cooldown system with visual timers
- Risk-based consequences (low/medium/high/extreme)
- Dynamic casualties scaled by resistance size (not population)
- Population-aware recruitment with phase-based progression

**AI Mayor Escalation**
- 5 threat levels: negligible → minor → moderate → significant → critical
- Gradual escalation based on heat level
- Autonomous raids with population-scaled arrests/kills
- Real-time responses via local Ollama llama3.2 model

**Game State Management**
- 30-minute real-time timer with precise countdown
- 7 status indicators: SimCoin, Community Power, Heat Level, Active Citizens, Population, Imprisoned, Killed
- Victory/defeat conditions with multiple win paths
- Dynamic neighborhood positioning system

**Neighborhood System**
- 4 unique neighborhoods with background images
- Gentrification countdown timers (minutes-based)
- Liberation system (60% resistance removes threat)
- Visual selection feedback with pulsing glow effects

**AI Citizens Integration**
- Community solidarity responses
- Mutual aid coordination
- Autonomous organizing actions
- Cross-neighborhood inspiration effects

**Rich UI/UX**
- Game log with proper scrollbar and text wrapping
- Loading animations and cooldown displays
- Color-coded status indicators
- Responsive design with accessibility features

## 🎯 Victory Conditions

- **Community Power Victory**: Reach 80 community power
- **Liberation Victory**: Liberate all neighborhoods (60% resistance each)
- **Defeat**: Heat level reaches 95% (surveillance state)
- **Time Limit**: 30 minutes to achieve victory

## 🏗️ File Structure

```
optimicity/
├── optimicity.html              # Main game file
├── modules/
│   ├── styles.css              # UI styling with scrollbar fixes
│   ├── game-core.js            # 30min timer, population tracking, cooldown system
│   ├── neighborhoods.js        # 4 neighborhoods with background images
│   ├── actions.js              # 12 actions, dynamic cooldowns, casualty system
│   ├── ai-mayor.js            # gradual escalation, autonomous raids
│   ├── ai-citizens.js         # solidarity responses, mutual aid
│   └── ui-components.js       # 6 status indicators, game log
└── assets/
    ├── market.png
    ├── riverside.png
    ├── old town.png
    └── industrial quarter.png
```

## 🎮 Gameplay Mechanics

### Action Categories & Costs

**Direct Action** (High significance: 1500-4000 SimCoin)
- Occupy Building: 3500 SimCoin, +6-10 Power, +12-18 Heat
- Block Demolition: 4000 SimCoin, +8-12 Power, +15-25 Heat  
- Organize Protest: 2000 SimCoin, +5-8 Power, +10-15 Heat (recruits 10-30+ citizens)

**Cultural Resistance** (Low-Medium significance: 50-600 SimCoin)
- Street Art: 125 SimCoin, +3-6 Power, +4-8 Heat
- Community Garden: 50 SimCoin, +4-7 Power, +2-5 Heat
- Block Festival: 600 SimCoin, +6-9 Power, +6-10 Heat

**Infrastructure Hack** (Medium-High significance: 700-3000 SimCoin)
- Disable Cameras: 750 SimCoin, +5-8 Power, +8-12 Heat
- Mesh Network: 700 SimCoin, +4-6 Power, +5-8 Heat
- Pirate Broadcast: 3000 SimCoin, +7-10 Power, +12-16 Heat

**Organizing** (Low significance: 75-500 SimCoin)
- Secret Meeting: 75 SimCoin, +3-5 Power, +1-3 Heat
- Recruit Allies: 500 SimCoin, +5-8 Power, +3-6 Heat
- Gather Intel: 100 SimCoin, +2-4 Power, +1-2 Heat

### Population-Aware Recruitment System

**Three-Phase Progression** based on resistance size:
- **Phase 1 - Individual Network** (<0.01% of population): Fixed small recruitment (2-30 citizens)
- **Phase 2 - Local Movement** (0.01%-0.1% of population): Percentage-based recruitment
- **Phase 3 - City-Wide Resistance** (>0.1% of population): Mass mobilization possible

**Mobilizing Actions** (protests) provide enhanced recruitment across all phases.

### Risk System

- **Low Risk** (<25 heat): 5% casualty chance
- **Medium Risk** (25-49 heat): 25% casualty chance  
- **High Risk** (50-74 heat): 55% casualty chance
- **Extreme Risk** (75+ heat): 75% casualty chance

**Casualty Scaling**: Based on active resistance size, not total population
- Small groups (<100): 10% risk factor
- Medium groups (100-1000): 30% risk factor  
- Large movements (1000+): 50% risk factor

### AI Mayor Escalation

The AI Mayor's response intensifies based on heat level:
- **0-15**: Administrative concern
- **15-35**: Increased monitoring  
- **35-55**: Enforcement protocols
- **55-75**: Suppression measures
- **75+**: Maximum force authorized

## 🛠️ Installation & Setup

### 1. Clone Repository

```bash
git clone [repository-url]
cd optimicity
```

**No dependencies required** - OptimiCity runs entirely in the browser with vanilla JavaScript.

### 2. Install & Configure Ollama

**Required**: Ollama running locally with llama3.2 model
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the required model
ollama pull llama3.2

# Start Ollama server with CORS enabled for web access
OLLAMA_ORIGINS="*" ollama serve
```

### 3. Play!

Open `optimicity.html` in your browser and start the resistance!

### Debug Mode

Add `?debug=true` to URL for persistent debug panel showing:
- Power/heat levels
- Selected neighborhood
- Active cooldowns
- Population statistics

## 🎨 Design Philosophy

OptimiCity critiques "smart city" techno-solutionism and the violence of top-down urban planning. The game argues that:

- True democracy requires active resistance to systems that treat people as data points
- Community organizing—not efficient algorithms—creates livable cities  
- Grassroots movements can overcome algorithmic authoritarianism
- Cultural resistance is as important as direct action

### Visual Design

The aesthetic contrasts the AI's sterile corporate interface with vibrant street art, community murals, and the organic messiness of real neighborhood life.

## 🚀 Future Features

### Currency System ✅
**SimCoin Economy** - Complete alternative currency system:
- **Mining**: Exponential scaling based on active citizens (15M threshold)
- **Action Costs**: Significance-based pricing (50-4000 SimCoin)
  - Low Significance: 50-200 SimCoin (meetings, intel, gardens, street art)
  - Medium Significance: 400-800 SimCoin (recruiting, festivals, tech infrastructure)
  - High Significance: 1500-4000 SimCoin (protests, occupations, demolition blocking)
- **Earning Methods**: NFT generation, crowdfunding campaigns
- **Dynamic Pricing**: Heat-based multipliers and emergency discounts

### Action Improvements  
Enhanced action system with expanded action trees, combo mechanics, and deeper strategic gameplay.

## 🐛 Known Issues & Balance

### Current Balance Settings
- **Currency Mining**: Requires 1500+ citizens (0.01% of 15M population, threshold: 0.0001)
- **Action Costs**: Significance-based (grassroots 50-200, organized 400-800, confrontational 1500-4000)
- **Casualty System**: Resistance-size scaling prevents movement destruction
- **Recruitment**: Population-percentage thresholds (0.01%, 0.1%) with mobilizing action bonuses
- **Heat Penalties**: Reduce mining efficiency, increase action costs
- **Low risk actions**: 10% casualty multiplier for organizing actions

### Debug Features Active
- Force casualties: Currently enabled for testing (line 183 in actions.js)
- Console logging: Risk levels and casualty calculations
- ESC key toggle: Debug panel with real-time game state
- Inconsistent starting citizens: 1 on initial game, 100-300 on restart

## 🤝 Contributing

OptimiCity is built with grassroots organizing principles in mind. Contributions welcome for:

- New action types and mechanics
- UI/UX improvements  
- Bug fixes and optimization
- Translation and localization
- Community organizing insights

## 📜 License & Credits

Inspired by real-world community organizing, mutual aid networks, and resistance to algorithmic surveillance.

**Technology**: HTML5, CSS3, Vanilla JavaScript, Ollama AI
**Assets**: Community-sourced neighborhood images
**Testing**: Local Ollama llama3.2 integration

---

*"The resistance continues! Organize, resist, liberate!"* 🏴

## 🎮 Quick Start

1. **Clone and setup**: No dependencies needed, just clone the repo
2. **Install Ollama**: Run the installation commands above
3. **Start Ollama**: `OLLAMA_ORIGINS="*" ollama serve`
4. **Open game**: Launch `optimicity.html` in your browser
5. **Begin resistance**: Select a neighborhood (1-4 keys)
6. **Take action**: Choose your first resistance action
7. **Build power**: Increase community power while evading surveillance
8. **Liberation**: Free neighborhoods and overthrow the AI Mayor!

**Keyboard Shortcuts**:
- `1-4`: Select neighborhoods
- `Ctrl+R`: Restart game  
- `Esc`: Toggle debug panel
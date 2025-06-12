# 🎲 RossCube - Technical Documentation

A retro-styled Jumpstart deck generator with intelligent pack synergy analysis.

## 📋 Table of Contents

1. [📁 Core Modules](#-core-modules)
   - [main.js - Application Controller](#mainjs---application-controller)
   - [pack-synergy.js - Synergy Analysis Engine](#pack-synergyjs---synergy-analysis-engine)
   - [visual-display.js - Deck Presentation](#visual-displayjs---deck-presentation)
   - [commander-features.js - Commander Cube Logic](#commander-featuresjs---commander-cube-logic)
   - [app-utils.js - Utility Functions](#app-utilsjs---utility-functions)

2. [🔄 Data Flow](#-data-flow)

3. [🎯 Key Algorithms](#-key-algorithms)
   - [Synergy Analysis](#synergy-analysis-pack-synergyjs)
   - [Pack Theme Detection](#pack-theme-detection-pack-synergyjs)
   - [Commander Cube Flow](#commander-cube-flow-commander-featuresjs)

4. [⚡ Performance Features](#-performance-features)
   - [Caching Strategy](#caching-strategy)
   - [API Optimization](#api-optimization)
   - [Loading States](#loading-states)

5. [🛠️ Configuration](#️-configuration)
   - [Cube Definition](#cube-definition)
   - [CSV Format](#csv-format)

6. [🎨 UI Architecture](#-ui-architecture)
   - [Three-Step Wizard](#three-step-wizard)
   - [Commander Extensions](#commander-extensions)

7. [🔧 Technical Requirements](#-technical-requirements)

8. [📊 Module Dependencies](#-module-dependencies)

9. [🎯 Extension Points](#-extension-points)

---

## 📁 Core Modules

### [`main.js`](main.js) - Application Controller
**Purpose**: Primary application orchestration and UI state management

**Key Functions**:
- **Cube Loading**: CSV parsing and data processing
- **Pack Selection**: Multi-step wizard with random pack offerings  
- **Deck Generation**: Combines two packs into 40-card Jumpstart decks
- **Commander Flow**: Special handling for 100-card commander variants with Koffers and fixing lands

### [`pack-synergy.js`](pack-synergy.js) - Synergy Analysis Engine
**Purpose**: Real-time compatibility analysis between pack combinations

**Core Features**:
- **Dynamic Analysis**: Fetches card data from Scryfall API with CSV fallback
- **Theme Detection**: Identifies pack strategies (Aggro, Control, Artifacts, etc.)
- **Synergy Scoring**: Calculates compatibility scores (-3.0 to +3.0) 
- **Visual Feedback**: Real-time indicators (🔥🔥🔥 Amazing → 💀💀💀 Terrible)

**Algorithm**: Color overlap + strategy compatibility + mechanical synergy + theme strength

### [`visual-display.js`](visual-display.js) - Deck Presentation
**Purpose**: Visual deck rendering with card images and hover previews

**Features**:
- **Grouped Display**: Cards organized by type with overlapping layout
- **Scryfall Integration**: Card image fetching with preloading
- **Interactive Previews**: Large card images on hover
- **Count Badges**: Visual indicators for multiple copies

### [`commander-features.js`](commander-features.js) - Commander Cube Logic
**Purpose**: Extended features for 100-card commander format

**Special Steps**:
1. **Koffers Selection**: Choose from 3 random artifact options
2. **Fixing Lands**: Color-identity filtered mana fixing
3. **Basic Land Replacement**: Interactive land removal process

### [`app-utils.js`](app-utils.js) - Utility Functions
**Purpose**: Common helper functions across modules

**Utilities**:
- Random selection with exclusions
- Clipboard operations with fallbacks
- URL encoding for card names
- Dynamic element cleanup

## 🔄 Data Flow

```
1. User selects cube → CSV loaded and parsed
2. Pack themes extracted → Random pack options displayed
3. Pack 1 selected → Synergy analysis runs on Pack 2 options
4. Pack 2 selected → Deck generation combines cards
5. Visual display renders with card images
6. Commander cubes: Additional Koffers + fixing steps
```

## 🎯 Key Algorithms

### **Synergy Analysis** (`pack-synergy.js`)
```javascript
// Core synergy calculation
calculateDynamicSynergy(theme1, theme2) {
    // Color overlap: +1.0 perfect, -2.0 five-color
    // Strategy compatibility: Predefined matrix
    // Mechanical synergy: Shared keywords/tribes
    // Theme strength: Bonus for focused packs
    return { score: -3.0 to +3.0, reasons: [] }
}
```

### **Pack Theme Detection** (`pack-synergy.js`)
- **Pattern Matching**: Keywords, card names, creature types
- **Strategy Classification**: Aggro, Control, Artifacts, etc.
- **Strength Scoring**: Based on theme coherence and focus

### **Commander Cube Flow** (`commander-features.js`)
1. Extract commanders from pack tags
2. Render commander zone separately
3. Koffers selection (3 random options)
4. Fixing lands filtered by color identity
5. Interactive basic land removal

## ⚡ Performance Features

### **Caching Strategy**
- **Scryfall API**: 30-minute TTL with batch requests (25 cards)
- **Pack Themes**: Cached indefinitely for session
- **Card Images**: Preloaded before display

### **API Optimization**
- **Rate Limiting**: 200ms delays between batches
- **Fallback System**: CSV data when API unavailable
- **Error Handling**: Graceful degradation

### **Loading States**
- **Visual Indicators**: Spinners during synergy calculation
- **Progressive Display**: Cards appear as images load
- **Skeleton Loading**: Placeholders for card images

## 🛠️ Configuration

### **Cube Definition**
```javascript
{ 
  name: "Display Name", 
  code: "unique-id", 
  csvPath: "./cubes/file.csv",
  isCommander: true  // Optional: enables commander features
}
```

### **CSV Format**
```csv
Name,Mana,Type,Tags
"Lightning Bolt","{R}","Instant","Burn Pack;Red Aggro Pack"
"Command Tower","{T}","Land","z_Fixing Roster_z"
```

## 🎨 UI Architecture

### **Three-Step Wizard**
1. **Cube Selection**: Dropdown with all available cubes
2. **Pack Selection**: Radio buttons with synergy indicators
3. **Deck Display**: Text list + visual grid with copy functionality

### **Commander Extensions**
- **Modal Dialogs**: Koffers and fixing land selection
- **Interactive Elements**: Click-to-select with card previews
- **Progress Indicators**: Step counters during multi-step process

## 🔧 Technical Requirements

- **Modern Browsers**: ES6+ modules, Fetch API, CSS Grid
- **No Build Process**: Direct JavaScript modules
- **Local Server**: Required for CORS (CSV file access)

## 📊 Module Dependencies

```
main.js
├── pack-synergy.js (optional)
├── visual-display.js
├── commander-features.js (commander cubes only)
└── app-utils.js

pack-synergy.js
└── Scryfall API (with CSV fallback)
```

## 🎯 Extension Points

- **New Cubes**: Add CSV file + update cube array
- **Custom Synergy Rules**: Modify strategy compatibility matrix
- **Additional Features**: Plug-in architecture for new analyzers
- **Export Formats**: Add new deck list formats

---

**Architecture Philosophy**: Modular design with optional feature enhancement, maintaining retro aesthetic while providing modern functionality.

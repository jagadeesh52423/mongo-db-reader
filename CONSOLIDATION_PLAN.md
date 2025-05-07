# Component Consolidation Plan

This plan outlines the steps to consolidate duplicate components and improve code organization in the MongoDB Reader application.

## Current Structure Analysis

1. **Main Components**: `/components/` - Used by the Next.js application
   - More up-to-date and feature-rich components
   - Includes advanced UI elements like `MongoCodeEditor` and `MongoHelpDrawer`

2. **Client Components**: `/client/src/components/` - Older/alternative implementation
   - Simplified versions of components
   - Used by the React application in `/client/src/App.js`

3. **Application Structure**:
   - Next.js application in `/pages/`
   - Separate React client application in `/client/`
   - Both share similar component names but with different implementations

## Consolidation Strategy

### 1. Component Structure Reorganization

Create a standard component organization:

```
/components/
  /layout/
    Header.js
    Sidebar.js
    ServerStatusBar.js
    TabPanel.js
  /database/
    ConnectionDialog.js
    ConnectionContextMenu.js
  /editor/
    MongoCodeEditor.js
    QueryEditor.js
    ResultsDisplay.js
  /ui/
    MongoHelpDrawer.js
```

### 2. Client App Decision

Determine if the client app should be:
- Kept as a separate alternative implementation (multi-app approach)
- Removed if no longer needed (consolidation approach)
- Migrated to use the main components (integration approach)

### 3. Component Implementation Tasks

1. **Move components to their new structure**
   - Create directories
   - Relocate existing components
   - Update imports in all files

2. **Standardize context usage**
   - There appear to be context duplications
   - Consolidate connection context implementations

3. **Fix broken references**
   - Ensure all components can be properly imported from new locations
   - Update any relative paths

## Implementation Phases

### Phase 1: Create New Structure
- Create the directory structure
- Move main components to appropriate directories

### Phase 2: Update Imports
- Fix import paths in Next.js app components

### Phase 3: Client Decision
- Based on requirements, either deprecate or update the client application

## Additional Recommendations

1. **Component Documentation**
   - Add JSDoc comments to all components
   - Include prop type definitions

2. **Styling Consistency**
   - Standardize style approach (all Material UI)
   - Remove any inline styles in favor of theme-based styling

3. **Testing**
   - Add component tests after consolidation
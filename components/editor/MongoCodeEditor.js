import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { useTheme } from '@mui/material/styles';

// Light mode highlighting for MongoDB syntax
const mongoLightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#0000ff" },
  { tag: tags.string, color: "#008000" },
  { tag: tags.number, color: "#098658" },
  { tag: tags.comment, color: "#708090", fontStyle: "italic" },
  { tag: tags.propertyName, color: "#660e7a" },
  { tag: tags.operator, color: "#0000ff" },
  { tag: tags.function(tags.variableName), color: "#795e26" },
  { tag: tags.definition(tags.variableName), color: "#795e26" },
  { tag: tags.null, color: "#0000ff" },
  { tag: tags.bool, color: "#0000ff" },
]);

// Dark mode highlighting for MongoDB syntax
const mongoDarkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#cc7832" },
  { tag: tags.string, color: "#6a8759" },
  { tag: tags.number, color: "#6897bb" },
  { tag: tags.comment, color: "#808080", fontStyle: "italic" },
  { tag: tags.propertyName, color: "#9876aa" },
  { tag: tags.operator, color: "#cc7832" },
  { tag: tags.function(tags.variableName), color: "#ffc66d" },
  { tag: tags.definition(tags.variableName), color: "#ffc66d" },
  { tag: tags.null, color: "#cc7832" },
  { tag: tags.bool, color: "#cc7832" },
]);

// Custom completions for MongoDB
const mongoCompletions = (context) => {
  const word = context.matchBefore(/\w*/);
  if (!word || word.from === word.to) return null;
  
  const mongoKeywords = [
    // MongoDB collections
    { label: "db", type: "keyword", detail: "MongoDB database object" },
    
    // Common operations
    { label: "find", type: "function", detail: "Find documents in collection" },
    { label: "findOne", type: "function", detail: "Find single document in collection" },
    { label: "insertOne", type: "function", detail: "Insert document into collection" },
    { label: "insertMany", type: "function", detail: "Insert multiple documents into collection" },
    { label: "updateOne", type: "function", detail: "Update single document in collection" },
    { label: "updateMany", type: "function", detail: "Update multiple documents in collection" },
    { label: "deleteOne", type: "function", detail: "Delete single document from collection" },
    { label: "deleteMany", type: "function", detail: "Delete multiple documents from collection" },
    { label: "countDocuments", type: "function", detail: "Count documents in collection" },
    { label: "aggregate", type: "function", detail: "Aggregation pipeline" },
    { label: "distinct", type: "function", detail: "Get distinct values" },
    
    // Cursor methods
    { label: "sort", type: "function", detail: "Sort documents" },
    { label: "limit", type: "function", detail: "Limit number of results" },
    { label: "skip", type: "function", detail: "Skip documents" },
    { label: "count", type: "function", detail: "Count documents in cursor" },
    { label: "forEach", type: "function", detail: "Execute function on each document" },
    { label: "map", type: "function", detail: "Transform documents with function" },
    
    // MongoDB operators
    { label: "$set", type: "keyword", detail: "Set field value" },
    { label: "$unset", type: "keyword", detail: "Remove field" },
    { label: "$inc", type: "keyword", detail: "Increment field value" },
    { label: "$push", type: "keyword", detail: "Add to array" },
    { label: "$pull", type: "keyword", detail: "Remove from array" },
    { label: "$in", type: "keyword", detail: "Match any value in array" },
    { label: "$nin", type: "keyword", detail: "Not match any value in array" },
    { label: "$gt", type: "keyword", detail: "Greater than" },
    { label: "$gte", type: "keyword", detail: "Greater than or equal" },
    { label: "$lt", type: "keyword", detail: "Less than" },
    { label: "$lte", type: "keyword", detail: "Less than or equal" },
    { label: "$eq", type: "keyword", detail: "Equal" },
    { label: "$ne", type: "keyword", detail: "Not equal" },
    { label: "$regex", type: "keyword", detail: "Regular expression" },
    
    // Aggregation operators
    { label: "$match", type: "keyword", detail: "Filter documents" },
    { label: "$group", type: "keyword", detail: "Group documents" },
    { label: "$project", type: "keyword", detail: "Project fields" },
    { label: "$sort", type: "keyword", detail: "Sort documents" },
    { label: "$limit", type: "keyword", detail: "Limit documents" },
    { label: "$skip", type: "keyword", detail: "Skip documents" },
    { label: "$unwind", type: "keyword", detail: "Unwind array" },
    { label: "$lookup", type: "keyword", detail: "Join with another collection" },
    { label: "$sum", type: "keyword", detail: "Sum values" },
    { label: "$avg", type: "keyword", detail: "Average values" },
    { label: "$first", type: "keyword", detail: "First value" },
    { label: "$last", type: "keyword", detail: "Last value" },
    
    // MongoDB types
    { label: "ObjectId", type: "function", detail: "MongoDB ObjectId" },
    { label: "ISODate", type: "function", detail: "MongoDB Date" },
    { label: "new Date", type: "function", detail: "JavaScript Date" }
  ];
  
  return {
    from: word.from,
    options: mongoKeywords.filter(item => 
      item.label.toLowerCase().startsWith(word.text.toLowerCase())
    ),
  };
};

const MongoCodeEditor = forwardRef(({ 
  value, 
  onChange, 
  placeholder: placeholderText = "Enter MongoDB query",
  height = "200px" 
}, ref) => {
  const editorRef = useRef();
  const viewRef = useRef();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Track selection for cursor position
  const [selection, setSelection] = useState({ anchor: 0, head: 0 });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Get current cursor position
    getCursorPosition: () => {
      if (!viewRef.current) return 0;
      return viewRef.current.state.selection.main.head;
    },
    // Set cursor position
    setCursorPosition: (pos) => {
      if (!viewRef.current) return;
      
      // Ensure position is within document bounds
      const docLength = viewRef.current.state.doc.length;
      const safePos = Math.min(Math.max(0, pos), docLength);
      
      // Create a new transaction to set the selection
      const transaction = viewRef.current.state.update({
        selection: {anchor: safePos, head: safePos},
        scrollIntoView: true
      });
      
      // Dispatch the transaction to update the editor state
      viewRef.current.dispatch(transaction);
    },
    // Get current selection
    getSelection: () => {
      if (!viewRef.current) return { from: 0, to: 0, text: "" };
      const sel = viewRef.current.state.selection.main;
      return { 
        from: sel.from,
        to: sel.to,
        text: sel.from !== sel.to ? 
          viewRef.current.state.doc.sliceString(sel.from, sel.to) : ""
      };
    },
    // Get full document text
    getText: () => {
      if (!viewRef.current) return "";
      return viewRef.current.state.doc.toString();
    },
    // Focus the editor
    focus: () => {
      if (viewRef.current) {
        viewRef.current.focus();
      }
    }
  }));

  // Create a custom theme extension based on the current app theme
  const createThemeExtension = useCallback(() => {
    return EditorView.theme({
      "&": {
        backgroundColor: isDarkMode ? "#1e1e24" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#333333",
      },
      ".cm-content": {
        caretColor: isDarkMode ? "#90caf9" : "#1976d2",
      },
      ".cm-cursor": {
        borderLeftColor: isDarkMode ? "#90caf9" : "#1976d2",
        borderLeftWidth: "2px",
      },
      ".cm-activeLine": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.1)" : "rgba(25, 118, 210, 0.05)",
      },
      ".cm-gutters": {
        backgroundColor: isDarkMode ? "#1e1e24" : "#f0f0f0",
        color: isDarkMode ? "#6c7280" : "#888888",
        border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.2)" : "rgba(25, 118, 210, 0.1)",
      },
      ".cm-selectionBackground": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.4)" : "rgba(25, 118, 210, 0.2) !important",
      },
      ".cm-tooltip": {
        backgroundColor: isDarkMode ? "#282c34" : "#ffffff",
        border: isDarkMode ? "1px solid #3f3f46" : "1px solid #cccccc",
        borderRadius: "4px",
      },
      ".cm-tooltip-autocomplete": {
        "& > ul > li[aria-selected]": {
          backgroundColor: isDarkMode ? "#4b5263" : "#e3f2fd",
          color: isDarkMode ? "#d7dce4" : "#1976d2",
        }
      },
    }, { dark: isDarkMode });
  }, [isDarkMode]);

  // Track internal changes to avoid update loops
  const isInternalChange = useRef(false);
  
  // Track if editor has focus
  const hasFocus = useRef(false);
  
  // Initialize the editor
  const initEditor = useCallback((content = value || '', cursorPos = 0) => {
    if (!editorRef.current) return;
    
    // Define the extensions for our editor
    const extensions = [
      history(),
      javascript({ jsx: false, typescript: false }),
      json(),
      syntaxHighlighting(isDarkMode ? mongoDarkHighlightStyle : mongoLightHighlightStyle),
      createThemeExtension(),
      lineNumbers(),
      highlightActiveLine(),
      autocompletion({ override: [mongoCompletions] }),
      closeBrackets(),
      placeholder(placeholderText),
      EditorView.domEventHandlers({
        focus: () => {
          hasFocus.current = true;
          return false;
        },
        blur: () => {
          hasFocus.current = false;
          return false;
        }
      }),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          // Save selection first
          const sel = update.state.selection.main;
          const selectionToSave = { anchor: sel.anchor, head: sel.head };
          
          // Mark this as an internal change to prevent re-render loop
          isInternalChange.current = true;
          
          // Call onChange with the new document content
          const newContent = update.state.doc.toString();
          
          // Use the EditorView's own transaction API instead of React state updates
          onChange(newContent);
            
          // Reset the flag after a short delay
          setTimeout(() => {
            isInternalChange.current = false;
            
            // Ensure focus is maintained if it was active
            if (hasFocus.current && viewRef.current) {
              viewRef.current.focus();
            }
          }, 0);
        }
        
        // Update selection state when the selection changes
        if (update.selectionSet) {
          const sel = update.state.selection.main;
          setSelection({ anchor: sel.anchor, head: sel.head });
        }
      }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...completionKeymap,
        indentWithTab
      ]),
    ];

    // Create the editor state
    const state = EditorState.create({
      doc: content,
      extensions,
      selection: { anchor: cursorPos, head: cursorPos }
    });

    // Create the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    // Store the view in a ref for later use
    viewRef.current = view;
  }, [isDarkMode, value, placeholderText, createThemeExtension, onChange]);

  // No longer needed as editor initialization is now done in the ref callback

  // Re-create the editor when the theme changes
  useEffect(() => {
    if (!editorRef.current || !viewRef.current) return;
    
    // Store current content and cursor position
    const currentContent = viewRef.current.state.doc.toString();
    const currentCursor = viewRef.current.state.selection.main.head;
    
    // Destroy the existing editor view
    viewRef.current.destroy();
    
    // Create a new editor with the updated theme
    initEditor(currentContent, currentCursor);
  }, [isDarkMode, initEditor]);

  // Update content when value prop changes, but only when it comes from an external source
  useEffect(() => {
    if (!viewRef.current) return;

    // Skip this update if the change came from within the editor
    if (isInternalChange.current) {
      return;
    }
    
    // Skip this update if the editor has focus - this prevents focus loss during typing
    if (document.activeElement === editorRef.current || 
        (editorRef.current && editorRef.current.contains(document.activeElement))) {
      return;
    }

    const currentContent = viewRef.current.state.doc.toString();
    if (value !== currentContent) {
      // Save cursor position before update
      const { head, anchor } = viewRef.current.state.selection.main;
      
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value || ''
        },
        // Restore selection after update
        selection: { anchor, head }
      });
    }
  }, [value]);

  // Create the editor container element - must come before any useEffects
  const containerRef = useRef(null);
  
  // Initialize container element once
  useEffect(() => {
    // Create div manually to prevent re-rendering issues
    const div = document.createElement('div');
    div.className = "mongo-code-editor";
    div.style.height = height;
    div.style.overflow = 'auto';
    div.style.fontFamily = 'monospace';
    div.style.borderRadius = '4px';
    div.style.transition = 'border-color 0.2s ease-in-out';
    div.style.border = isDarkMode 
      ? '1px solid rgba(255, 255, 255, 0.23)' 
      : '1px solid rgba(0, 0, 0, 0.23)';
    
    // Store the div in our ref
    editorRef.current = div;
    
    // Clean up function
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      editorRef.current = null;
    };
  }, [height, isDarkMode]);
  
  // Update border style when theme changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.border = isDarkMode 
        ? '1px solid rgba(255, 255, 255, 0.23)' 
        : '1px solid rgba(0, 0, 0, 0.23)';
    }
  }, [isDarkMode]);
  
  // Render the container div
  return (
    <div 
      ref={node => {
        containerRef.current = node;
        if (node && editorRef.current && !node.contains(editorRef.current)) {
          // Only append if not already appended
          node.appendChild(editorRef.current);
          
          // Initialize editor if needed
          if (!viewRef.current && editorRef.current) {
            initEditor();
          }
        }
      }}
      style={{ 
        height: '100%', 
        width: '100%'
      }}
    />
  );
});

MongoCodeEditor.displayName = 'MongoCodeEditor';

export default MongoCodeEditor;
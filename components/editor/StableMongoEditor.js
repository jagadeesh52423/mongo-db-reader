import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
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

// MongoDB operator autocompletion
const mongoCompletions = context => {
  const word = context.matchBefore(/\w*/);
  if (!word || word.from === word.to) {
    return null;
  }
  
  const mongoKeywords = [
    // MongoDB query operators
    { label: "$set", type: "keyword", detail: "Updates fields" },
    { label: "$unset", type: "keyword", detail: "Removes fields" },
    { label: "$inc", type: "keyword", detail: "Increments fields" },
    { label: "$push", type: "keyword", detail: "Adds to arrays" },
    { label: "$pull", type: "keyword", detail: "Removes from arrays" },
    { label: "$in", type: "keyword", detail: "Matches any value in array" },
    { label: "$nin", type: "keyword", detail: "Matches no values in array" },
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

// This is a completely stable editor that won't lose focus during typing
const StableMongoEditor = forwardRef(({ 
  value, 
  onChange, 
  placeholder: placeholderText = "Enter MongoDB query",
  height = "200px" 
}, ref) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Refs to DOM elements and editor state
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const internalChangeRef = useRef(false);
  const lastSelectionRef = useRef({ anchor: 0, head: 0 });
  const lastValueRef = useRef(value || '');
  
  // Create a theme extension based on current app theme
  const createThemeExtension = () => {
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
  };
  
  // Create or update the editor
  const setupEditor = () => {
    if (!containerRef.current) return;
    
    // If there's an existing editor, destroy it
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }
    
    // Create element if it doesn't exist yet
    if (!editorRef.current) {
      editorRef.current = document.createElement('div');
      editorRef.current.className = "mongo-code-editor";
      editorRef.current.style.height = height;
      editorRef.current.style.width = "100%";
      editorRef.current.style.overflow = "auto";
      editorRef.current.style.fontFamily = "monospace";
      editorRef.current.style.borderRadius = "4px";
      editorRef.current.style.border = isDarkMode 
        ? '1px solid rgba(255, 255, 255, 0.23)' 
        : '1px solid rgba(0, 0, 0, 0.23)';
      
      // Append to container
      containerRef.current.appendChild(editorRef.current);
    }
    
    // Extensions for the editor
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
      
      // Add event listeners for document changes
      EditorView.updateListener.of(update => {
        if (update.docChanged && !internalChangeRef.current) {
          // Store cursor position
          lastSelectionRef.current = {
            anchor: update.state.selection.main.anchor,
            head: update.state.selection.main.head
          };
          
          // Get the document content
          const content = update.state.doc.toString();
          lastValueRef.current = content;
          
          // Notify parent component
          if (onChange && content !== value) {
            onChange(content);
          }
        }
      }),
      
      // Add keymaps
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...completionKeymap,
        indentWithTab
      ]),
    ];
    
    // Create editor state
    const state = EditorState.create({
      doc: lastValueRef.current,
      extensions,
      selection: lastSelectionRef.current
    });
    
    // Create the editor view
    viewRef.current = new EditorView({
      state,
      parent: editorRef.current
    });
  };
  
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
  
  // Set up the editor on mount
  useEffect(() => {
    // Prevent re-focusing/flushing when the component gets updated
    if (!viewRef.current) {
      setupEditor();
    }
    
    // Clean up the editor on unmount
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);
  
  // Update the editor when the theme changes
  useEffect(() => {
    if (viewRef.current && editorRef.current) {
      // Update border style directly
      editorRef.current.style.border = isDarkMode 
        ? '1px solid rgba(255, 255, 255, 0.23)' 
        : '1px solid rgba(0, 0, 0, 0.23)';
      
      // Store current state
      const currentContent = viewRef.current.state.doc.toString();
      const currentSelection = viewRef.current.state.selection.main;
      
      // Recreate the editor with new theme
      setupEditor();
      
      // Restore the content and selection
      if (viewRef.current) {
        viewRef.current.dispatch({
          selection: currentSelection
        });
      }
    }
  }, [isDarkMode]);
  
  // Update the editor content when the value prop changes (but not if it came from inside)
  useEffect(() => {
    if (viewRef.current && value !== undefined && value !== lastValueRef.current) {
      // Mark as internal change to prevent feedback loop
      internalChangeRef.current = true;
      
      // Store current selection
      const currentSelection = viewRef.current.state.selection.main;
      
      // Update the content
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value || ''
        },
        selection: currentSelection
      });
      
      // Update the last value reference
      lastValueRef.current = value;
      
      // Reset the internal change flag
      setTimeout(() => {
        internalChangeRef.current = false;
      }, 0);
    }
  }, [value]);
  
  // Render just a stable container div
  return <div ref={containerRef} style={{ height, width: '100%' }} />;
});

StableMongoEditor.displayName = 'StableMongoEditor';

export default StableMongoEditor;
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { autocompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { useTheme } from '@mui/material/styles';

// MongoDB completions for autocomplete
const mongoCompletions = [
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

// Custom autocomplete function that ensures completions work reliably
function myCompletions(context) {
  const word = context.matchBefore(/\w+/);
  if (!word) return null;

  return {
    from: word.from,
    options: mongoCompletions.filter(item => 
      item.label.toLowerCase().startsWith(word.text.toLowerCase())
    )
  };
}

// Define a simplified highlight style for MongoDB syntax
const mongoHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#0000cc" },
  { tag: tags.string, color: "#008800" },
  { tag: tags.number, color: "#116644" },
  { tag: tags.comment, color: "#696969", fontStyle: "italic" },
  { tag: tags.propertyName, color: "#660e7a" },
  { tag: tags.operator, color: "#0000cc" },
  { tag: tags.null, color: "#0000cc" }
]);

const MongoCodeEditorFixed = forwardRef(({
  value = '',
  onChange,
  placeholder: placeholderText = "Enter MongoDB query",
  height = "200px"
}, ref) => {
  const editorRef = useRef(null);
  const editorViewRef = useRef(null);
  const ignoreChangeRef = useRef(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Create editor selection interface for the parent component
  useImperativeHandle(ref, () => ({
    getCursorPosition: () => {
      if (!editorViewRef.current) return 0;
      return editorViewRef.current.state.selection.main.head;
    },
    getSelection: () => {
      if (!editorViewRef.current) return { from: 0, to: 0, text: "" };
      const sel = editorViewRef.current.state.selection.main;
      return {
        from: sel.from,
        to: sel.to,
        text: sel.from !== sel.to ? 
          editorViewRef.current.state.doc.sliceString(sel.from, sel.to) : ""
      };
    },
    getText: () => {
      if (!editorViewRef.current) return "";
      return editorViewRef.current.state.doc.toString();
    },
    focus: () => {
      if (editorViewRef.current) {
        editorViewRef.current.focus();
      }
    }
  }));

  // Initialize the editor once on component mount
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Base theme that adapts to light/dark mode
    const baseTheme = EditorView.theme({
      "&": {
        backgroundColor: isDarkMode ? "#1e1e24" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#333333",
        height: "100%"
      },
      ".cm-content": {
        caretColor: isDarkMode ? "#90caf9" : "#1976d2",
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace"
      },
      ".cm-cursor": {
        borderLeftColor: isDarkMode ? "#90caf9" : "#1976d2 !important",
        borderLeftWidth: "2px",
      },
      ".cm-gutters": {
        backgroundColor: isDarkMode ? "#1e1e24" : "#f8f8f8",
        color: isDarkMode ? "#6c7280" : "#999",
        border: "none"
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.2)" : "rgba(25, 118, 210, 0.1)"
      },
      ".cm-activeLine": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.1)" : "rgba(25, 118, 210, 0.05)"
      },
      ".cm-selectionBackground": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.4) !important" : "rgba(25, 118, 210, 0.2) !important"
      }
    }, { dark: isDarkMode });

    // Create an editor state with our configuration
    const state = EditorState.create({
      doc: value,
      extensions: [
        baseTheme,
        history(),
        highlightActiveLine(),
        lineNumbers(),
        javascript(),
        json(),
        syntaxHighlighting(mongoHighlightStyle),
        autocompletion({
          override: [myCompletions],
          defaultKeymap: true,
          icons: true 
        }),
        closeBrackets(),
        placeholder(placeholderText),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...completionKeymap,
          indentWithTab
        ]),
        // The update listener ensures we don't get focus loops
        EditorView.updateListener.of(update => {
          if (update.docChanged && !ignoreChangeRef.current) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        })
      ]
    });

    // Create and store the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });
    
    editorViewRef.current = view;
    
    // Cleanup function
    return () => {
      if (editorViewRef.current) {
        editorViewRef.current.destroy();
      }
    };
  }, []);

  // Handle theme changes - recreate the editor with the new theme
  useEffect(() => {
    if (!editorViewRef.current || !editorRef.current) return;
    
    // Store the current value and cursor position
    const currentValue = editorViewRef.current.state.doc.toString();
    const cursor = editorViewRef.current.state.selection.main;
    
    // Destroy the current editor
    editorViewRef.current.destroy();
    
    // Create a new editor with the updated theme
    const baseTheme = EditorView.theme({
      "&": {
        backgroundColor: isDarkMode ? "#1e1e24" : "#ffffff",
        color: isDarkMode ? "#e0e0e0" : "#333333",
        height: "100%"
      },
      ".cm-content": {
        caretColor: isDarkMode ? "#90caf9" : "#1976d2",
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace"
      },
      ".cm-cursor": {
        borderLeftColor: isDarkMode ? "#90caf9" : "#1976d2 !important",
        borderLeftWidth: "2px",
      },
      ".cm-gutters": {
        backgroundColor: isDarkMode ? "#1e1e24" : "#f8f8f8",
        color: isDarkMode ? "#6c7280" : "#999",
        border: "none"
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.2)" : "rgba(25, 118, 210, 0.1)"
      },
      ".cm-activeLine": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.1)" : "rgba(25, 118, 210, 0.05)"
      },
      ".cm-selectionBackground": {
        backgroundColor: isDarkMode ? "rgba(66, 153, 225, 0.4) !important" : "rgba(25, 118, 210, 0.2) !important"
      }
    }, { dark: isDarkMode });
    
    // Create an editor state with our configuration
    const state = EditorState.create({
      doc: currentValue,
      extensions: [
        baseTheme,
        history(),
        highlightActiveLine(),
        lineNumbers(),
        javascript(),
        json(),
        syntaxHighlighting(mongoHighlightStyle),
        autocompletion({
          override: [myCompletions],
          defaultKeymap: true,
          icons: true 
        }),
        closeBrackets(),
        placeholder(placeholderText),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...completionKeymap,
          indentWithTab
        ]),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !ignoreChangeRef.current) {
            const newValue = update.state.doc.toString();
            onChange(newValue);
          }
        })
      ],
      selection: {
        anchor: Math.min(cursor.anchor, currentValue.length),
        head: Math.min(cursor.head, currentValue.length)
      }
    });

    // Create and store the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });
    
    editorViewRef.current = view;
  }, [isDarkMode, onChange, placeholderText]);

  // Update the content from props, but carefully to maintain focus
  useEffect(() => {
    if (!editorViewRef.current) return;
    
    const currentValue = editorViewRef.current.state.doc.toString();
    if (value !== currentValue) {
      // Determine if the editor is focused
      const editorHasFocus = document.activeElement === editorRef.current ||
        editorRef.current.contains(document.activeElement);
      
      // Don't update while user is typing
      if (editorHasFocus) return;
      
      // Get current cursor position before update
      const cursor = editorViewRef.current.state.selection.main;
      
      // Set a flag to ignore the onChange callback for this update
      ignoreChangeRef.current = true;
      
      // Update document content
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: value
        },
        // Preserve cursor position if possible
        selection: { 
          anchor: Math.min(cursor.anchor, value.length),
          head: Math.min(cursor.head, value.length)
        }
      });
      
      // Reset the ignore flag after the update
      setTimeout(() => {
        ignoreChangeRef.current = false;
      }, 0);
    }
  }, [value]);

  return (
    <div 
      ref={editorRef}
      style={{ 
        height, 
        border: isDarkMode 
          ? '1px solid rgba(255, 255, 255, 0.23)' 
          : '1px solid rgba(0, 0, 0, 0.23)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    />
  );
});

MongoCodeEditorFixed.displayName = 'MongoCodeEditorFixed';

export default MongoCodeEditorFixed;
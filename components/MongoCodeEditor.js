import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
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

// Custom highlighting for MongoDB syntax
const mongoHighlightStyle = HighlightStyle.define([
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
  
  // Track selection for cursor position
  const [selection, setSelection] = useState({ anchor: 0, head: 0 });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Get current cursor position
    getCursorPosition: () => {
      if (!viewRef.current) return 0;
      return viewRef.current.state.selection.main.head;
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

  useEffect(() => {
    if (!editorRef.current) return;
    
    // Define the extensions for our editor
    const extensions = [
      history(),
      javascript({ jsx: false, typescript: false }),
      json(),
      syntaxHighlighting(mongoHighlightStyle),
      lineNumbers(),
      highlightActiveLine(),
      autocompletion({ override: [mongoCompletions] }),
      closeBrackets(),
      placeholder(placeholderText),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          // Call onChange with the new document content
          onChange(update.state.doc.toString());
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
      doc: value || '',
      extensions
    });

    // Create the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    // Store the view in a ref for later use
    viewRef.current = view;

    // Clean up on unmount
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, [placeholderText]);

  // Update the editor content when the value changes from outside
  useEffect(() => {
    if (!viewRef.current) return;

    const currentContent = viewRef.current.state.doc.toString();
    if (value !== currentContent) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value || ''
        }
      });
    }
  }, [value]);

  return (
    <div 
      ref={editorRef}
      style={{ 
        height, 
        overflow: 'auto',
        fontFamily: 'monospace',
        border: '1px solid rgba(255, 255, 255, 0.23)', // match MUI outlined TextField
        borderRadius: '4px',
      }}
      className="mongo-code-editor"
    />
  );
});

MongoCodeEditor.displayName = 'MongoCodeEditor';

export default MongoCodeEditor;
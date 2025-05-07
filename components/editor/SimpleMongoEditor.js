import React, { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * A simple, reliable text editor component for MongoDB queries.
 * This avoids the complexities of CodeMirror that might be causing focus issues.
 */
const SimpleMongoEditor = React.forwardRef(({ 
  value, 
  onChange, 
  placeholder = "Enter MongoDB query", 
  height = "200px" 
}, ref) => {
  const textareaRef = useRef(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Initialize ref
  React.useImperativeHandle(ref, () => ({
    // Get current cursor position
    getCursorPosition: () => {
      if (!textareaRef.current) return 0;
      return textareaRef.current.selectionStart;
    },
    // Get current selection
    getSelection: () => {
      if (!textareaRef.current) return { from: 0, to: 0, text: "" };
      const el = textareaRef.current;
      return { 
        from: el.selectionStart,
        to: el.selectionEnd,
        text: el.value.substring(el.selectionStart, el.selectionEnd)
      };
    },
    // Get full text
    getText: () => {
      if (!textareaRef.current) return "";
      return textareaRef.current.value;
    },
    // Focus the editor
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }));

  // Sync external value changes when not focused
  useEffect(() => {
    if (
      textareaRef.current && 
      document.activeElement !== textareaRef.current && 
      textareaRef.current.value !== value
    ) {
      textareaRef.current.value = value || '';
    }
  }, [value]);

  // Set initial value
  useEffect(() => {
    if (textareaRef.current && !textareaRef.current.value) {
      textareaRef.current.value = value || '';
    }
  }, []);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        height,
        padding: '12px',
        fontSize: '14px',
        fontFamily: 'monospace',
        border: isDarkMode 
          ? '1px solid rgba(255, 255, 255, 0.23)' 
          : '1px solid rgba(0, 0, 0, 0.23)',
        borderRadius: '4px',
        backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
        resize: 'vertical',
        outline: 'none',
        boxSizing: 'border-box',
        caretColor: isDarkMode ? '#90caf9' : '#1976d2',
      }}
    />
  );
});

SimpleMongoEditor.displayName = 'SimpleMongoEditor';

export default SimpleMongoEditor;
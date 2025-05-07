import React, { useRef, useEffect, forwardRef } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * An ultra-simple editor for MongoDB that guarantees focus stability
 */
const UltraSimpleEditor = forwardRef(({
  value = '',
  onChange,
  placeholder = "Enter MongoDB query",
  height = "200px"
}, ref) => {
  const textareaRef = useRef(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // Initialize ref methods for parent component
  React.useImperativeHandle(ref, () => ({
    getCursorPosition: () => {
      return textareaRef.current?.selectionStart || 0;
    },
    getSelection: () => {
      if (!textareaRef.current) return { from: 0, to: 0, text: "" };
      const el = textareaRef.current;
      return {
        from: el.selectionStart,
        to: el.selectionEnd,
        text: el.value.substring(el.selectionStart, el.selectionEnd)
      };
    },
    getText: () => {
      return textareaRef.current?.value || "";
    },
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Handle change event
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  // Handle tab key for indentation
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Insert tab at cursor position
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert tab
      const newValue = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.value = newValue;
      
      // Move cursor position after the tab
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      
      // Call onChange handler
      onChange(newValue);
    }
  };

  // Sync value change from props
  useEffect(() => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.value = value || '';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={value}
      placeholder={placeholder}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      spellCheck="false"
      style={{
        width: '100%',
        height,
        padding: '12px',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
        fontSize: '14px',
        lineHeight: '1.5',
        color: isDarkMode ? '#e0e0e0' : '#333',
        backgroundColor: isDarkMode ? '#1e1e24' : '#fff',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.23)' : '1px solid rgba(0, 0, 0, 0.23)',
        borderRadius: '4px',
        resize: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        caretColor: isDarkMode ? '#90caf9' : '#1976d2',
      }}
    />
  );
});

UltraSimpleEditor.displayName = 'UltraSimpleEditor';

export default UltraSimpleEditor;
import React, { useRef, useEffect, forwardRef } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * A reliable text editor for MongoDB queries with basic autocompletion
 */
const BasicEditor = forwardRef(({
  value = '',
  onChange,
  placeholder = "Enter MongoDB query",
  height = "200px"
}, ref) => {
  const textareaRef = useRef(null);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const suggestionsRef = useRef([]);
  const suggestionBoxRef = useRef(null);
  const selectedSuggestionRef = useRef(0);
  
  // MongoDB suggestions for autocompletion
  const mongoKeywords = [
    // MongoDB collections
    "db", 
    
    // Common operations
    "find", "findOne", "insertOne", "insertMany", "updateOne", "updateMany", 
    "deleteOne", "deleteMany", "countDocuments", "aggregate", "distinct",
    
    // Cursor methods
    "sort", "limit", "skip", "count", "forEach", "map",
    
    // MongoDB operators
    "$set", "$unset", "$inc", "$push", "$pull", "$in", "$nin", "$gt", "$gte", 
    "$lt", "$lte", "$eq", "$ne", "$regex",
    
    // Aggregation operators
    "$match", "$group", "$project", "$sort", "$limit", "$skip", "$unwind", 
    "$lookup", "$sum", "$avg", "$first", "$last",
    
    // MongoDB types
    "ObjectId", "ISODate", "new Date"
  ];

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

  // Handle showing suggestions based on current word
  const showSuggestions = () => {
    if (!textareaRef.current || !suggestionBoxRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const text = textareaRef.current.value;
    
    // Find the current word being typed
    let wordStart = cursorPos;
    while (wordStart > 0 && /[\w$]/.test(text.charAt(wordStart - 1))) {
      wordStart--;
    }
    
    const currentWord = text.substring(wordStart, cursorPos);
    
    // Only show suggestions if the word is at least 1 character long
    if (currentWord.length < 1) {
      suggestionBoxRef.current.style.display = 'none';
      return;
    }
    
    // Filter matching suggestions
    const matches = mongoKeywords.filter(kw => 
      kw.toLowerCase().startsWith(currentWord.toLowerCase())
    );
    
    if (matches.length === 0) {
      suggestionBoxRef.current.style.display = 'none';
      return;
    }
    
    // Update the suggestions list
    suggestionsRef.current = matches;
    selectedSuggestionRef.current = 0;
    
    // Position and show the suggestion box
    const coords = getCaretCoordinates(textareaRef.current, cursorPos);
    suggestionBoxRef.current.style.left = `${coords.left}px`;
    suggestionBoxRef.current.style.top = `${coords.top + 20}px`;
    suggestionBoxRef.current.style.display = 'block';
    
    // Update the content of the suggestion box
    renderSuggestions();
  };
  
  // Helper function to get caret coordinates
  const getCaretCoordinates = (element, position) => {
    // Create a span as a measurement element
    const span = document.createElement('span');
    
    // Create a div to mimic textarea's layout
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.fontFamily = element.style.fontFamily;
    div.style.fontSize = element.style.fontSize;
    div.style.padding = element.style.padding;
    div.style.width = element.offsetWidth + 'px';
    
    // Get text up to caret position and add special character at cursor position
    const text = element.value.substring(0, position);
    div.textContent = text;
    span.textContent = '.'; // Placeholder for cursor
    div.appendChild(span);
    
    // Add to document to calculate
    document.body.appendChild(div);
    const coordinates = {
      top: element.offsetTop + span.offsetTop,
      left: element.offsetLeft + span.offsetLeft
    };
    
    // Clean up
    document.body.removeChild(div);
    
    return coordinates;
  };
  
  // Render the suggestions in the suggestion box
  const renderSuggestions = () => {
    if (!suggestionBoxRef.current) return;
    
    suggestionBoxRef.current.innerHTML = '';
    
    suggestionsRef.current.forEach((suggestion, index) => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = suggestion;
      
      if (index === selectedSuggestionRef.current) {
        div.classList.add('selected');
      }
      
      div.onclick = () => {
        applySuggestion(suggestion);
      };
      
      suggestionBoxRef.current.appendChild(div);
    });
  };
  
  // Apply the selected suggestion
  const applySuggestion = (suggestion) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const text = textareaRef.current.value;
    
    // Find the beginning of the current word
    let wordStart = cursorPos;
    while (wordStart > 0 && /[\w$]/.test(text.charAt(wordStart - 1))) {
      wordStart--;
    }
    
    // Replace the current word with the suggestion
    const newText = 
      text.substring(0, wordStart) + 
      suggestion + 
      text.substring(cursorPos);
    
    // Update the textarea and hide suggestions
    textareaRef.current.value = newText;
    
    // Calculate the new cursor position after the suggestion
    const newCursorPos = wordStart + suggestion.length;
    
    // Set the new cursor position
    textareaRef.current.selectionStart = newCursorPos;
    textareaRef.current.selectionEnd = newCursorPos;
    
    // Hide the suggestion box
    if (suggestionBoxRef.current) {
      suggestionBoxRef.current.style.display = 'none';
    }
    
    // Trigger the onChange callback
    onChange(newText);
    
    // Focus the textarea again
    textareaRef.current.focus();
  };
  
  // Handle key interactions with the suggestion box
  const handleKeyDown = (e) => {
    if (!suggestionBoxRef.current || suggestionBoxRef.current.style.display === 'none') {
      return;
    }
    
    const suggestions = suggestionsRef.current;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedSuggestionRef.current = (selectedSuggestionRef.current + 1) % suggestions.length;
        renderSuggestions();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedSuggestionRef.current = (selectedSuggestionRef.current - 1 + suggestions.length) % suggestions.length;
        renderSuggestions();
        break;
        
      case 'Tab':
      case 'Enter':
        if (suggestions.length > 0) {
          e.preventDefault();
          applySuggestion(suggestions[selectedSuggestionRef.current]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (suggestionBoxRef.current) {
          suggestionBoxRef.current.style.display = 'none';
        }
        break;
    }
  };
  
  // Set up event listeners
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Create a suggestion box if it doesn't exist
    if (!suggestionBoxRef.current) {
      const box = document.createElement('div');
      box.className = 'suggestion-box';
      box.style.display = 'none';
      box.style.position = 'absolute';
      box.style.zIndex = '1000';
      box.style.backgroundColor = isDarkMode ? '#2d2d2d' : 'white';
      box.style.border = '1px solid #ccc';
      box.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      box.style.maxHeight = '200px';
      box.style.overflow = 'auto';
      box.style.width = '200px';
      document.body.appendChild(box);
      suggestionBoxRef.current = box;
      
      // Add styles for suggestion items
      const style = document.createElement('style');
      style.textContent = `
        .suggestion-item {
          padding: 5px 10px;
          cursor: pointer;
          color: ${isDarkMode ? '#e0e0e0' : '#333'};
        }
        .suggestion-item:hover, .suggestion-item.selected {
          background-color: ${isDarkMode ? '#4d4d4d' : '#f0f0f0'};
        }
      `;
      document.head.appendChild(style);
    }
    
    // Set up event listeners
    textarea.addEventListener('input', showSuggestions);
    textarea.addEventListener('keydown', handleKeyDown);
    textarea.addEventListener('blur', () => {
      // Delay hiding the suggestion box to allow clicks on suggestions
      setTimeout(() => {
        if (suggestionBoxRef.current) {
          suggestionBoxRef.current.style.display = 'none';
        }
      }, 200);
    });
    
    // Initial value
    if (value) {
      textarea.value = value;
    }
    
    // Cleanup
    return () => {
      textarea.removeEventListener('input', showSuggestions);
      textarea.removeEventListener('keydown', handleKeyDown);
      
      // Remove the suggestion box when component unmounts
      if (suggestionBoxRef.current && document.body.contains(suggestionBoxRef.current)) {
        document.body.removeChild(suggestionBoxRef.current);
      }
    };
  }, [isDarkMode]);
  
  // Sync value change
  useEffect(() => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.value = value || '';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      placeholder={placeholder}
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
        caretColor: isDarkMode ? '#90caf9' : '#1976d2',
        tabSize: 2,
      }}
    />
  );
});

BasicEditor.displayName = 'BasicEditor';

export default BasicEditor;
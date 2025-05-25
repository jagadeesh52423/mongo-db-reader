/**
 * Parses a MongoDB query string based on the query type.
 * @param {string} queryToExecute The raw query string.
 * @param {string} queryType The type of MongoDB query (e.g., 'find', 'aggregate').
 * @returns {object|Array} The parsed query object or array.
 * @throws {Error} If the JSON is invalid or query string is empty for certain types.
 */
export const parseMongoQuery = (queryToExecute, queryType) => {
  let parsedQuery;

  // Ensure queryToExecute is not null or undefined before parsing
  const queryString = queryToExecute || '';

  try {
    if (queryType === 'find' || queryType === 'findOne' || queryType === 'count' || queryType === 'delete') {
      // For these types, an empty string can default to an empty object {}
      parsedQuery = queryString ? JSON.parse(queryString) : {};
    } else if (queryType === 'update') {
      // Requires a specific structure if not empty, otherwise a default structure
      parsedQuery = queryString ? JSON.parse(queryString) : { filter: {}, update: { $set: {} } };
    } else if (queryType === 'aggregate') {
      // Requires an array structure, defaults to empty array
      parsedQuery = queryString ? JSON.parse(queryString) : [];
    } else if (queryType === 'distinct') {
      // Requires a specific structure, defaults to a placeholder
      parsedQuery = queryString ? JSON.parse(queryString) : { field: '', filter: {} };
    } else if (queryType === 'insert') {
      // Cannot be empty, must be a valid JSON object or array of objects
      if (!queryString) {
        throw new Error('Insert query cannot be empty.');
      }
      parsedQuery = JSON.parse(queryString);
    } else {
      // Default for any other types, or if a new type is added without specific handling
      // This case should ideally not be reached if queryType is always one of the above
      parsedQuery = queryString ? JSON.parse(queryString) : {};
    }
  } catch (e) {
    // Re-throw with a more specific message if needed, or just let original error propagate
    throw new Error(`Invalid JSON for ${queryType} query: ${e.message}`);
  }

  return parsedQuery;
};

// splitQueries function is not defined as there's no existing logic for it in QueryEditor.js
// If it were needed, it would be:
// export const splitQueries = (queryText) => { /* ... logic ... */ };

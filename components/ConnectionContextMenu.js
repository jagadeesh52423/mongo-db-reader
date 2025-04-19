import React, { useContext, useEffect, useRef } from 'react';
import { ConnectionContext } from '../contexts/ConnectionContext';

const ConnectionContextMenu = ({ x, y, connectionId, isConnected, onClose, hasMultipleActiveConnections }) => {
  const {
    connectToDatabase,
    disconnectDatabase,
    disconnectAllDatabases,
    deleteConnection,
    editConnection,
    focusConnection,
    duplicateConnection,
  } = useContext(ConnectionContext);
  
  const menuRef = useRef(null);

  // Handle click outside to close the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle connection actions
  const handleConnect = async () => {
    await connectToDatabase(connectionId);
    onClose();
  };

  const handleDisconnect = () => {
    disconnectDatabase(connectionId);
    onClose();
  };

  const handleDisconnectAll = () => {
    disconnectAllDatabases();
    onClose();
  };

  const handleFocus = () => {
    focusConnection(connectionId);
    onClose();
  };

  const handleEdit = () => {
    editConnection(connectionId);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this connection?')) {
      deleteConnection(connectionId);
    }
    onClose();
  };

  const handleDuplicate = () => {
    duplicateConnection(connectionId);
    onClose();
  };

  // Calculate position, ensuring menu stays within viewport
  const style = {
    left: `${Math.min(x, window.innerWidth - 200)}px`,
    top: `${Math.min(y, window.innerHeight - 250)}px`
  };

  return (
    <div 
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 w-48"
      style={style}
      ref={menuRef}
    >
      <ul className="text-sm">
        {!isConnected ? (
          <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center" onClick={handleConnect}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect
          </li>
        ) : (
          <>
            <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center" onClick={handleFocus}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Focus
            </li>
            <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center" onClick={handleDisconnect}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Disconnect
            </li>
            {hasMultipleActiveConnections && (
              <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center" onClick={handleDisconnectAll}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Disconnect All
              </li>
            )}
          </>
        )}
        
        <li className="border-t border-gray-700 my-1"></li>
        
        <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center" onClick={handleEdit}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </li>
        <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center" onClick={handleDuplicate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Duplicate
        </li>
        <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex items-center text-red-400" onClick={handleDelete}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </li>
      </ul>
    </div>
  );
};

export default ConnectionContextMenu;
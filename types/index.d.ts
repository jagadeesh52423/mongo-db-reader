// Type definitions for MongoDB Reader application

// Connection types
export interface Connection {
  _id: string;
  name: string;
  uri: string;
  authType: 'None' | 'Basic' | 'IAM';
  username?: string;
  password?: string;
  options?: Record<string, string>;
  ssl?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActiveConnectionData {
  connectionName: string;
  databases: string[];
  activeDatabase?: string;
  collections?: string[];
  token: string;
}

export interface ActiveConnections {
  [connectionId: string]: ActiveConnectionData;
}

// MongoDB query types
export interface MongoQuery {
  collection: string;
  type: 'find' | 'findOne' | 'insert' | 'update' | 'delete' | 'count' | 'aggregate' | 'distinct';
  data: any;
  options?: QueryOptions;
  cursorOperations?: CursorOperation[];
}

export interface CursorOperation {
  method: string;
  args: string;
}

export interface QueryOptions {
  collection?: string;
  connectionId?: string;
  database?: string;
  pagination?: {
    page: number;
    pageSize: number;
  };
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  many?: boolean;
  hint?: Record<string, 1>;
  processingMode?: 'forEach' | 'map';
  forEach?: {
    paramName: string;
    body: string;
  };
  map?: {
    paramName: string;
    body: string;
  };
  comment?: string;
  maxTimeMS?: number;
  pretty?: boolean;
  allowDiskUse?: boolean;
  batchSize?: number;
  collation?: Record<string, any>;
  readConcern?: { level: string };
  readPreference?: string;
  noCursorTimeout?: boolean;
  returnKey?: boolean;
  showRecordId?: boolean;
}

// QueryResult types
export interface QueryResult {
  success: boolean;
  data?: any;
  message?: string;
  count?: number;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

// Editor types
export interface EditorRef {
  getCursorPosition: () => number;
  getSelection: () => {
    from: number;
    to: number;
    text: string;
  };
  getText: () => string;
  focus: () => void;
}

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

// Context types
export interface ConnectionContextValue {
  connections: Connection[];
  activeConnections: ActiveConnections;
  currentConnectionId: string | null;
  loading: boolean;
  connectToDatabase: (connectionId: string) => Promise<{ success: boolean; message?: string }>;
  disconnectDatabase: (connectionId: string) => Promise<void>;
  disconnectAllDatabases: () => Promise<void>;
  createConnection: (connectionData: Omit<Connection, '_id'>) => Promise<{ success: boolean; connectionId?: string; message?: string }>;
  deleteConnection: (connectionId: string) => Promise<{ success: boolean; message?: string }>;
  updateConnection: (connectionId: string, connectionData: Partial<Connection>) => Promise<{ success: boolean; message?: string }>;
  focusConnection: (connectionId: string) => void;
  executeQuery: (data: any, type: string, options: any) => Promise<QueryResult>;
  fetchDatabasesByToken: (connectionId: string) => Promise<string[]>;
  fetchCollectionsByToken: (connectionId: string, database: string) => Promise<string[]>;
  setActiveDatabase: (database: string, connectionId?: string) => void;
  getAllActiveConnections: () => ActiveConnections;
}
import * as fs from 'fs';
import * as path from 'path';

export class LocalStorageService {
  private dataDir: string;

  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    // Only try to create the data dir in local/non-production environments
    if (process.env.NODE_ENV !== 'production') {
      this.ensureDataDir();
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(tableName: string): string {
    return path.join(this.dataDir, `${tableName}.json`);
  }

  private readTable(tableName: string): any[] {
    if (process.env.NODE_ENV === 'production') return [];
    const filePath = this.getFilePath(tableName);
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`Error reading table ${tableName}:`, error);
      return [];
    }
  }

  private writeTable(tableName: string, data: any[]): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LocalStorageService cannot write in production — use USE_POSTGRES=true');
    }
    const filePath = this.getFilePath(tableName);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing table ${tableName}:`, error);
      throw error;
    }
  }

  async put(tableName: string, item: any) {
    const data = this.readTable(tableName);
    
    // Remove existing item with same id if exists
    const existingIndex = data.findIndex(d => d.id === item.id);
    if (existingIndex >= 0) {
      data[existingIndex] = item;
    } else {
      data.push(item);
    }
    
    this.writeTable(tableName, data);
    return { success: true };
  }

  async get(tableName: string, key: any) {
    const data = this.readTable(tableName);
    return data.find(item => {
      return Object.keys(key).every(k => item[k] === key[k]);
    });
  }

  async scan(tableName: string, filterExpression?: string, expressionAttributeValues?: any, expressionAttributeNames?: any) {
    const data = this.readTable(tableName);
    
    if (!filterExpression) {
      return data;
    }

    // Resolve attribute name aliases (e.g., #role -> role, #status -> status)
    const resolveAttrName = (name: string): string => {
      if (expressionAttributeNames && expressionAttributeNames[name]) {
        return expressionAttributeNames[name];
      }
      return name;
    };

    // Filter by email
    if (filterExpression.includes('email = :email') && expressionAttributeValues?.[':email']) {
      return data.filter((item: any) => item.email === expressionAttributeValues[':email']);
    }
    
    // Filter by phone
    if (filterExpression.includes('phone = :phone') && expressionAttributeValues?.[':phone']) {
      return data.filter((item: any) => item.phone === expressionAttributeValues[':phone']);
    }

    // Filter by userId
    if (filterExpression.includes('userId = :userId') && expressionAttributeValues?.[':userId']) {
      return data.filter((item: any) => item.userId === expressionAttributeValues[':userId']);
    }

    // Filter by farmerId
    if (filterExpression.includes('farmerId = :farmerId') && expressionAttributeValues?.[':farmerId']) {
      return data.filter((item: any) => item.farmerId === expressionAttributeValues[':farmerId']);
    }

    // Filter by role (handles both 'role = :role' and '#role = :role')
    if ((filterExpression.includes('role = :role') || filterExpression.includes('#role = :role')) && expressionAttributeValues?.[':role']) {
      return data.filter((item: any) => item.role === expressionAttributeValues[':role']);
    }

    // Fallback: return all data
    return data;
  }

  async query(tableName: string, keyConditionExpression: string, expressionAttributeValues: any) {
    // For simplicity, treat query like scan with filters
    return this.scan(tableName, keyConditionExpression, expressionAttributeValues);
  }

  async update(tableName: string, key: any, updateExpression: string, expressionAttributeValues: any, expressionAttributeNames?: any) {
    const data = this.readTable(tableName);
    const itemIndex = data.findIndex((item: any) => {
      return Object.keys(key).every(k => item[k] === key[k]);
    });

    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    const item = { ...data[itemIndex] };

    // Parse SET expression: "SET field1 = :val1, field2 = :val2"
    const setMatch = updateExpression.match(/SET (.+)/i);
    if (setMatch) {
      const assignments = setMatch[1].split(',').map((s: string) => s.trim());
      for (const assignment of assignments) {
        const eqIdx = assignment.indexOf('=');
        if (eqIdx === -1) continue;
        let fieldPart = assignment.substring(0, eqIdx).trim();
        const valuePart = assignment.substring(eqIdx + 1).trim();

        // Resolve attribute name alias
        if (expressionAttributeNames && expressionAttributeNames[fieldPart]) {
          fieldPart = expressionAttributeNames[fieldPart];
        }

        // Get value
        const value = expressionAttributeValues[valuePart];
        if (value !== undefined) {
          item[fieldPart] = value;
        }
      }
    } else {
      // Fallback: merge all expression attribute values
      Object.keys(expressionAttributeValues).forEach(key => {
        const attrName = key.replace(':', '');
        item[attrName] = expressionAttributeValues[key];
      });
    }

    item.updatedAt = new Date().toISOString();
    data[itemIndex] = item;
    this.writeTable(tableName, data);
    
    return item;
  }

  async delete(tableName: string, key: any) {
    try {
      const data = this.readTable(tableName);
      console.log(`🗑️ Deleting from ${tableName} with key:`, key);
      console.log(`📊 Current data count: ${data.length}`);
      
      const filteredData = data.filter(item => {
        // Check if all key properties match
        const matches = Object.keys(key).every(k => item[k] === key[k]);
        return !matches; // Keep items that DON'T match
      });
      
      console.log(`📊 After delete count: ${filteredData.length}`);
      console.log(`✅ Deleted ${data.length - filteredData.length} item(s)`);
      
      this.writeTable(tableName, filteredData);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error deleting from ${tableName}:`, error);
      throw error;
    }
  }
}

export const localStorageService = new LocalStorageService();
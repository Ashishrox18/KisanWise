import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_DEMO_USERS = [
  {
    id: "d3c06f60-3279-4928-90df-b334ef4432fd",
    email: "farmer@gmail.com",
    password: "$2a$10$XR8CKq4TlnpGmA8XRy6SdeZKLeLpzMRKrU7wHPb1OkREgwcr5zcji",
    name: "Ramesh Patel (Farmer)",
    role: "farmer",
    phone: "+919876543210",
    phoneVerified: true,
    emailVerified: true,
    profile: {
      location: "Pune, Maharashtra",
      farmSize: 12
    },
    createdAt: "2026-10-15T12:40:45.197Z",
    updatedAt: "2026-10-15T12:40:45.198Z"
  },
  {
    id: "028ad378-50c7-4538-b2b0-00849a42b679",
    email: "buyer@gmail.com",
    password: "$2a$10$nC7QGKYxcAM9GqAPwgnJc.SVnTcJIuF1hEY6HtqZnsjWt3Hi.wJXK",
    name: "AgroCorp Buyers Ltd",
    role: "buyer",
    phone: "+919876543211",
    phoneVerified: true,
    emailVerified: true,
    profile: {
      location: "Pune, Maharashtra",
      companyName: "AgroCorp Buyers Ltd"
    },
    createdAt: "2026-10-15T12:40:45.344Z",
    updatedAt: "2026-10-15T12:40:45.344Z"
  },
  {
    id: "e3a4053e-bbf7-4740-8201-ec16cc140e4e",
    email: "admin@krishiera.com",
    password: "$2a$10$rXtM3ni2zuQ40LqkW34kKeCtPSAGPPved6BQ1lykFvZ35UcNkqIwy",
    name: "System Admin",
    role: "admin",
    phone: "+919876543212",
    phoneVerified: true,
    emailVerified: true,
    profile: {
      location: "Pune, Maharashtra"
    },
    createdAt: "2026-10-15T12:40:45.492Z",
    updatedAt: "2026-10-15T12:40:45.492Z"
  }
];

export class LocalStorageService {
  private dataDir: string;
  private memoryStore: Map<string, any[]> = new Map([
    ['users', [...DEFAULT_DEMO_USERS]],
    ['crops', []],
    ['orders', []],
    ['quotes', []],
    ['offers', []],
    ['notifications', []],
    ['invoices', []],
  ]);

  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.ensureDataDir();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch {
      // Ignored on read-only serverless environments like Vercel
    }
  }

  private getFilePath(tableName: string): string {
    return path.join(this.dataDir, `${tableName}.json`);
  }

  private readTable(tableName: string): any[] {
    const memoryData = this.memoryStore.get(tableName);
    if (memoryData && memoryData.length > 0) {
      return memoryData;
    }

    try {
      const filePath = this.getFilePath(tableName);
      if (fs.existsSync(filePath)) {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.memoryStore.set(tableName, fileData);
        return fileData;
      }
    } catch {
      // Fall through to memoryStore
    }
    return memoryData || [];
  }

  private writeTable(tableName: string, data: any[]): void {
    this.memoryStore.set(tableName, data);
    try {
      const filePath = this.getFilePath(tableName);
      if (fs.existsSync(path.dirname(filePath))) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
    } catch {
      // Read-only filesystem fallback on Vercel
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

    // Filter by buyerId
    if (filterExpression.includes('buyerId = :buyerId') && expressionAttributeValues?.[':buyerId']) {
      return data.filter((item: any) => item.buyerId === expressionAttributeValues[':buyerId']);
    }

    // Filter by cropId
    if (filterExpression.includes('cropId = :cropId') && expressionAttributeValues?.[':cropId']) {
      return data.filter((item: any) => item.cropId === expressionAttributeValues[':cropId']);
    }

    // Filter by status
    if (filterExpression.includes('status = :status') && expressionAttributeValues?.[':status']) {
      return data.filter((item: any) => item.status === expressionAttributeValues[':status']);
    }

    return data;
  }

  async query(tableName: string, keyConditionExpression: string, expressionAttributeValues: any) {
    return this.scan(tableName, keyConditionExpression, expressionAttributeValues);
  }

  async update(tableName: string, key: any, updateExpression: string, expressionAttributeValues: any, expressionAttributeNames?: any) {
    const item = await this.get(tableName, key);
    if (!item) {
      throw new Error('Item not found');
    }

    // Simple update logic
    if (updateExpression.includes('SET')) {
      const setPart = updateExpression.replace('SET', '').trim();
      const assignments = setPart.split(',').map(s => s.trim());

      assignments.forEach(assignment => {
        const [fieldWithAlias, valueAlias] = assignment.split('=').map(s => s.trim());
        let field = fieldWithAlias;
        if (expressionAttributeNames && expressionAttributeNames[fieldWithAlias]) {
          field = expressionAttributeNames[fieldWithAlias];
        }

        if (expressionAttributeValues[valueAlias] !== undefined) {
          item[field] = expressionAttributeValues[valueAlias];
        }
      });

      item.updatedAt = new Date().toISOString();
      await this.put(tableName, item);
    }

    return item;
  }

  async delete(tableName: string, key: any) {
    const data = this.readTable(tableName);
    const filtered = data.filter(item => {
      return !Object.keys(key).every(k => item[k] === key[k]);
    });
    this.writeTable(tableName, filtered);
    return { success: true };
  }
}

export const localStorageService = new LocalStorageService();
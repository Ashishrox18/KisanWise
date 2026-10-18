import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { localStorageService } from '../local-storage.service';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

type StorageBackend = 'local' | 'dynamodb';

export class DynamoDBService {
  private get backend(): StorageBackend {
    if (process.env.USE_LOCAL_STORAGE === 'true') return 'local';
    return 'dynamodb';
  }

  async put(tableName: string, item: any) {
    if (this.backend === 'local')    return localStorageService.put(tableName, item);

    const command = new PutCommand({ TableName: tableName, Item: item });
    return docClient.send(command);
  }

  async get(tableName: string, key: any) {
    if (this.backend === 'local')    return localStorageService.get(tableName, key);

    const command = new GetCommand({ TableName: tableName, Key: key });
    const response = await docClient.send(command);
    return response.Item;
  }

  async query(tableName: string, keyConditionExpression: string, expressionAttributeValues: any) {
    if (this.backend === 'local')    return localStorageService.query(tableName, keyConditionExpression, expressionAttributeValues);

    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    const response = await docClient.send(command);
    return response.Items || [];
  }

  async update(tableName: string, key: any, updateExpression: string, expressionAttributeValues: any, expressionAttributeNames?: any) {
    if (this.backend === 'local')    return localStorageService.update(tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames);

    const params: any = {
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;

    const command = new UpdateCommand(params);
    const response = await docClient.send(command);
    return response.Attributes;
  }

  async delete(tableName: string, key: any) {
    if (this.backend === 'local')    return localStorageService.delete(tableName, key);

    const command = new DeleteCommand({ TableName: tableName, Key: key });
    return docClient.send(command);
  }

  async scan(tableName: string, filterExpression?: string, expressionAttributeValues?: any, expressionAttributeNames?: any) {
    if (this.backend === 'local')    return localStorageService.scan(tableName, filterExpression, expressionAttributeValues, expressionAttributeNames);

    const params: any = { TableName: tableName };
    if (filterExpression)           params.FilterExpression = filterExpression;
    if (expressionAttributeValues)  params.ExpressionAttributeValues = expressionAttributeValues;
    if (expressionAttributeNames)   params.ExpressionAttributeNames = expressionAttributeNames;

    const command = new ScanCommand(params);
    const response = await docClient.send(command);
    return response.Items || [];
  }
}

export const dynamoDBService = new DynamoDBService();

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { dynamoDBService } from '../services/firestore.service';

export class AdminController {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const users = await dynamoDBService.scan('users');
      const transactions = await dynamoDBService.scan(process.env.DYNAMODB_TRANSACTIONS_TABLE!);

      const usersByRole = users.reduce((acc: any, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      const thisMonth = transactions.filter((t: any) => {
        const date = new Date(t.createdAt);
        const now = new Date();
        return date.getMonth() === now.getMonth();
      });

      const totalVolume = thisMonth.reduce((sum: number, t: any) => sum + t.amount, 0);

      res.json({
        stats: {
          totalUsers: users.length,
          transactionVolume: totalVolume,
          activeRegions: 12,
          systemHealth: 99.8,
        },
        userDistribution: usersByRole,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

  async getSystemHealth(req: AuthRequest, res: Response) {
    try {
      // Mock system health data
      const health = {
        status: 'healthy',
        uptime: 99.8,
        services: [
          { name: 'API Gateway', status: 'healthy', uptime: 99.9, latency: 45 },
          { name: 'AI/ML Services', status: 'healthy', uptime: 99.8, latency: 120 },
          { name: 'Database', status: 'healthy', uptime: 99.9, latency: 12 },
          { name: 'IoT Core', status: 'warning', uptime: 98.5, latency: 85 },
        ],
        metrics: {
          cpu: 68,
          memory: 71,
          networkIO: 2.8,
        },
      };

      res.json({ health });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch system health' });
    }
  }

  async getMetrics(req: AuthRequest, res: Response) {
    try {
      const { timeRange } = req.query;

      // Mock performance metrics
      const metrics = {
        performance: [
          { time: '00:00', cpu: 45, memory: 62, requests: 1200 },
          { time: '04:00', cpu: 38, memory: 58, requests: 800 },
          { time: '08:00', cpu: 72, memory: 75, requests: 3500 },
          { time: '12:00', cpu: 85, memory: 82, requests: 4200 },
          { time: '16:00', cpu: 68, memory: 71, requests: 2800 },
          { time: '20:00', cpu: 52, memory: 65, requests: 1800 },
        ],
        keyMetrics: [
          { name: 'API Response Time', value: '45ms', status: 'good' },
          { name: 'Error Rate', value: '0.02%', status: 'good' },
          { name: 'Throughput', value: '125K req/hr', status: 'good' },
        ],
      };

      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  async getUsers(req: AuthRequest, res: Response) {
    try {
      const { role, limit = 50 } = req.query;

      let users = await dynamoDBService.scan('users');

      if (role) {
        users = users.filter((u: any) => u.role === role);
      }

      users = users.slice(0, Number(limit));

      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async getAnalytics(req: AuthRequest, res: Response) {
    try {
      // Mock analytics data
      const analytics = {
        userGrowth: [
          { month: 'Jan', farmers: 8500, buyers: 450, transporters: 120 },
          { month: 'Feb', farmers: 9200, buyers: 480, transporters: 135 },
          { month: 'Mar', farmers: 10100, buyers: 520, transporters: 145 },
          { month: 'Apr', farmers: 11000, buyers: 560, transporters: 158 },
          { month: 'May', farmers: 11800, buyers: 590, transporters: 165 },
          { month: 'Jun', farmers: 12458, buyers: 625, transporters: 178 },
        ],
        transactionVolume: [
          { month: 'Jan', volume: 28 },
          { month: 'Feb', volume: 32 },
          { month: 'Mar', volume: 35 },
          { month: 'Apr', volume: 38 },
          { month: 'May', volume: 42 },
          { month: 'Jun', volume: 45 },
        ],
        regionalStats: [
          { region: 'Punjab', users: 3200, transactions: 12.5, growth: 15 },
          { region: 'Haryana', users: 2800, transactions: 10.2, growth: 12 },
          { region: 'Gujarat', users: 2100, transactions: 8.5, growth: 18 },
        ],
      };

      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
}

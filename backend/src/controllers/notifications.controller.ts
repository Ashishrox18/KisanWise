import { Request, Response } from 'express';
import { dynamoDBService } from '../services/firestore.service';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export class NotificationsController {
  private static get NOTIFICATIONS_TABLE(): string {
    return 'notifications';
  }

  // Get notifications for a user
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      console.log('🔔 Getting notifications for user:', userId);

      // Get all items from the table
      const allItems = await dynamoDBService.scan(NotificationsController.NOTIFICATIONS_TABLE);
      console.log('📊 Total items in table:', allItems.length);
      
      // Filter for notifications belonging to this user
      const notifications = allItems.filter(item => 
        item.type === 'notification' && item.userId === userId
      );
      console.log('📋 User notifications found:', notifications.length);

      // Sort by creation date (newest first)
      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ notifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  // Mark notification as read
  async markNotificationAsRead(req: AuthRequest, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.user!.id;

      const notification = await dynamoDBService.get(NotificationsController.NOTIFICATIONS_TABLE, { id: notificationId });

      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const updatedNotification = {
        ...notification,
        read: true,
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(NotificationsController.NOTIFICATIONS_TABLE, updatedNotification);

      res.json({ success: true });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get all items and filter for unread notifications for this user
      const allItems = await dynamoDBService.scan(NotificationsController.NOTIFICATIONS_TABLE);
      
      // Filter for unread notifications belonging to this user
      const notifications = allItems.filter(item => 
        item.type === 'notification' && 
        item.userId === userId && 
        item.read === false
      );

      // Mark all as read
      const updatePromises = notifications.map(notification => {
        const updatedNotification = {
          ...notification,
          read: true,
          readAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return dynamoDBService.put(NotificationsController.NOTIFICATIONS_TABLE, updatedNotification);
      });

      await Promise.all(updatePromises);

      res.json({ success: true, updated: notifications.length });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  // Delete a single notification
  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.user!.id;

      const notification = await dynamoDBService.get(NotificationsController.NOTIFICATIONS_TABLE, { id: notificationId });

      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await dynamoDBService.delete(NotificationsController.NOTIFICATIONS_TABLE, { id: notificationId });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  // Clear all notifications for a user
  async clearAllNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get all items and filter for notifications for this user
      const allItems = await dynamoDBService.scan(NotificationsController.NOTIFICATIONS_TABLE);
      
      // Filter for notifications belonging to this user
      const notifications = allItems.filter(item => 
        item.type === 'notification' && 
        item.userId === userId
      );

      // Delete all notifications
      const deletePromises = notifications.map(notification => 
        dynamoDBService.delete(NotificationsController.NOTIFICATIONS_TABLE, { id: notification.id })
      );

      await Promise.all(deletePromises);

      res.json({ success: true, deleted: notifications.length });
    } catch (error) {
      console.error('Clear all notifications error:', error);
      res.status(500).json({ error: 'Failed to clear all notifications' });
    }
  }

  // Create a notification (internal method)
  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: 'procurement_request' | 'farmer_listing' | 'quote' | 'offer' | 'award' | 'booking';
    relatedId?: string;
    link?: string;
  }) {
    try {
      const notification = {
        id: uuidv4(),
        userId: data.userId,
        title: data.title,
        message: data.message,
        notificationType: data.type,
        relatedId: data.relatedId,
        link: data.link,
        read: false,
        type: 'notification', // For database filtering
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dynamoDBService.put(NotificationsController.NOTIFICATIONS_TABLE, notification);
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  static async sendNotificationToUsers(userIds: string[], data: {
    title: string;
    message: string;
    type: 'procurement_request' | 'farmer_listing' | 'quote' | 'offer' | 'award' | 'booking';
    relatedId?: string;
    link?: string;
  }) {
    try {
      const promises = userIds.map(userId => 
        NotificationsController.createNotification({
          ...data,
          userId
        })
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Send notification to users error:', error);
      throw error;
    }
  }

  // Send notification to all users of a specific role
  static async sendNotificationToRole(role: string, data: {
    title: string;
    message: string;
    type: 'procurement_request' | 'farmer_listing' | 'quote' | 'offer' | 'award' | 'booking';
    relatedId?: string;
    link?: string;
  }) {
    try {
      // Get all users with the specified role
      const users = await dynamoDBService.scan(
        'users',
        '#role = :role',
        { ':role': role },
        { '#role': 'role' }
      );

      const userIds = users.map(user => user.id);
      await NotificationsController.sendNotificationToUsers(userIds, data);
    } catch (error) {
      console.error('Send notification to role error:', error);
      throw error;
    }
  }
}
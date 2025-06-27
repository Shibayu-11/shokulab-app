// src/services/notificationService.js
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';
import { NOTIFICATION_TYPES } from '../utils/notificationTypes';

// 通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.setupListeners();
  }

  // 通知権限をリクエスト
  async requestNotificationPermissions() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('通知権限が拒否されました');
        return false;
      }
      
      // プッシュトークンを取得
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      console.log('プッシュトークン取得:', token);
      
      return true;
    } catch (error) {
      console.error('通知権限エラー:', error);
      return false;
    }
  }

  // デバイストークンをサーバーに登録
  async registerDeviceToken(userId) {
    if (!this.expoPushToken || !userId) return;

    try {
      const { error } = await supabase
        .from('user_devices')
        .upsert([
          {
            user_id: userId,
            device_token: this.expoPushToken,
            platform: Platform.OS,
            last_active: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('デバイストークン登録エラー:', error);
      } else {
        console.log('デバイストークン登録成功');
      }
    } catch (error) {
      console.error('デバイストークン登録エラー:', error);
    }
  }

  // リスナーの設定
  setupListeners() {
    // フォアグラウンド通知リスナー
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('フォアグラウンド通知受信:', notification);
      this.handleForegroundNotification(notification);
    });

    // 通知タップリスナー
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('通知タップ:', response);
      this.handleNotificationTap(response);
    });
  }

  // フォアグラウンド通知の処理
  async handleForegroundNotification(notification) {
    const { title, body, data } = notification.request.content;
    
    // アプリ内通知として表示するかどうかの判定
    if (data?.showInApp !== false) {
      Alert.alert(
        title || '新しい通知',
        body || '',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '確認', 
            onPress: () => {
              if (data?.navigateTo) {
                // ナビゲーション処理（要実装）
                console.log('ナビゲート:', data.navigateTo);
              }
            }
          }
        ]
      );
    }
  }

  // 通知タップ時の処理
  handleNotificationTap(response) {
    const { data } = response.notification.request.content;
    
    if (data?.navigateTo) {
      // ナビゲーション処理（要実装）
      console.log('ナビゲート:', data.navigateTo);
    }
  }

  // アプリ内通知を作成
  async createInAppNotification(userId, type, title, body, data = {}) {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .insert([
          {
            user_id: userId,
            type,
            title,
            body,
            data,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('アプリ内通知作成エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('アプリ内通知作成エラー:', error);
      return false;
    }
  }

  // ローカル通知を送信
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // 即座に送信
      });
    } catch (error) {
      console.error('ローカル通知送信エラー:', error);
    }
  }

  // 通知設定をチェック
  async shouldShowNotification(userId, notificationType) {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // デフォルト設定で許可
        return true;
      }

      const settings = data.settings;
      
      // 全体的な通知設定をチェック
      if (!settings.pushNotificationsEnabled) {
        return false;
      }

      // 特定の通知タイプの設定をチェック
      const typeSettings = settings.notifications[notificationType];
      if (typeSettings && typeSettings.enabled === false) {
        return false;
      }

      // カテゴリ設定をチェック
      const notificationTypeInfo = Object.values(NOTIFICATION_TYPES)
        .find(type => type.id === notificationType);
      
      if (notificationTypeInfo) {
        const categorySettings = settings.categorySettings[notificationTypeInfo.category];
        if (categorySettings && categorySettings.enabled === false) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('通知設定チェックエラー:', error);
      return true; // エラー時はデフォルトで許可
    }
  }

  // コラボ申請通知を送信
  async sendCollaborationRequestNotification(targetUserId, requesterName, collaborationId) {
    const shouldShow = await this.shouldShowNotification(targetUserId, 'collaboration_request_received');
    
    if (shouldShow) {
      const title = 'コラボ申請を受信しました';
      const body = `${requesterName}さんからコラボ申請が届きました。`;
      
      // アプリ内通知を作成
      await this.createInAppNotification(
        targetUserId,
        'collaboration_request_received',
        title,
        body,
        {
          collaboration_id: collaborationId,
          requester_name: requesterName,
          navigateTo: 'Collaborations'
        }
      );
    }
  }

  // コラボ申請応答通知を送信
  async sendCollaborationResponseNotification(targetUserId, storeName, status, collaborationId) {
    const notificationType = status === 'approved' ? 
      'collaboration_request_approved' : 
      'collaboration_request_rejected';
    
    const shouldShow = await this.shouldShowNotification(targetUserId, notificationType);
    
    if (shouldShow) {
      const title = status === 'approved' ? 
        'コラボ申請が承認されました' : 
        'コラボ申請が拒否されました';
      const body = `${storeName}さんがあなたのコラボ申請を${status === 'approved' ? '承認' : '拒否'}しました。`;
      
      // アプリ内通知を作成
      await this.createInAppNotification(
        targetUserId,
        notificationType,
        title,
        body,
        {
          collaboration_id: collaborationId,
          store_name: storeName,
          status,
          navigateTo: 'Collaborations'
        }
      );
    }
  }

  // 新しいメッセージ通知を送信
  async sendNewMessageNotification(targetUserId, senderName, messagePreview, chatId) {
    const shouldShow = await this.shouldShowNotification(targetUserId, 'new_message');
    
    if (shouldShow) {
      const title = `${senderName}さんからメッセージ`;
      const body = messagePreview;
      
      // アプリ内通知を作成
      await this.createInAppNotification(
        targetUserId,
        'new_message',
        title,
        body,
        {
          sender_name: senderName,
          chat_id: chatId,
          navigateTo: 'Chat'
        }
      );
    }
  }

  // リスナーを削除
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// シングルトンインスタンス
const notificationService = new NotificationService();

export default notificationService;

// 便利な関数をエクスポート
export const requestNotificationPermissions = () => 
  notificationService.requestNotificationPermissions();

export const sendCollaborationRequestNotification = (targetUserId, requesterName, collaborationId) =>
  notificationService.sendCollaborationRequestNotification(targetUserId, requesterName, collaborationId);

export const sendCollaborationResponseNotification = (targetUserId, storeName, status, collaborationId) =>
  notificationService.sendCollaborationResponseNotification(targetUserId, storeName, status, collaborationId);

export const sendNewMessageNotification = (targetUserId, senderName, messagePreview, chatId) =>
  notificationService.sendNewMessageNotification(targetUserId, senderName, messagePreview, chatId);
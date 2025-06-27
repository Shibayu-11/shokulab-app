// src/contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      loadRecentNotifications();
      
      // リアルタイム通知更新の設定
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'in_app_notifications',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Notification change:', payload);
            
            if (payload.eventType === 'INSERT') {
              // 新しい通知が追加された
              setNotifications(prev => [payload.new, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else if (payload.eventType === 'UPDATE') {
              // 通知が更新された（既読など）
              setNotifications(prev => 
                prev.map(notif => 
                  notif.id === payload.new.id ? payload.new : notif
                )
              );
              
              // 既読になった場合は未読数を減らす
              if (payload.old.is_read === false && payload.new.is_read === true) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } else if (payload.eventType === 'DELETE') {
              // 通知が削除された
              setNotifications(prev => 
                prev.filter(notif => notif.id !== payload.old.id)
              );
              
              if (!payload.old.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // 未読通知数を取得
  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('未読通知数取得エラー:', error);
      } else {
        setUnreadCount(data?.length || 0);
      }
    } catch (error) {
      console.error('未読通知数取得エラー:', error);
    }
  };

  // 最近の通知を取得
  const loadRecentNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('通知取得エラー:', error);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 通知を既読にする
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('既読更新エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('既読更新エラー:', error);
      return false;
    }
  };

  // 全て既読にする
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('全既読更新エラー:', error);
        return false;
      }

      setUnreadCount(0);
      return true;
    } catch (error) {
      console.error('全既読更新エラー:', error);
      return false;
    }
  };

  // 通知を削除
  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('通知削除エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('通知削除エラー:', error);
      return false;
    }
  };

  // 新しい通知を作成（デバッグ用）
  const createTestNotification = async (type = 'test', title = 'テスト通知', body = 'これはテスト通知です') => {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .insert([
          {
            user_id: user.id,
            type,
            title,
            body,
            data: { test: true },
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('テスト通知作成エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('テスト通知作成エラー:', error);
      return false;
    }
  };

  const value = {
    unreadCount,
    notifications,
    loading,
    loadUnreadCount,
    loadRecentNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createTestNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
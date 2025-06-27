import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { NOTIFICATION_TYPES } from '../../utils/notificationTypes';

export default function InAppNotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // リアルタイム更新の設定
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
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  // 通知リストの読み込み
  const loadNotifications = async () => {
    try {
      let query = supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // フィルター適用
      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'read') {
        query = query.eq('is_read', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('通知取得エラー:', error);
        Alert.alert('エラー', '通知の取得に失敗しました');
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // リフレッシュ処理
  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // 通知を既読にする
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('既読更新エラー:', error);
      } else {
        // ローカル状態を更新
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  // 全て既読にする
  const markAllAsRead = async () => {
    Alert.alert(
      '全て既読にする',
      '未読の通知を全て既読にしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '既読にする',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('in_app_notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

              if (error) {
                Alert.alert('エラー', '処理に失敗しました');
              } else {
                loadNotifications();
                Alert.alert('完了', '全ての通知を既読にしました');
              }
            } catch (error) {
              Alert.alert('エラー', '処理に失敗しました');
            }
          }
        }
      ]
    );
  };

  // 通知削除
  const deleteNotification = async (notificationId) => {
    Alert.alert(
      '通知削除',
      'この通知を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('in_app_notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', user.id);

              if (error) {
                Alert.alert('エラー', '削除に失敗しました');
              } else {
                setNotifications(prev =>
                  prev.filter(notification => notification.id !== notificationId)
                );
              }
            } catch (error) {
              Alert.alert('エラー', '削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  // 通知タップ時の処理
  const handleNotificationPress = (notification) => {
    // 未読の場合は既読にする
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // 通知タイプに応じてナビゲーション
    const { type, data } = notification;

    switch (type) {
      case NOTIFICATION_TYPES.COLLABORATION_REQUEST_RECEIVED.id:
      case NOTIFICATION_TYPES.COLLABORATION_REQUEST_APPROVED.id:
      case NOTIFICATION_TYPES.COLLABORATION_REQUEST_REJECTED.id:
        navigation.navigate('Requests');
        break;

      case NOTIFICATION_TYPES.NEW_MESSAGE.id:
        if (data?.senderId && data?.senderName) {
          navigation.navigate('Chat', {
            screen: 'ChatDetail',
            params: {
              receiverId: data.senderId,
              receiverName: data.senderName
            }
          });
        } else {
          navigation.navigate('Chat');
        }
        break;

      case NOTIFICATION_TYPES.CONTRACT_RECEIVED.id:
        if (data?.contractId) {
          navigation.navigate('ContractDetail', { contractId: data.contractId });
        }
        break;

      case NOTIFICATION_TYPES.PAYMENT_COMPLETED.id:
      case NOTIFICATION_TYPES.PAYMENT_FAILED.id:
        // 決済履歴画面への遷移（実装時）
        Alert.alert('お知らせ', '決済履歴画面は近日実装予定です');
        break;

      case NOTIFICATION_TYPES.VERIFICATION_APPROVED.id:
      case NOTIFICATION_TYPES.VERIFICATION_REJECTED.id:
        navigation.navigate('Profile');
        break;

      default:
        console.log('Unknown notification type:', type);
    }
  };

  // 通知アイコンの取得
  const getNotificationIcon = (type) => {
    const notificationType = Object.values(NOTIFICATION_TYPES).find(nt => nt.id === type);
    
    switch (notificationType?.category) {
      case 'collaboration': return '🤝';
      case 'chat': return '💬';
      case 'payment': return '💳';
      case 'verification': return '🛡️';
      case 'matching': return '🎯';
      case 'event': return '🎉';
      case 'system': return '⚙️';
      default: return '📱';
    }
  };

  // 通知タイムスタンプのフォーマット
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      return diffMinutes < 1 ? 'たった今' : `${diffMinutes}分前`;
    } else if (diffDays < 1) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 通知アイテムのレンダリング
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => deleteNotification(item.id)}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
        {!item.is_read && <View style={styles.unreadBadge} />}
      </View>

      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !item.is_read && styles.unreadTitle
        ]}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTimestamp(item.created_at)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(item.id)}
      >
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // フィルターボタンのレンダリング
  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: '全て' },
        { key: 'unread', label: '未読' },
        { key: 'read', label: '既読' }
      ].map(filterOption => (
        <TouchableOpacity
          key={filterOption.key}
          style={[
            styles.filterButton,
            filter === filterOption.key && styles.activeFilterButton
          ]}
          onPress={() => {
            setFilter(filterOption.key);
            setLoading(true);
            setTimeout(() => loadNotifications(), 100);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            filter === filterOption.key && styles.activeFilterButtonText
          ]}>
            {filterOption.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 空状態の表示
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📫</Text>
      <Text style={styles.emptyTitle}>
        {filter === 'unread' ? '未読の通知はありません' :
         filter === 'read' ? '既読の通知はありません' :
         '通知はありません'}
      </Text>
      <Text style={styles.emptyDescription}>
        {filter === 'all' 
          ? 'コラボ申請やメッセージなどの重要な通知がここに表示されます'
          : '他のフィルターを試してみてください'
        }
      </Text>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllReadButton}>全て既読</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderFilterButtons()}

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={loading ? null : renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  markAllReadButton: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  
  // フィルター
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeFilterButtonText: {
    color: '#fff',
  },

  // 通知リスト
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'flex-start',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    position: 'relative',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: 'bold',
  },

  // 空状態
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
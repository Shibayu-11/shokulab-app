import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function CollaborationRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, activeTab]);

  // CollaborationRequestsScreen.js の fetchRequests 関数を修正

const fetchRequests = async () => {
  if (!user) return;

  try {
    setLoading(true);

    if (activeTab === 'received') {
      // Step 1: 自分の店舗IDを取得
      const { data: myStores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id);

      if (storesError) {
        console.error('Error fetching my stores:', storesError);
        setReceivedRequests([]);
        return;
      }

      if (!myStores || myStores.length === 0) {
        setReceivedRequests([]);
        return;
      }

      const storeIds = myStores.map(store => store.id);
      
      // 🔧 修正: requester_store_id を削除
      const { data: requests, error: requestsError } = await supabase
        .from('collaboration_requests')
        .select('id, requester_id, requested_store_id, message, status, created_at, responded_at')
        .in('requested_store_id', storeIds)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching received requests:', requestsError);
        setReceivedRequests([]);
        return;
      }

      if (!requests || requests.length === 0) {
        setReceivedRequests([]);
        return;
      }

      // 🔧 修正: 申請者の店舗情報を requester_id から取得
      const requesterIds = requests
        .map(req => req.requester_id)
        .filter(id => id && id !== null);

      let requesterStores = [];
      if (requesterIds.length > 0) {
        const { data: stores, error: storesDataError } = await supabase
          .from('stores')
          .select('id, name, category, area, logo_url, description, exterior_url, user_id')
          .in('user_id', requesterIds);
        
        if (!storesDataError && stores) {
          requesterStores = stores;
        }
      }

      // 🔧 修正: データを手動で結合
      const requestsWithStores = requests.map(request => ({
        ...request,
        requester_store: requesterStores.find(store => store.user_id === request.requester_id) || null
      }));

      setReceivedRequests(requestsWithStores);

    } else {
      // 🔧 修正: 送信済み申請の取得
      const { data: requests, error: requestsError } = await supabase
        .from('collaboration_requests')
        .select('id, requester_id, requested_store_id, message, status, created_at, responded_at')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching sent requests:', requestsError);
        setSentRequests([]);
        return;
      }

      if (!requests || requests.length === 0) {
        setSentRequests([]);
        return;
      }

      // 申請先の店舗情報を取得
      const requestedStoreIds = requests
        .map(req => req.requested_store_id)
        .filter(id => id && id !== null);

      let storesData = [];
      if (requestedStoreIds.length > 0) {
        const { data: stores, error: storesDataError } = await supabase
          .from('stores')
          .select('id, name, category, area, logo_url, description, exterior_url, user_id')
          .in('id', requestedStoreIds);
        
        if (!storesDataError && stores) {
          storesData = stores;
        }
      }

      // データを手動で結合
      const requestsWithStores = requests.map(request => ({
        ...request,
        requested_store: storesData.find(store => store.id === request.requested_store_id) || null
      }));

      setSentRequests(requestsWithStores);
    }
  } catch (error) {
    console.error('Fetch requests error:', error);
    setReceivedRequests([]);
    setSentRequests([]);
  } finally {
    setLoading(false);
  }
};

  // 店舗詳細画面への遷移
  const handleStorePress = (store) => {
    if (!store) {
      Alert.alert('エラー', '店舗情報が見つかりません');
      return;
    }
    
    navigation.navigate('Home', {
      screen: 'StoreDetail',
      params: { store }
    });
  };

  // リフレッシュ処理
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  // 申請を承認
  const handleApprove = async (request) => {
    Alert.alert(
      '申請承認',
      `${request.requester_store?.name || '申請者'}のコラボ申請を承認しますか？\n\n承認後、チャットでやり取りできるようになります。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '承認',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('collaboration_requests')
                .update({ 
                  status: 'approved',
                  responded_at: new Date().toISOString()
                })
                .eq('id', request.id);

              if (error) {
                Alert.alert('エラー', '承認処理に失敗しました');
              } else {
                Alert.alert('承認完了', 'コラボ申請を承認しました！', [
                  {
                    text: 'チャットを開始',
                    onPress: () => navigation.navigate('Chat', {
                      screen: 'ChatDetail',
                      params: {
                        receiverId: request.requester_id,
                        receiverName: request.requester_store?.name || '申請者',
                        receiverStore: request.requester_store
                      }
                    })
                  },
                  { text: 'OK' }
                ]);
                fetchRequests();
              }
            } catch (error) {
              Alert.alert('エラー', '承認処理に失敗しました');
            }
          }
        }
      ]
    );
  };

  // 申請を拒否
  const handleReject = async (request) => {
    Alert.alert(
      '申請拒否',
      `${request.requester_store?.name || '申請者'}のコラボ申請を拒否しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '拒否',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('collaboration_requests')
                .update({ 
                  status: 'rejected',
                  responded_at: new Date().toISOString()
                })
                .eq('id', request.id);

              if (error) {
                Alert.alert('エラー', '拒否処理に失敗しました');
              } else {
                Alert.alert('処理完了', '申請を拒否しました');
                fetchRequests();
              }
            } catch (error) {
              Alert.alert('エラー', '拒否処理に失敗しました');
            }
          }
        }
      ]
    );
  };

  // 申請をキャンセル（送信済み申請）
  const handleCancel = async (request) => {
    Alert.alert(
      '申請キャンセル',
      `${request.requested_store?.name}への申請をキャンセルしますか？`,
      [
        { text: 'いいえ', style: 'cancel' },
        {
          text: 'キャンセル',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('collaboration_requests')
                .update({ status: 'cancelled' })
                .eq('id', request.id);

              if (error) {
                Alert.alert('エラー', 'キャンセル処理に失敗しました');
              } else {
                Alert.alert('キャンセル完了', '申請をキャンセルしました');
                fetchRequests();
              }
            } catch (error) {
              Alert.alert('エラー', 'キャンセル処理に失敗しました');
            }
          }
        }
      ]
    );
  };

  // ステータスラベルを取得
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return { text: '審査中', color: '#FF8C00' };
      case 'approved': return { text: '承認済み', color: '#28a745' };
      case 'rejected': return { text: '拒否', color: '#dc3545' };
      case 'cancelled': return { text: 'キャンセル', color: '#6c757d' };
      default: return { text: '不明', color: '#6c757d' };
    }
  };

  // 日時フォーマット
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // 受信した申請のアイテム
  const renderReceivedRequest = ({ item }) => {
    const statusInfo = getStatusLabel(item.status);
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.storeInfo}>
            <TouchableOpacity onPress={() => handleStorePress(item.requester_store)}>
              <Image
                source={{ 
                  uri: item.requester_store?.logo_url || 'https://via.placeholder.com/50x50?text=店舗' 
                }}
                style={styles.storeLogo}
                defaultSource={{ uri: 'https://via.placeholder.com/50x50?text=店舗' }}
              />
            </TouchableOpacity>
            <View style={styles.storeDetails}>
              <TouchableOpacity 
                onPress={() => handleStorePress(item.requester_store)}
                activeOpacity={0.7}
              >
                <Text style={[styles.storeName, styles.clickableStoreName]}>
                  {item.requester_store?.name || '店舗名未設定'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.storeCategory}>
                {item.requester_store?.category} • {item.requester_store?.area}
              </Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>

        <Text style={styles.messageText}>
          {item.message}
        </Text>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}
            >
              <Text style={styles.rejectButtonText}>拒否</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}
            >
              <Text style={styles.approveButtonText}>承認</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'approved' && (
          <View style={styles.approvedActions}>
            <TouchableOpacity
              style={styles.storeDetailButton}
              onPress={() => handleStorePress(item.requester_store)}
            >
              <Text style={styles.storeDetailButtonText}>🏪 店舗詳細</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', {
                screen: 'ChatDetail',
                params: {
                  receiverId: item.requester_id,
                  receiverName: item.requester_store?.name || '申請者',
                  receiverStore: item.requester_store
                }
              })}
            >
              <Text style={styles.chatButtonText}>💬 チャット</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // 送信した申請のアイテム
  const renderSentRequest = ({ item }) => {
    const statusInfo = getStatusLabel(item.status);
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.storeInfo}>
            <TouchableOpacity onPress={() => handleStorePress(item.requested_store)}>
              <Image
                source={{ 
                  uri: item.requested_store?.logo_url || 'https://via.placeholder.com/50x50?text=店舗' 
                }}
                style={styles.storeLogo}
                defaultSource={{ uri: 'https://via.placeholder.com/50x50?text=店舗' }}
              />
            </TouchableOpacity>
            <View style={styles.storeDetails}>
              <TouchableOpacity 
                onPress={() => handleStorePress(item.requested_store)}
                activeOpacity={0.7}
              >
                <Text style={[styles.storeName, styles.clickableStoreName]}>
                  {item.requested_store?.name || '店舗名未設定'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.storeCategory}>
                {item.requested_store?.category} • {item.requested_store?.area}
              </Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>

        <Text style={styles.messageText}>
          {item.message}
        </Text>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(item)}
          >
            <Text style={styles.cancelButtonText}>申請をキャンセル</Text>
          </TouchableOpacity>
        )}

        {item.status === 'approved' && (
          <View style={styles.approvedActions}>
            <TouchableOpacity
              style={styles.storeDetailButton}
              onPress={() => handleStorePress(item.requested_store)}
            >
              <Text style={styles.storeDetailButtonText}>🏪 店舗詳細</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', {
                screen: 'ChatDetail',
                params: {
                  receiverId: item.requested_store?.user_id,
                  receiverName: item.requested_store?.name,
                  receiverStore: item.requested_store
                }
              })}
            >
              <Text style={styles.chatButtonText}>💬 チャット</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // 空状態の表示
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>
        {activeTab === 'received' ? '📬' : '📤'}
      </Text>
      <Text style={styles.emptyTitle}>
        {activeTab === 'received' ? '受信した申請はありません' : '送信した申請はありません'}
      </Text>
      <Text style={styles.emptySubtext}>
        {activeTab === 'received' 
          ? 'ホーム画面であなたの店舗を見つけた他のオーナーからの申請がここに表示されます'
          : 'ホーム画面で他の店舗にコラボ申請を送ってみましょう'
        }
      </Text>
    </View>
  );

  const currentData = activeTab === 'received' ? receivedRequests : sentRequests;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>申請管理</Text>
      </View>

      {/* タブ */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            受信済み
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            送信済み
          </Text>
        </TouchableOpacity>
      </View>

      {/* コンテンツ */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : currentData.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={currentData}
          renderItem={activeTab === 'received' ? renderReceivedRequest : renderSentRequest}
          keyExtractor={(item) => item.id}
          style={styles.requestsList}
          contentContainerStyle={styles.requestsContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF8C00"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF8C00',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FF8C00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestsList: {
    flex: 1,
  },
  requestsContent: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  storeInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  storeLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clickableStoreName: {
    color: '#FF8C00',
    textDecorationLine: 'underline',
  },
  storeCategory: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  rejectButtonText: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: '#FF8C00',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#6c757d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: 'bold',
  },
  approvedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  storeDetailButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#FF8C00',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  storeDetailButtonText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
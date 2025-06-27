import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../services/supabase';

export default function HomeScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchStores();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .limit(20);

      if (error) {
        console.error('店舗取得エラー:', error);
        Alert.alert('エラー', '店舗情報の取得に失敗しました');
      } else {
        setStores(data || []);
      }
    } catch (error) {
      console.error('Fetch stores error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStores();
    setRefreshing(false);
  };

  const handleStorePress = (store) => {
    Alert.alert(
      store.name,
      `業態: ${store.category}\n地域: ${store.area}\n\n${store.description || '詳細情報はありません'}`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'コラボ申請', onPress: () => handleCollaborationRequest(store) }
      ]
    );
  };

  const handleCollaborationRequest = (store) => {
    Alert.alert(
      'コラボ申請',
      `${store.name}さんにコラボ申請を送信しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '送信', onPress: () => sendCollaborationRequest(store) }
      ]
    );
  };

  const sendCollaborationRequest = async (store) => {
    try {
      const { error } = await supabase
        .from('collaboration_requests')
        .insert([
          {
            requester_id: user.id,
            requested_id: store.owner_id,
            message: 'コラボレーションをお願いします！'
          }
        ]);

      if (error) {
        Alert.alert('エラー', 'コラボ申請の送信に失敗しました');
      } else {
        Alert.alert('送信完了', 'コラボ申請を送信しました！');
      }
    } catch (error) {
      console.error('Collaboration request error:', error);
      Alert.alert('エラー', 'コラボ申請の送信に失敗しました');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>食ラボ</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            ようこそ、{user?.email}さん！
          </Text>
          <Text style={styles.subtitleText}>
            大阪の飲食店オーナー同士でコラボしましょう
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>近くの店舗</Text>
        </View>

        {stores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>まだ登録された店舗がありません</Text>
            <Text style={styles.emptySubtext}>最初の店舗を登録してみませんか？</Text>
          </View>
        ) : (
          stores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={styles.storeCard}
              onPress={() => handleStorePress(store)}
            >
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeCategory}>{store.category}</Text>
                <Text style={styles.storeArea}>{store.area}</Text>
                {store.description && (
                  <Text style={styles.storeDescription} numberOfLines={2}>
                    {store.description}
                  </Text>
                )}
              </View>
              <View style={styles.collaborateButton}>
                <Text style={styles.collaborateText}>コラボしたい！</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  storeArea: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  storeDescription: {
    fontSize: 12,
    color: '#999',
  },
  collaborateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  collaborateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
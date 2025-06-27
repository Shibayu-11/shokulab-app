import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // 画面にフォーカスが当たった時にチャット一覧を更新
  useFocusEffect(
    React.useCallback(() => {
      loadChatRooms();
    }, [])
  );

  // メッセージタイプに応じた表示テキストを取得
  const getLastMessageDisplay = (message) => {
    switch (message.message_type) {
      case 'image':
        return '📷 画像を送信しました';
      case 'contract':
        return '📋 契約書を送信しました';
      case 'text':
      default:
        return message.content;
    }
  };

  // チャット一覧を取得
  const loadChatRooms = async () => {
    try {
      // Step 1: 自分が送信または受信したメッセージを取得
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at, message_type')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('メッセージ取得エラー:', messagesError);
        return;
      }

      if (!messagesData || messagesData.length === 0) {
        setChatRooms([]);
        return;
      }

      // Step 2: チャット相手のユーザーIDを抽出
      const otherUserIds = new Set();
      const chatMap = new Map();

      messagesData.forEach(message => {
        const otherUserId = message.sender_id === user.id 
          ? message.receiver_id 
          : message.sender_id;
        
        otherUserIds.add(otherUserId);

        // 最新メッセージを記録
        if (!chatMap.has(otherUserId)) {
          chatMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: getLastMessageDisplay(message),
            lastMessageTime: message.created_at,
            messageType: message.message_type,
          });
        }
      });

      // Step 3: チャット相手の店舗情報を取得
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('owner_id, name')
        .in('owner_id', Array.from(otherUserIds));

      if (storesError) {
        console.error('店舗情報取得エラー:', storesError);
      }

      // Step 4: チャット一覧を構築
      const chatRoomsArray = [];
      
      chatMap.forEach((chatData, userId) => {
        const store = storesData?.find(s => s.owner_id === userId);
        
        chatRoomsArray.push({
          userId: userId,
          name: store?.name || '店舗名未設定',
          storeName: store?.name || '店舗名未設定',
          lastMessage: chatData.lastMessage,
          lastMessageTime: chatData.lastMessageTime,
          messageType: chatData.messageType,
        });
      });

      // 最新メッセージ順にソート
      chatRoomsArray.sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );

      setChatRooms(chatRoomsArray);

    } catch (error) {
      console.error('チャット一覧取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // チャット画面に遷移
  const openChat = (chatRoom) => {
    navigation.navigate('ChatDetail', {
      receiverId: chatRoom.userId,
      receiverName: chatRoom.storeName,
    });
  };

  // チャットアイテムのレンダリング
  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => openChat(item)}
    >
      <View style={styles.chatInfo}>
        <Text style={styles.storeName}>{item.storeName}</Text>
        <Text 
          style={[
            styles.lastMessage,
            item.messageType === 'image' && styles.lastMessageImage,
            item.messageType === 'contract' && styles.lastMessageContract,
          ]} 
          numberOfLines={2}
        >
          {item.lastMessage}
        </Text>
      </View>
      <View style={styles.chatMeta}>
        <Text style={styles.timestamp}>
          {new Date(item.lastMessageTime).toLocaleDateString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
          })}
        </Text>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>チャット</Text>
      </View>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : chatRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>💬</Text>
            <Text style={styles.emptyTitle}>チャットはまだありません</Text>
            <Text style={styles.emptySubtext}>
              ホーム画面で他の店舗にコラボ申請を送って、
              チャットを開始しましょう！
            </Text>
          </View>
        ) : (
          <FlatList
            data={chatRooms}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.userId}
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
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
  emptyText: {
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
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  lastMessageImage: {
    color: '#007AFF',
    fontStyle: 'italic',
  },
  lastMessageContract: {
    color: '#28a745',
    fontStyle: 'italic',
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  arrow: {
    padding: 4,
  },
  arrowText: {
    fontSize: 16,
    color: '#ccc',
  },
});
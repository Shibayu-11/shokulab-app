// App.js - インポート部分（修正版）
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { supabase } from './src/services/supabase';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
// Chat screens are implemented inline
import ChatScreen from './src/screens/chat/ChatScreen';
import ChatListScreen from './src/screens/chat/ChatListScreen';
import CollaborationRequestsScreen from './src/screens/CollaborationRequestsScreen';
import ContractDetailScreen from './src/screens/ContractDetailScreen';
// 通知関連のインポートを追加
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';
import NotificationSettingsScreen from './src/screens/notifications/NotificationSettingsScreen';
import InAppNotificationsScreen from './src/screens/notifications/InAppNotificationsScreen';

const NotificationSettingsScreen = ({ navigation }) => (
  <View style={tempStyles.container}>
    <View style={tempStyles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={tempStyles.backButton}>‹ 戻る</Text>
      </TouchableOpacity>
      <Text style={tempStyles.headerTitle}>通知設定</Text>
      <View style={{ width: 40 }} />
    </View>
    <ScrollView style={tempStyles.content}>
      <View style={tempStyles.centerContent}>
        <Text style={tempStyles.iconText}>🔔</Text>
        <Text style={tempStyles.title}>通知設定</Text>
        <Text style={tempStyles.description}>
          通知設定機能を準備中です。{'\n'}
          近日中に利用可能になります。
        </Text>
      </View>
    </ScrollView>
  </View>
);

const InAppNotificationsScreen = ({ navigation }) => (
  <View style={tempStyles.container}>
    <View style={tempStyles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={tempStyles.backButton}>‹ 戻る</Text>
      </TouchableOpacity>
      <Text style={tempStyles.headerTitle}>通知履歴</Text>
      <View style={{ width: 40 }} />
    </View>
    <ScrollView style={tempStyles.content}>
      <View style={tempStyles.centerContent}>
        <Text style={tempStyles.iconText}>📫</Text>
        <Text style={tempStyles.title}>通知履歴</Text>
        <Text style={tempStyles.description}>
          通知履歴機能を準備中です。{'\n'}
          近日中に利用可能になります。
        </Text>
      </View>
    </ScrollView>
  </View>
);

// 一時的なスタイル
const tempStyles = StyleSheet.create({
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
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    alignItems: 'center',
    marginVertical: 40,
  },
  iconText: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 最終版：expo-image-manipulator使用
const uploadImage = async (imageUri, folder) => {
  try {
    console.log('🚀 Starting upload with expo-image-manipulator:', imageUri);
    console.log('📁 Upload folder:', folder);
    
    if (!imageUri || !imageUri.startsWith('file://')) {
      throw new Error('無効なファイルURIです');
    }

    // ステップ1: 画像を処理・最適化
    console.log('🔄 Processing image with manipulator...');
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 800 } } // 幅800pxにリサイズ（アスペクト比維持）
      ],
      {
        compress: 0.8, // 80%品質で圧縮
        format: ImageManipulator.SaveFormat.JPEG, // JPEG統一
        base64: true // Base64も取得
      }
    );

    console.log('✅ Image processed successfully:', {
      originalUri: imageUri,
      newUri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      hasBase64: !!manipulatedImage.base64
    });

    // ステップ2: ファイル名生成
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${randomId}.jpg`; // JPEG統一
    const filePath = `${folder}/${fileName}`;
    
    console.log('📁 Generated file path:', filePath);

    // ステップ3: Base64データ確認
    if (!manipulatedImage.base64) {
      throw new Error('処理済み画像のBase64データが取得できませんでした');
    }

    const base64Data = manipulatedImage.base64;
    console.log('📦 Base64 data ready, length:', base64Data.length);

    // ステップ4: バイナリデータに変換
    console.log('🔄 Converting to binary data...');
    const binaryString = atob(base64Data);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    console.log('📦 Binary data ready, size:', uint8Array.length, 'bytes');

    // ステップ5: Supabaseに直接アップロード
    console.log('🔄 Uploading to Supabase...');
    const uploadUrl = `https://tfpvuxxoylxyhwlpepvm.supabase.co/storage/v1/object/images/${filePath}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcHZ1eHhveWx4eWh3bHBlcHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODczNzgsImV4cCI6MjA1OTk2MzM3OH0.eA18LoCaKK163khNdlfdECPu1H2HTFejUxPXXEbMu-w`,
        'Content-Type': 'image/jpeg',
        'Content-Length': uint8Array.length.toString(),
        'x-upsert': 'false'
      },
      body: uint8Array
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Upload successful!');

    // ステップ6: 公開URLを生成
    const publicUrl = `https://tfpvuxxoylxyhwlpepvm.supabase.co/storage/v1/object/public/images/${filePath}`;
    const finalUrl = `${publicUrl}?t=${Date.now()}`;
    
    console.log('🔗 Final URL generated:', finalUrl);

    // ステップ7: URLの有効性をテスト
    try {
      const testResponse = await fetch(finalUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        console.log('✅ URL verified successfully');
      } else {
        console.warn('⚠️ URL verification failed, but continuing...');
      }
    } catch (testError) {
      console.warn('⚠️ URL test failed, but continuing...', testError.message);
    }
    
    return finalUrl;
    
  } catch (error) {
    console.error('💥 Complete image upload error:', {
      message: error.message,
      stack: error.stack,
      imageUri: imageUri,
      folder: folder
    });
    
    Alert.alert(
      '画像アップロードエラー', 
      `${error.message}\n\nexpo-image-manipulatorを使用した方法でエラーが発生しました。`
    );
    return null;
  }
};

// 修正版 pickImageWithValidation 関数
const pickImageWithValidation = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', '写真へのアクセス権限が必要です。');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      console.log('📱 Selected image details:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        type: asset.type,
        fileName: asset.fileName
      });
      
      // ファイルサイズチェックを緩和（1000 → 100バイト）
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert('ファイルサイズエラー', 'ファイルサイズが大きすぎます。10MB以下の画像を選択してください。');
        return null;
      }
      
      // 最小サイズチェックを100バイトに変更（小さな画像も許可）
      if (asset.fileSize && asset.fileSize < 100) {
        console.warn('⚠️ Very small file size:', asset.fileSize);
        Alert.alert('ファイルサイズ警告', 'ファイルサイズが非常に小さいです。正常な画像ファイルかご確認ください。');
        // エラーではなく警告として続行
      }
      
      // 画像の実在確認（エラーハンドリングを改善）
      try {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        console.log('📄 FileSystem info:', {
          exists: fileInfo.exists,
          size: fileInfo.size,
          isDirectory: fileInfo.isDirectory,
          modificationTime: fileInfo.modificationTime
        });
        
        if (!fileInfo.exists) {
          throw new Error('ファイルが存在しません');
        }
        
        // FileSystemでもサイズが0の場合のみエラー
        if (fileInfo.size === 0) {
          throw new Error('ファイルが空です');
        }
        
        console.log('✅ File validation passed');
      } catch (fileError) {
        console.error('❌ File validation failed:', fileError);
        Alert.alert(
          'ファイルエラー', 
          `選択された画像ファイルに問題があります。\n詳細: ${fileError.message}\n\n別の画像を選択してください。`
        );
        return null;
      }
      
      return asset.uri;
    }
    
    return null;
  } catch (error) {
    console.error('Image picker error:', error);
    Alert.alert('画像選択エラー', '画像の選択に失敗しました。もう一度お試しください。');
    return null;
  }
};

// 📷 カメラ撮影関数も修正
const takePhotoWithValidation = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラへのアクセス権限が必要です。');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      console.log('📷 Captured image:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize
      });
      
      return asset.uri;
    }
    
    return null;
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('カメラエラー', 'カメラの起動に失敗しました。');
    return null;
  }
};

// 🖼️ 画像選択オプション
const showImagePickerOptions = () => {
  return new Promise((resolve) => {
    Alert.alert(
      '写真を選択',
      '写真をどこから選択しますか？',
      [
        { text: 'キャンセル', style: 'cancel', onPress: () => resolve(null) },
        { 
          text: 'カメラで撮影', 
          onPress: async () => {
            const imageUri = await takePhotoWithValidation();  // ← 新しい関数名
            resolve(imageUri);
          }
        },
        { 
          text: 'ギャラリーから選択', 
          onPress: async () => {
            const imageUri = await pickImageWithValidation();  // ← 新しい関数名
            resolve(imageUri);
          }
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
};

/// 修正版 ImageDisplay コンポーネント - defaultSource を削除
const ImageDisplay = ({ uri, style, resizeMode = "cover", placeholder }) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (uri) {
      console.log('🖼️ ImageDisplay debug:', {
        uri: uri,
        uriType: typeof uri,
        uriLength: uri?.length,
        isSupabaseUrl: uri?.includes('supabase.co'),
        isValidHttps: uri?.startsWith('https://'),
        retryCount: retryCount
      });

      // URLの基本検証
      if (!uri.startsWith('https://') && !uri.startsWith('file://')) {
        console.error('❌ Invalid URL scheme:', uri);
        setImageError(true);
        setLoading(false);
        return;
      }

      setImageError(false);
      setLoading(true);
    }
  }, [uri, retryCount]);

  const handleImageError = (error) => {
    console.error('❌ Image error details:', {
      uri: uri,
      errorMessage: error?.nativeEvent?.error || 'Unknown error',
      errorType: typeof error?.nativeEvent?.error,
      responseCode: error?.nativeEvent?.responseCode,
      httpResponseHeaders: error?.nativeEvent?.httpResponseHeaders,
      retryCount: retryCount
    });
    
    // responseCode 200 の場合は別の問題の可能性
    if (error?.nativeEvent?.responseCode === 200) {
      console.warn('⚠️ Server responded 200 but image failed to load - possible CORS or content type issue');
    }
    
    setImageError(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', uri);
    setLoading(false);
    setImageError(false);
    setRetryCount(0); // 成功したらリトライカウントをリセット
  };

  const handleRetry = () => {
    if (retryCount < 3) { // 最大3回まで自動リトライ
      console.log(`🔄 Retrying image load (attempt ${retryCount + 1}/3)`);
      setRetryCount(prev => prev + 1);
      setImageError(false);
      setLoading(true);
    } else {
      console.error('❌ Max retry attempts reached for:', uri);
      Alert.alert(
        '画像読み込みエラー',
        '画像の読み込みに失敗しました。\n\n• インターネット接続を確認してください\n• 別の画像を選択してください',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'URLを確認', 
            onPress: () => {
              if (uri.startsWith('https://')) {
                console.log('Opening URL in browser:', uri);
                Linking.openURL(uri).catch(err => 
                  console.error('Cannot open URL:', err)
                );
              }
            }
          }
        ]
      );
    }
  };

  // URIが無効
  if (!uri || uri === null || uri === 'null' || uri === '') {
    return (
      <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#666', fontSize: 12, textAlign: 'center' }}>
          {placeholder || '画像なし'}
        </Text>
      </View>
    );
  }

  // エラー状態
  if (imageError) {
    return (
      <View style={[style, { backgroundColor: '#ffebee', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ffcdd2' }]}>
        <Text style={{ color: '#d32f2f', fontSize: 10, textAlign: 'center' }}>
          読み込み失敗 ({retryCount}/3)
        </Text>
        <Text style={{ color: '#d32f2f', fontSize: 8, textAlign: 'center', marginTop: 4 }}>
          {uri.substring(0, 50)}...
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 8, padding: 4, backgroundColor: '#fff', borderRadius: 4 }}
          onPress={handleRetry}
        >
          <Text style={{ color: '#d32f2f', fontSize: 10 }}>
            {retryCount < 3 ? '再試行' : 'URLを確認'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={style}>
      {loading && (
        <View style={[style, { 
          position: 'absolute', 
          backgroundColor: '#f0f0f0', 
          justifyContent: 'center', 
          alignItems: 'center', 
          zIndex: 1 
        }]}>
          <Text style={{ color: '#666', fontSize: 12 }}>読み込み中...</Text>
        </View>
      )}
      <Image
        source={{ 
          uri,
          // Cloudflareの問題対策でヘッダーを追加
          headers: {
            'User-Agent': 'ShokuLabApp/1.0',
            'Accept': 'image/*',
            'Cache-Control': 'no-cache'
          }
        }}
        style={style}
        resizeMode={resizeMode}
        onError={handleImageError}
        onLoad={handleImageLoad}
        onLoadStart={() => console.log('🔄 Image load started')}
        // React Native 0.79.3での画像読み込み最適化
        fadeDuration={0}
        resizeMethod="resize"
        // defaultSource を削除 - ファイルが存在しないため
      />
    </View>
  );
};

// 🍽️ メニューアイテムコンポーネント
const MenuItemForm = ({ 
  item, 
  onUpdate, 
  onRemove, 
  placeholder = "メニュー名", 
  index 
}) => {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [image, setImage] = useState(item?.image_url || null);

  const handleImageSelect = async () => {
    const imageUri = await showImagePickerOptions();
    if (imageUri) {
      setImage(imageUri);
      updateItem({ image_url: imageUri });
    }
  };

  const updateItem = (updates) => {
    const updatedItem = {
      name,
      description,
      image_url: image,
      ...updates
    };
    onUpdate(index, updatedItem);
  };

  useEffect(() => {
    updateItem({});
  }, [name, description]);

  return (
    <View style={styles.menuItemForm}>
      <View style={styles.menuItemHeader}>
        <Text style={styles.menuItemTitle}>{placeholder} {index + 1}</Text>
        <TouchableOpacity
          style={styles.removeMenuButton}
          onPress={() => onRemove(index)}
        >
          <Text style={styles.removeMenuButtonText}>削除</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>メニュー写真</Text>
      <TouchableOpacity style={styles.imageUploadButton} onPress={handleImageSelect}>
        {image ? (
          <ImageDisplay
            uri={image}
            style={styles.uploadedImage}
            placeholder="メニュー写真"
          />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadText}>写真を選択</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.inputLabel}>メニュー名</Text>
      <TextInput
        style={styles.input}
        placeholder={`例: ${placeholder === "看板メニュー" ? "特製ラーメン" : "新作パスタ"}`}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.inputLabel}>メニュー説明</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder={`${placeholder}の詳細や特徴を入力してください`}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />
    </View>
  );
};

// 🏪 店舗詳細画面
function StoreDetailScreen({ route, navigation }) {
  const { store } = route.params;
  const { user } = useAuth();
  const [signatureMenus, setSignatureMenus] = useState([]);
  const [featuredMenus, setFeaturedMenus] = useState([]);

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      const { data: signatureData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('store_id', store.id)
        .eq('menu_type', 'signature')
        .order('created_at');

      const { data: featuredData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('store_id', store.id)
        .eq('menu_type', 'featured')
        .order('created_at');

      setSignatureMenus(signatureData || []);
      setFeaturedMenus(featuredData || []);
    } catch (error) {
      console.error('Menu data loading error:', error);
    }
  };

  const handleCollaboration = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    Alert.alert(
      'コラボ申請',
      `${store.name}さんにコラボ申請を送信しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '送信', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('collaboration_requests')
                .insert([
                  {
                    requester_id: user.id,
                    requested_store_id: store.id,
                    message: `${store.name}さん、コラボレーションをお願いします！`
                  }
                ]);

              if (error) {
                Alert.alert('エラー', 'コラボ申請の送信に失敗しました');
              } else {
                Alert.alert('送信完了', 'コラボ申請を送信しました！');
                navigation.navigate('Chat', {
                  receiverId: store.user_id,
                  receiverName: store.name,
                });
              }
            } catch (error) {
              Alert.alert('エラー', 'コラボ申請の送信に失敗しました');
            }
          }
        }
      ]
    );
  };

  const renderMenuSection = (menus, title) => {
    if (menus.length === 0) return null;

    return (
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>{title}</Text>
        {menus.map((menu, index) => (
          <View key={menu.id} style={styles.menuCard}>
            <ImageDisplay
              uri={menu.image_url}
              style={styles.menuImage}
              placeholder="メニュー写真"
            />
            <View style={styles.menuInfo}>
              <Text style={styles.menuName}>{menu.name}</Text>
              <Text style={styles.menuDescription} numberOfLines={3}>
                {menu.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>店舗詳細</Text>
        <View style={{ width: 50 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.imageSection}>
          <ImageDisplay
            uri={store.exterior_url}
            style={styles.storeExteriorImage}
            placeholder="外観写真なし"
          />
        </View>

        <View style={styles.storeHeader}>
          <View style={styles.storeHeaderTop}>
            <ImageDisplay
              uri={store.logo_url}
              style={styles.storeLogo}
              placeholder="ロゴなし"
            />
            <View style={styles.storeBasicInfo}>
              <Text style={styles.storeName}>{store.name}</Text>
              <View style={styles.storeMetaContainer}>
                <View style={styles.storeMeta}>
                  <Text style={styles.storeCategory}>{store.category}</Text>
                  <Text style={styles.storeArea}>{store.area}</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.storeDescription}>{store.description}</Text>
        </View>

        {renderMenuSection(signatureMenus, "🏆 看板メニュー")}
        {renderMenuSection(featuredMenus, "⭐ 売り出したいメニュー")}

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.collaborateButtonLarge}
            onPress={handleCollaboration}
          >
            <Text style={styles.collaborateButtonLargeText}>🤝 コラボ申請を送る</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// 🏪 店舗編集画面
function StoreEditScreen({ route, navigation }) {
  const { store } = route.params || {};
  const isEditing = !!store;
  
  const [storeName, setStoreName] = useState(store?.name || '');
  const [category, setCategory] = useState(store?.category || '');
  const [area, setArea] = useState(store?.area || '');
  const [description, setDescription] = useState(store?.description || '');
  const [logoImage, setLogoImage] = useState(store?.logo_url || null);
  const [exteriorImage, setExteriorImage] = useState(store?.exterior_url || null);
  
  const [signatureMenus, setSignatureMenus] = useState([
    { name: '', description: '', image_url: null }
  ]);
  const [featuredMenus, setFeaturedMenus] = useState([
    { name: '', description: '', image_url: null }
  ]);
  
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isEditing && store) {
      loadMenuData();
    }
  }, [isEditing, store]);

  const loadMenuData = async () => {
    try {
      const { data: signatureData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('store_id', store.id)
        .eq('menu_type', 'signature')
        .order('created_at');

      const { data: featuredData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('store_id', store.id)
        .eq('menu_type', 'featured')
        .order('created_at');

      if (signatureData && signatureData.length > 0) {
        setSignatureMenus(signatureData);
      }

      if (featuredData && featuredData.length > 0) {
        setFeaturedMenus(featuredData);
      }
    } catch (error) {
      console.error('Menu data loading error:', error);
    }
  };

  const handleLogoUpload = async () => {
    const imageUri = await showImagePickerOptions();
    if (imageUri) {
      setLogoImage(imageUri);
    }
  };

  const handleExteriorUpload = async () => {
    const imageUri = await showImagePickerOptions();
    if (imageUri) {
      setExteriorImage(imageUri);
    }
  };

  const addSignatureMenu = () => {
    setSignatureMenus([...signatureMenus, { name: '', description: '', image_url: null }]);
  };

  const addFeaturedMenu = () => {
    setFeaturedMenus([...featuredMenus, { name: '', description: '', image_url: null }]);
  };

  const updateSignatureMenu = (index, updatedItem) => {
    const newMenus = [...signatureMenus];
    newMenus[index] = updatedItem;
    setSignatureMenus(newMenus);
  };

  const updateFeaturedMenu = (index, updatedItem) => {
    const newMenus = [...featuredMenus];
    newMenus[index] = updatedItem;
    setFeaturedMenus(newMenus);
  };

  const removeSignatureMenu = (index) => {
    if (signatureMenus.length > 1) {
      const newMenus = signatureMenus.filter((_, i) => i !== index);
      setSignatureMenus(newMenus);
    }
  };

  const removeFeaturedMenu = (index) => {
    if (featuredMenus.length > 1) {
      const newMenus = featuredMenus.filter((_, i) => i !== index);
      setFeaturedMenus(newMenus);
    }
  };

  const uploadMenuImages = async (menus, menuType) => {
    const uploadedMenus = [];
    
    for (const menu of menus) {
      let imageUrl = menu.image_url;
      
      if (menu.image_url && !menu.image_url.startsWith('http')) {
        imageUrl = await uploadImage(menu.image_url, menuType);
      }
      
      uploadedMenus.push({
        ...menu,
        image_url: imageUrl
      });
    }
    
    return uploadedMenus;
  };

  const saveMenuItems = async (storeId, menus, menuType) => {
    try {
      await supabase
        .from('menu_items')
        .delete()
        .eq('store_id', storeId)
        .eq('menu_type', menuType);

      const menuData = menus
        .filter(menu => menu.name.trim() !== '')
        .map(menu => ({
          store_id: storeId,
          menu_type: menuType,
          name: menu.name,
          description: menu.description,
          image_url: menu.image_url
        }));

      if (menuData.length > 0) {
        const { error } = await supabase
          .from('menu_items')
          .insert(menuData);
        
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Menu save error (${menuType}):`, error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    if (!storeName || !category || !area || !description) {
      Alert.alert('エラー', 'すべての基本情報を入力してください');
      return;
    }

    setLoading(true);
    
    try {
      let logoUrl = logoImage;
      let exteriorUrl = exteriorImage;

      if (logoImage && !logoImage.startsWith('http')) {
        logoUrl = await uploadImage(logoImage, 'logos');
        if (!logoUrl) {
          setLoading(false);
          return;
        }
      }

      if (exteriorImage && !exteriorImage.startsWith('http')) {
        exteriorUrl = await uploadImage(exteriorImage, 'exteriors');
        if (!exteriorUrl) {
          setLoading(false);
          return;
        }
      }

      const uploadedSignatureMenus = await uploadMenuImages(signatureMenus, 'signature');
      const uploadedFeaturedMenus = await uploadMenuImages(featuredMenus, 'featured');

      const storeData = {
        name: storeName,
        category: category,
        area: area,
        description: description,
        logo_url: logoUrl,
        exterior_url: exteriorUrl,
      };

      let storeId;

      if (isEditing) {
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', store.id)
          .eq('user_id', user.id);

        if (error) {
          Alert.alert('エラー', '店舗情報の更新に失敗しました');
          return;
        }
        
        storeId = store.id;
      } else {
        const { error: userError } = await supabase
          .from('food_lab_users')
          .upsert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || null,
            }
          ]);

        if (userError) {
          console.error('User profile error:', userError);
        }

        const { data: insertedStore, error } = await supabase
          .from('stores')
          .insert([{
            user_id: user.id,
            ...storeData
          }])
          .select()
          .single();

        if (error) {
          Alert.alert('エラー', '店舗登録に失敗しました');
          return;
        }
        
        storeId = insertedStore.id;
      }

      await saveMenuItems(storeId, uploadedSignatureMenus, 'signature');
      await saveMenuItems(storeId, uploadedFeaturedMenus, 'featured');

      Alert.alert(
        '成功', 
        isEditing ? '店舗情報とメニューが更新されました！' : '店舗とメニューが登録されました！',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error('Store operation error:', error);
      Alert.alert('エラー', isEditing ? '店舗情報の更新に失敗しました' : '店舗登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? '店舗編集' : '店舗登録'}</Text>
        <View style={{ width: 50 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>基本情報</Text>
          
          <Text style={styles.inputLabel}>店舗名</Text>
          <TextInput
            style={styles.input}
            placeholder="店舗名を入力"
            value={storeName}
            onChangeText={setStoreName}
          />

          <Text style={styles.inputLabel}>業態</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 居酒屋、カフェ、ラーメン"
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.inputLabel}>エリア</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 梅田、難波、心斎橋"
            value={area}
            onChangeText={setArea}
          />

          <Text style={styles.inputLabel}>店舗説明</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="店舗の特徴やコンセプトを入力"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>店舗画像</Text>
          
          <Text style={styles.inputLabel}>店舗ロゴ</Text>
          <TouchableOpacity style={styles.imageUploadButton} onPress={handleLogoUpload}>
            {logoImage ? (
              <ImageDisplay
                uri={logoImage}
                style={styles.uploadedImage}
                placeholder="ロゴを選択"
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadText}>ロゴを選択</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.inputLabel}>店舗外観</Text>
          <TouchableOpacity style={styles.imageUploadButton} onPress={handleExteriorUpload}>
            {exteriorImage ? (
              <ImageDisplay
                uri={exteriorImage}
                style={styles.uploadedImage}
                placeholder="外観写真を選択"
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadText}>外観写真を選択</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 看板メニュー</Text>
            <TouchableOpacity style={styles.addMenuButton} onPress={addSignatureMenu}>
              <Text style={styles.addMenuButtonText}>+ 追加</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>お店の代表的なメニューを登録してください</Text>
          
          {signatureMenus.map((menu, index) => (
            <MenuItemForm
              key={`signature-${index}`}
              item={menu}
              onUpdate={updateSignatureMenu}
              onRemove={removeSignatureMenu}
              placeholder="看板メニュー"
              index={index}
            />
          ))}
        </View>

        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ 売り出したいメニュー</Text>
            <TouchableOpacity style={styles.addMenuButton} onPress={addFeaturedMenu}>
              <Text style={styles.addMenuButtonText}>+ 追加</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>新作や注目メニューを登録してください</Text>
          
          {featuredMenus.map((menu, index) => (
            <MenuItemForm
              key={`featured-${index}`}
              item={menu}
              onUpdate={updateFeaturedMenu}
              onRemove={removeFeaturedMenu}
              placeholder="売り出したいメニュー"
              index={index}
            />
          ))}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading 
                ? (isEditing ? '更新中...' : '登録中...') 
                : (isEditing ? '店舗情報とメニューを更新' : '店舗とメニューを登録')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// 🏠 ホーム画面
function HomeScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [myStores, setMyStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadStores();
      loadMyStores();
    }
  }, [user]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Stores loading error:', error);
      } else {
        setStores(data || []);
      }
    } catch (error) {
      console.error('Stores loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyStores = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('My stores loading error:', error);
      } else {
        setMyStores(data || []);
      }
    } catch (error) {
      console.error('My stores loading error:', error);
    }
  };

  const handleStorePress = (store) => {
    navigation.navigate('StoreDetail', { store });
  };

  const handleMyStorePress = (store) => {
    navigation.navigate('StoreEdit', { store });
  };

  const handleCreateStore = () => {
    navigation.navigate('StoreEdit');
  };

  const handleQuickCollaboration = async (store) => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    Alert.alert(
      'コラボ申請',
      `${store.name}さんにコラボ申請を送信しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '詳細を見る', onPress: () => handleStorePress(store) },
        { 
          text: '今すぐ送信', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('collaboration_requests')
                .insert([
                  {
                    requester_id: user.id,
                    requested_store_id: store.id,
                    message: `${store.name}さん、コラボレーションをお願いします！`
                  }
                ]);

              if (error) {
                Alert.alert('エラー', 'コラボ申請の送信に失敗しました');
              } else {
                Alert.alert('送信完了', 'コラボ申請を送信しました！');
                navigation.navigate('Chat');
              }
            } catch (error) {
              Alert.alert('エラー', 'コラボ申請の送信に失敗しました');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>食ラボ</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateStore}>
          <Text style={styles.addButtonText}>+ 店舗登録</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>ようこそ、{user?.email}さん！</Text>
          <Text style={styles.subtitleText}>大阪の飲食店オーナー同士でコラボしましょう</Text>
        </View>

        {myStores.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>あなたの店舗</Text>
            {myStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.myStoreCard}
                onPress={() => handleMyStorePress(store)}
              >
                <View style={styles.storeCardContent}>
                  <ImageDisplay
                    uri={store.logo_url}
                    style={styles.storeCardImage}
                    placeholder="ロゴなし"
                  />
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    <Text style={styles.storeCategory}>{store.category}</Text>
                    <Text style={styles.storeArea}>{store.area}</Text>
                    <Text style={styles.storeDescription} numberOfLines={2}>
                      {store.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>近くの店舗</Text>
        {stores.length === 0 ? (
          <View style={styles.emptyStoresContainer}>
            <Text style={styles.emptyStoresEmoji}>🏪</Text>
            <Text style={styles.emptyStoresTitle}>まだ店舗がありません</Text>
            <Text style={styles.emptyStoresText}>
              最初に店舗を登録して、{'\n'}
              コラボ相手を見つけましょう！
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateStore}>
              <Text style={styles.createButtonText}>初回店舗登録</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={styles.storeCard}
              onPress={() => handleStorePress(store)}
            >
              <View style={styles.storeCardContent}>
                <ImageDisplay
                  uri={store.logo_url}
                  style={styles.storeCardImage}
                  placeholder="ロゴなし"
                />
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeCategory}>{store.category}</Text>
                  <Text style={styles.storeArea}>{store.area}</Text>
                  <Text style={styles.storeDescription} numberOfLines={2}>
                    {store.description}
                  </Text>
                </View>
              </View>
              <View style={styles.storeActions}>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => handleStorePress(store)}
                >
                  <Text style={styles.detailButtonText}>詳細</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.collaborateButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleQuickCollaboration(store);
                  }}
                >
                  <Text style={styles.collaborateText}>コラボ</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// 🎉 イベント画面
function EventsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>イベント</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ 新規作成</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.centerContent}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>イベントはまだありません</Text>
        <Text style={styles.emptyText}>
          コラボイベントを企画して、
          他の店舗オーナーと繋がりましょう！
        </Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>最初のイベントを作成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 👤 プロフィール画面
function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { unreadCount, createTestNotification } = useNotifications(); // 🆕 通知コンテキスト追加
  const [myStores, setMyStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null); // 🆕 プロフィール状態追加

  useEffect(() => {
    if (user) {
      fetchMyStores();
      fetchProfile(); // 🆕 プロフィール取得追加
    }
  }, [user]);

  const fetchMyStores = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my stores:', error);
      } else {
        setMyStores(data || []);
      }
    } catch (error) {
      console.error('Error fetching my stores:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 プロフィール情報取得
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('food_lab_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  // 🆕 通知設定画面への遷移
  const handleNotificationSettings = () => {
    navigation.navigate('NotificationSettings');
  };

  // 🆕 アプリ内通知画面への遷移
  const handleInAppNotifications = () => {
    navigation.navigate('InAppNotifications');
  };

  // 🆕 デバッグ用：テスト通知作成
  const handleCreateTestNotification = async () => {
    const success = await createTestNotification(
      'test',
      'テスト通知',
      'これはテスト用の通知です。正常に動作しています！'
    );
    
    if (success) {
      Alert.alert('成功', 'テスト通知を作成しました');
    } else {
      Alert.alert('エラー', 'テスト通知の作成に失敗しました');
    }
  };

  const handleEditStore = (store) => {
    navigation.navigate('StoreEdit', { store });
  };

  const handleDeleteStore = (store) => {
    Alert.alert(
      '店舗削除',
      `「${store.name}」を削除しますか？この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('stores')
                .delete()
                .eq('id', store.id)
                .eq('user_id', user.id);

              if (error) {
                Alert.alert('エラー', '店舗の削除に失敗しました');
              } else {
                Alert.alert('削除完了', '店舗を削除しました');
                fetchMyStores();
              }
            } catch (error) {
              Alert.alert('エラー', '店舗の削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  // ログアウト処理
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
            try {
              await signOut();
            } catch (error) {
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
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🆕 ヘッダーに通知アイコン追加 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>プロフィール</Text>
        <TouchableOpacity 
          style={styles.notificationIcon}
          onPress={handleInAppNotifications}
        >
          <Text style={styles.notificationIconText}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.headerNotificationBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* プロフィールカード */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>
            {profile?.name || 'ユーザー名未設定'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* マイ店舗セクション */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>マイ店舗</Text>
            <TouchableOpacity 
              style={styles.addStoreButton}
              onPress={() => navigation.navigate('StoreEdit')}
            >
              <Text style={styles.addStoreButtonText}>+ 新規登録</Text>
            </TouchableOpacity>
          </View>

          {myStores.length === 0 ? (
            <View style={styles.emptyStoresContainer}>
              <Text style={styles.emptyStoresEmoji}>🏪</Text>
              <Text style={styles.emptyStoresTitle}>店舗未登録</Text>
              <Text style={styles.emptyStoresText}>
                まずは店舗を登録して{'\n'}他のオーナーとコラボしましょう！
              </Text>
              <TouchableOpacity 
                style={styles.firstStoreButton}
                onPress={() => navigation.navigate('StoreEdit')}
              >
                <Text style={styles.firstStoreButtonText}>最初の店舗を登録</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myStores.map((store) => (
              <View key={store.id} style={styles.myStoreCard}>
                <View style={styles.myStoreContent}>
                  <View style={styles.myStoreInfo}>
                    <Text style={styles.myStoreName}>{store.name}</Text>
                    <Text style={styles.myStoreCategory}>{store.category}</Text>
                    <Text style={styles.myStoreArea}>{store.area}</Text>
                    <Text style={styles.myStoreDescription} numberOfLines={2}>
                      {store.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.myStoreActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditStore(store)}
                  >
                    <Text style={styles.editButtonText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStore(store)}
                  >
                    <Text style={styles.deleteButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 🆕 メニューセクション（通知機能付き） */}
        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('StoreEdit')}
          >
            <Text style={styles.menuText}>店舗情報編集</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>アカウント設定</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          {/* 🆕 通知設定メニュー */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleNotificationSettings}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuText}>通知設定</Text>
              {unreadCount > 0 && (
                <View style={styles.menuNotificationBadge}>
                  <Text style={styles.menuBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* 🆕 アプリ内通知メニュー */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleInAppNotifications}
          >
            <View style={styles.menuItemContent}>
              <Text style={styles.menuText}>通知履歴</Text>
              {unreadCount > 0 && (
                <View style={styles.menuNotificationBadge}>
                  <Text style={styles.menuBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>プライバシーポリシー</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>利用規約</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* 🆕 デバッグメニュー（開発時のみ表示） */}
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.menuItem, styles.debugMenuItem]}
              onPress={handleCreateTestNotification}
            >
              <Text style={[styles.menuText, styles.debugMenuText]}>🔧 テスト通知作成</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ログアウトボタン */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        </View>

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>食ラボ v1.0.0</Text>
          <Text style={styles.footerSubtext}>飲食店オーナー向けコラボアプリ</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// 📱 ログイン画面
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    if (isSignUp && !name) {
      Alert.alert('エラー', 'お名前を入力してください');
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name);
        if (error) {
          Alert.alert('新規登録エラー', error.message);
        } else {
          Alert.alert('成功', '新規登録が完了しました！');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          Alert.alert('ログインエラー', error.message);
        }
      }
    } catch (error) {
      Alert.alert('エラー', '認証に失敗しました');
    }
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>食ラボ</Text>
      <Text style={styles.loginSubtitle}>飲食店オーナー向けコラボアプリ</Text>
      
      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="お名前"
          value={name}
          onChangeText={setName}
        />
      )}
      
      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>
          {isSignUp ? '新規登録' : 'ログイン'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.switchButton}
        onPress={() => setIsSignUp(!isSignUp)}
      >
        <Text style={styles.switchText}>
          {isSignUp ? 'ログインに切り替え' : '新規登録に切り替え'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ナビゲーション設定
function ChatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatDetail" component={ChatScreen} />
      <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
      <Stack.Screen name="StoreEdit" component={StoreEditScreen} />
      <Stack.Screen name="ChatDetail" component={ChatScreen} />
      <Stack.Screen name="ContractDetail" component={ContractDetailScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="StoreEdit" component={StoreEditScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="InAppNotifications" component={InAppNotificationsScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF8C00',   
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60,
          paddingBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ 
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, focused }) => (
            <Text style={[styles.tabIcon, { color: color, fontSize: focused ? 22 : 20 }]}>
              🏠
            </Text>
          )
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatStack}
        options={{ 
          tabBarLabel: 'チャット',
          tabBarIcon: () => <Text style={styles.tabIcon}>💬</Text>
        }} 
      />
      <Tab.Screen 
        name="Requests" 
        component={CollaborationRequestsScreen} 
        options={{ 
          tabBarLabel: '申請',
          tabBarIcon: () => <Text style={styles.tabIcon}>🤝</Text>
        }} 
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen} 
        options={{ 
          tabBarLabel: 'イベント',
          tabBarIcon: () => <Text style={styles.tabIcon}>🎉</Text>
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{ 
          tabBarLabel: 'プロフィール',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <Text style={[styles.tabIcon, { color: color, fontSize: focused ? 22 : 20 }]}>
                👤
              </Text>
              {/* 通知バッジ */}
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          )
        }} 
      />
    </Tab.Navigator>
  );
}

// 認証ラッパー
function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <NotificationProvider>
          <MainTabs />
        </NotificationProvider>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}

// メインアプリ
export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

// 完全版スタイルシート（既存オレンジ + 通知機能）
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  loginContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  loginSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#FF8C00',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 20,
  },
  storeCard: {
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
  myStoreCard: {
    backgroundColor: '#FFF5E6',
    borderWidth: 2,
    borderColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  storeCardContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  storeCardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  storeCategory: {
    fontSize: 14,
    color: '#FF8C00',
    marginBottom: 2,
  },
  storeArea: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  storeDescription: {
    fontSize: 11,
    color: '#999',
  },
  storeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  detailButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  collaborateButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  collaborateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 店舗詳細画面
  imageSection: {
    height: 200,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  storeExteriorImage: {
    width: '100%',
    height: '100%',
  },
  storeHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeHeaderTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  storeLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  storeBasicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  storeMetaContainer: {
    marginBottom: 8,
  },
  storeMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  actionSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  collaborateButtonLarge: {
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  collaborateButtonLargeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // メニューセクション
  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  menuInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  menuName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  menuDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  // フォーム関連
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  uploadText: {
    fontSize: 16,
    color: '#666',
  },
  uploadedImage: {
    width: '100%',
    height: 120,
  },
  submitButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // メニュー編集関連
  addMenuButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addMenuButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuItemForm: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeMenuButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeMenuButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // 共通UI要素
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
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // プロフィール関連
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  menuArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabIcon: {
    fontSize: 20,
  },
  // マイ店舗セクション
  addStoreButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addStoreButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  myStoreContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  myStoreImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  myStoreInfo: {
    flex: 1,
  },
  myStoreName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  myStoreCategory: {
    fontSize: 14,
    color: '#FF8C00',
    marginBottom: 2,
  },
  myStoreArea: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  myStoreDescription: {
    fontSize: 12,
    color: '#999',
  },
  myStoreActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyStoresContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStoresEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStoresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStoresText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  firstStoreButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  firstStoreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // チャット関連スタイル
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  myMessageBubble: {
    backgroundColor: '#FF8C00',
  },
  otherMessageBubble: {
    backgroundColor: '#f0f0f0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#999',
  },
  messageInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ========================================
  // 🆕 通知機能用スタイル
  // ========================================
  
  // タブアイコンコンテナ
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // 通知バッジ
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  
  // バッジテキスト
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // ヘッダー通知アイコン（ProfileScreen用）
  notificationIcon: {
    position: 'relative',
    padding: 8,
  },
  notificationIconText: {
    fontSize: 24,
    color: '#fff',
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // メニューアイテム通知バッジ
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuNotificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // デバッグメニュー
  debugMenuItem: {
    backgroundColor: '#FFF5E6',
    borderColor: '#FF8C00',
    borderWidth: 1,
  },
  debugMenuText: {
    color: '#FF8C00',
    fontWeight: 'bold',
  },
});
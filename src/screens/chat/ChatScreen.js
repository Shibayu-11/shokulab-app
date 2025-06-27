import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CONTRACT_TEMPLATES, generateContract } from '../../utils/contractTemplates';
import { PAYMENT_METHODS, calculateEscrowFee } from '../../utils/paymentMethods';
import { checkContractPermission } from '../../utils/verificationLevels';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');

// 契約書作成モーダル
const ContractCreationModal = ({ 
  visible, 
  onClose, 
  onCreateContract, 
  senderName, 
  receiverName,
  userVerificationLevel = 'verified'
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [contractData, setContractData] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('shokulab_escrow');
  const [contractValue, setContractValue] = useState('');

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedTemplate(null);
    setContractData({});
    setPaymentMethod('shokulab_escrow');
    setContractValue('');
  };

  const isFormValid = () => {
    if (!contractValue || isNaN(parseInt(contractValue))) return false;
    const requiredFields = selectedTemplate?.customFields.filter(field => field.required) || [];
    return requiredFields.every(field => contractData[field.key]?.trim());
  };

  const handleCreateContract = async () => {
    try {
      const contractContent = generateContract(
        selectedTemplate,
        contractData,
        senderName,
        receiverName
      );

      const contractInfo = {
        template_type: selectedTemplate.id,
        title: selectedTemplate.title,
        content: {
          ...contractData,
          contractValue: parseInt(contractValue),
          paymentMethod: paymentMethod
        },
        generated_content: contractContent
      };

      await onCreateContract(contractInfo);
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert('エラー', '契約書の作成に失敗しました');
    }
  };

  // ステップ1: テンプレート選択
  const renderTemplateSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>契約書の種類を選択</Text>
      {CONTRACT_TEMPLATES.map((template) => (
        <TouchableOpacity
          key={template.id}
          style={[
            styles.templateCard,
            selectedTemplate?.id === template.id && styles.selectedTemplate
          ]}
          onPress={() => setSelectedTemplate(template)}
        >
          <Text style={styles.templateTitle}>{template.userFriendlyTitle}</Text>
          <Text style={styles.templateDescription}>{template.description}</Text>
        </TouchableOpacity>
      ))}
      
      <TouchableOpacity
        style={[styles.nextButton, !selectedTemplate && styles.disabledButton]}
        onPress={() => selectedTemplate && setCurrentStep(2)}
        disabled={!selectedTemplate}
      >
        <Text style={styles.nextButtonText}>次へ</Text>
      </TouchableOpacity>
    </View>
  );

  // ステップ2: 契約内容入力
  const renderContractForm = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>契約内容を入力</Text>
      
      {selectedTemplate?.customFields.map((field) => (
        <View key={field.key} style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.textInput, field.type === 'textarea' && styles.textArea]}
            placeholder={field.placeholder}
            value={contractData[field.key] || ''}
            onChangeText={(text) => setContractData(prev => ({ ...prev, [field.key]: text }))}
            multiline={field.type === 'textarea'}
            numberOfLines={field.type === 'textarea' ? 4 : 1}
          />
        </View>
      ))}

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          契約金額 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder="例: 50000"
          value={contractValue}
          onChangeText={setContractValue}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, !isFormValid() && styles.disabledButton]}
          onPress={() => isFormValid() && setCurrentStep(3)}
          disabled={!isFormValid()}
        >
          <Text style={styles.nextButtonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ステップ3: 支払い方法選択
  const renderPaymentSelection = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={styles.stepTitle}>支払い方法を選択</Text>
      
      {PAYMENT_METHODS.map((payment) => {
        const fee = calculateEscrowFee(parseInt(contractValue), payment.id);
        return (
          <TouchableOpacity
            key={payment.id}
            style={[
              styles.paymentCard,
              paymentMethod === payment.id && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod(payment.id)}
          >
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentIcon}>{payment.icon}</Text>
              <Text style={styles.paymentName}>{payment.name}</Text>
            </View>
            <Text style={styles.paymentDescription}>{payment.description}</Text>
            {fee && (
              <View style={styles.feeInfo}>
                <Text style={styles.feeText}>手数料: {fee.fee.toLocaleString()}円</Text>
                <Text style={styles.netAmountText}>
                  受取金額: {fee.netAmount.toLocaleString()}円
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(2)}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setCurrentStep(4)}
        >
          <Text style={styles.nextButtonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ステップ4: 最終確認
  const renderConfirmation = () => {
    const previewContract = generateContract(
      selectedTemplate,
      contractData,
      senderName,
      receiverName
    );

    return (
      <ScrollView style={styles.stepContainer}>
        <Text style={styles.stepTitle}>契約書の最終確認</Text>
        
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>{previewContract}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateContract}
          >
            <Text style={styles.createButtonText}>契約書を送信</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
            <Text style={styles.closeButton}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>契約書作成</Text>
          <Text style={styles.stepIndicator}>{currentStep}/4</Text>
        </View>

        {currentStep === 1 && renderTemplateSelection()}
        {currentStep === 2 && renderContractForm()}
        {currentStep === 3 && renderPaymentSelection()}
        {currentStep === 4 && renderConfirmation()}
      </View>
    </Modal>
  );
};

// メインのChatScreen
const ChatScreen = ({ route, navigation }) => {
  const { receiverId, receiverName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showContractModal, setShowContractModal] = useState(false);
  const [senderStoreName, setSenderStoreName] = useState('あなた');
  
  // 画像機能のステート
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    loadMessages();
    loadSenderStoreName();
  }, []);

  const loadSenderStoreName = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('name')
        .eq('owner_id', user.id)
        .single();

      if (data) {
        setSenderStoreName(data.name);
      }
    } catch (error) {
      console.log('店舗名の取得に失敗:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('メッセージ取得エラー:', error);
        Alert.alert('エラー', 'メッセージの取得に失敗しました');
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 画像アップロード関数
  const uploadImage = async (imageUri) => {
    try {
      console.log('🔄 Starting image upload process...');
      
      // 画像を圧縮・リサイズ
      const manipulatedImage = await manipulateAsync(
        imageUri,
        [
          { resize: { width: 800 } },
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
          base64: true
        }
      );

      // ファイル名生成
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `chat_${timestamp}_${randomId}.jpg`;
      const filePath = `chat-images/${fileName}`;
      
      // Base64からバイナリデータに変換
      const base64Data = manipulatedImage.base64;
      const binaryString = atob(base64Data);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      // Supabaseストレージにアップロード
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);
      
      return publicUrl;
      
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました');
      return null;
    }
  };

  // 画像選択（ギャラリーから）
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', '写真へのアクセス権限が必要です。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('画像選択エラー:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  // カメラで撮影
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'カメラへのアクセス権限が必要です。');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await sendImageMessage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('カメラエラー:', error);
      Alert.alert('エラー', 'カメラの使用に失敗しました');
    }
  };

  // 画像選択オプション表示
  const showImageOptions = () => {
    Alert.alert(
      '画像を送信',
      '画像の選択方法を選んでください',
      [
        { text: 'ギャラリーから選択', onPress: pickImage },
        { text: 'カメラで撮影', onPress: takePhoto },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  // 画像メッセージ送信
  const sendImageMessage = async (imageUri) => {
    setUploadingImage(true);
    
    try {
      // 1. 画像をアップロード
      const imageUrl = await uploadImage(imageUri);
      if (!imageUrl) {
        setUploadingImage(false);
        return;
      }

      // 2. メッセージとして保存
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: receiverId,
            content: '画像を送信しました',
            message_type: 'image',
            image_url: imageUrl
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('画像メッセージ送信エラー:', error);
        Alert.alert('エラー', '画像メッセージの送信に失敗しました');
        return;
      }

      setMessages(prev => [...prev, data]);
      
    } catch (error) {
      console.error('画像送信エラー:', error);
      Alert.alert('エラー', '画像の送信に失敗しました');
    } finally {
      setUploadingImage(false);
    }
  };

  // テキストメッセージ送信
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: receiverId,
            content: newMessage.trim(),
            message_type: 'text'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('メッセージ送信エラー:', error);
        Alert.alert('エラー', 'メッセージの送信に失敗しました');
        return;
      }

      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    }
  };

  // 契約書作成処理
  const handleCreateContract = async (contractInfo) => {
    try {
      // 1. contractsテーブルに契約書を保存
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert([
          {
            template_type: contractInfo.template_type,
            title: contractInfo.title,
            content: contractInfo.content,
            created_by: user.id
          }
        ])
        .select()
        .single();

      if (contractError) {
        console.error('契約書保存エラー:', contractError);
        Alert.alert('エラー', '契約書の保存に失敗しました');
        return;
      }

      // 2. messagesテーブルに契約書メッセージを送信
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            receiver_id: receiverId,
            content: `契約書「${contractInfo.title}」を送信しました`,
            message_type: 'contract'
          }
        ])
        .select()
        .single();

      if (messageError) {
        console.error('契約書メッセージ送信エラー:', messageError);
        Alert.alert('エラー', '契約書メッセージの送信に失敗しました');
        return;
      }

      // 3. contractsテーブルのchat_message_idを更新
      await supabase
        .from('contracts')
        .update({ chat_message_id: messageData.id })
        .eq('id', contractData.id);

      setMessages(prev => [...prev, messageData]);
      Alert.alert('成功', '契約書を送信しました！');

    } catch (error) {
      console.error('契約書作成エラー:', error);
      Alert.alert('エラー', '契約書の作成に失敗しました');
    }
  };

  // 契約書確認処理
  const handleViewContract = async (messageId) => {
    try {
      navigation.navigate('ContractDetail', { messageId });
    } catch (error) {
      Alert.alert('エラー', '契約書の取得に失敗しました');
    }
  };

  // 画像をフルスクリーンで表示
  const showFullScreenImage = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.otherMessage
        ]}>
          {item.message_type === 'contract' ? (
            <View style={styles.contractMessage}>
              <Text style={styles.contractIcon}>📋</Text>
              <Text style={[
                styles.contractText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {item.content}
              </Text>
              {!isMyMessage && (
                <TouchableOpacity 
                  style={styles.viewContractButton}
                  onPress={() => handleViewContract(item.id)}
                >
                  <Text style={styles.viewContractButtonText}>契約書を確認</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : item.message_type === 'image' ? (
            <TouchableOpacity onPress={() => showFullScreenImage(item.image_url)}>
              <Image 
                source={{ uri: item.image_url }} 
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.content}
            </Text>
          )}
          <Text style={[
            styles.timestamp,
            isMyMessage ? styles.myTimestamp : styles.otherTimestamp
          ]}>
            {new Date(item.created_at).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{receiverName}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{receiverName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>💬</Text>
          <Text style={styles.emptyTitle}>まだメッセージがありません</Text>
          <Text style={styles.emptySubtext}>
            最初のメッセージを送ってチャットを開始しましょう！
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        />
      )}

      {/* 画像アップロード中の表示 */}
      {uploadingImage && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#FF8C00" />
          <Text style={styles.uploadingText}>画像をアップロード中...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        {/* 契約書作成ボタン */}
        <TouchableOpacity 
          style={styles.contractCreateButton}
          onPress={() => setShowContractModal(true)}
        >
          <Text style={styles.contractCreateIcon}>📋</Text>
          <Text style={styles.contractCreateText}>契約書を作成</Text>
        </TouchableOpacity>

        <View style={styles.messageInputRow}>
          {/* 画像ボタン - LINEライクな＋アイコン */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={showImageOptions}
            disabled={uploadingImage}
          >
            <Text style={styles.addButtonIcon}>＋</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="メッセージを入力..."
            multiline
            maxLength={500}
            placeholderTextColor="#999"
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>送信</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 契約書作成モーダル */}
      <ContractCreationModal
        visible={showContractModal}
        onClose={() => setShowContractModal(false)}
        onCreateContract={handleCreateContract}
        senderName={senderStoreName}
        receiverName={receiverName}
        userVerificationLevel="verified"
      />

      {/* フルスクリーン画像モーダル */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalBackground}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeImageModal}
              onPress={() => setImageModalVisible(false)}
            >
              <Text style={styles.closeImageModalText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButton: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
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
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 3,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: '#FF8C00',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  contractMessage: {
    alignItems: 'center',
  },
  contractIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  contractText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  viewContractButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewContractButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  myTimestamp: {
    color: '#fff',
    textAlign: 'right',
  },
  otherTimestamp: {
    color: '#666',
    textAlign: 'left',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFF5E6',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  uploadingText: {
    marginLeft: 8,
    color: '#FF8C00',
    fontSize: 14,
  },
  contractCreateButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contractCreateIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  contractCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButtonIcon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8F8F8',
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#DDD',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // フルスクリーン画像モーダル
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  closeImageModal: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageModalText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // モーダル関連のスタイル（契約書機能）
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  closeButton: {
    color: '#FF8C00',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepIndicator: {
    color: '#666',
    fontSize: 14,
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTemplate: {
    borderColor: '#FF8C00',
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#ff4444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPayment: {
    borderColor: '#FF8C00',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  feeInfo: {
    backgroundColor: '#FFF5E6',
    padding: 8,
    borderRadius: 6,
  },
  feeText: {
    fontSize: 12,
    color: '#333',
  },
  netAmountText: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  nextButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginRight: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#DDD',
  },
});

export default ChatScreen;
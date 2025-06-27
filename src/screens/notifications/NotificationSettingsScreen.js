import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TIME_SLOTS,
  DEFAULT_NOTIFICATION_SETTINGS,
  validateNotificationSettings
} from '../../utils/notificationTypes';
import { requestNotificationPermissions } from '../../services/notificationService';

export default function NotificationSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  // 通知設定を読み込み
  const loadNotificationSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // 'PGRST116' = no rows returned
        console.error('通知設定取得エラー:', error);
      } else if (data) {
        setSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...data.settings
        });
      }
    } catch (error) {
      console.error('通知設定取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 通知設定を保存
  const saveNotificationSettings = async () => {
    const validation = validateNotificationSettings(settings);
    if (!validation.isValid) {
      Alert.alert('設定エラー', validation.errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert([
          {
            user_id: user.id,
            settings: settings,
            updated_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('通知設定保存エラー:', error);
        Alert.alert('エラー', '設定の保存に失敗しました');
      } else {
        Alert.alert('保存完了', '通知設定を更新しました');
      }
    } catch (error) {
      console.error('通知設定保存エラー:', error);
      Alert.alert('エラー', '設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // プッシュ通知の有効/無効を切り替え
  const togglePushNotifications = async (enabled) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          '通知権限が必要です',
          'プッシュ通知を受信するには、設定アプリで通知権限を有効にしてください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => {/* 設定アプリを開く実装 */} }
          ]
        );
        return;
      }
    }

    setSettings(prev => ({
      ...prev,
      pushNotificationsEnabled: enabled
    }));
  };

  // 個別通知の有効/無効を切り替え
  const toggleNotification = (notificationId, enabled) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [notificationId]: {
          ...prev.notifications[notificationId],
          enabled
        }
      }
    }));
  };

  // カテゴリ全体の有効/無効を切り替え
  const toggleCategory = (categoryId, enabled) => {
    const categoryNotifications = Object.values(NOTIFICATION_TYPES)
      .filter(type => type.category === categoryId);

    setSettings(prev => ({
      ...prev,
      categorySettings: {
        ...prev.categorySettings,
        [categoryId]: { enabled }
      },
      notifications: {
        ...prev.notifications,
        ...categoryNotifications.reduce((acc, type) => {
          acc[type.id] = {
            ...prev.notifications[type.id],
            enabled
          };
          return acc;
        }, {})
      }
    }));
  };

  // 通知時間帯を変更
  const changeTimeSlot = (timeSlot) => {
    setSettings(prev => ({
      ...prev,
      timeSlot
    }));
  };

  // 通知カテゴリのレンダリング
  const renderCategory = (category) => {
    const categoryTypes = Object.values(NOTIFICATION_TYPES)
      .filter(type => type.category === category.id);
    
    const categoryEnabled = settings.categorySettings[category.id]?.enabled ?? true;

    return (
      <View key={category.id} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <View style={styles.categoryTextContainer}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </View>
          </View>
          <Switch
            value={categoryEnabled}
            onValueChange={(enabled) => toggleCategory(category.id, enabled)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={categoryEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        {categoryEnabled && (
          <View style={styles.notificationList}>
            {categoryTypes.map(type => {
              const notificationEnabled = settings.notifications[type.id]?.enabled ?? type.defaultEnabled;
              
              return (
                <View key={type.id} style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>{type.title}</Text>
                    <Text style={styles.notificationDescription}>{type.description}</Text>
                  </View>
                  <Switch
                    value={notificationEnabled}
                    onValueChange={(enabled) => toggleNotification(type.id, enabled)}
                    trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                    thumbColor={notificationEnabled ? '#fff' : '#f4f3f4'}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // 通知時間帯設定のレンダリング
  const renderTimeSlotSettings = () => (
    <View style={styles.timeSlotSection}>
      <Text style={styles.sectionTitle}>📅 通知受信時間</Text>
      <Text style={styles.sectionDescription}>
        通知を受信する時間帯を設定できます
      </Text>

      {Object.values(NOTIFICATION_TIME_SLOTS).map(slot => (
        <TouchableOpacity
          key={slot.id}
          style={[
            styles.timeSlotOption,
            settings.timeSlot?.id === slot.id && styles.timeSlotOptionSelected
          ]}
          onPress={() => changeTimeSlot(slot)}
        >
          <View style={styles.timeSlotInfo}>
            <Text style={[
              styles.timeSlotName,
              settings.timeSlot?.id === slot.id && styles.timeSlotNameSelected
            ]}>
              {slot.name}
            </Text>
            <Text style={[
              styles.timeSlotTime,
              settings.timeSlot?.id === slot.id && styles.timeSlotTimeSelected
            ]}>
              {slot.start} - {slot.end}
            </Text>
          </View>
          <View style={[
            styles.radioButton,
            settings.timeSlot?.id === slot.id && styles.radioButtonSelected
          ]}>
            {settings.timeSlot?.id === slot.id && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知設定</Text>
        <TouchableOpacity onPress={saveNotificationSettings} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* プッシュ通知全体設定 */}
        <View style={styles.mainToggleSection}>
          <View style={styles.mainToggleHeader}>
            <Text style={styles.mainToggleTitle}>🔔 プッシュ通知</Text>
            <Switch
              value={settings.pushNotificationsEnabled}
              onValueChange={togglePushNotifications}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={settings.pushNotificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.mainToggleDescription}>
            全ての通知を受け取るかどうかを設定します
          </Text>
        </View>

        {settings.pushNotificationsEnabled && (
          <>
            {/* 通知時間帯設定 */}
            {renderTimeSlotSettings()}

            {/* 通知カテゴリ別設定 */}
            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>📋 通知の種類</Text>
              <Text style={styles.sectionDescription}>
                受信したい通知の種類を選択してください
              </Text>
              
              {Object.values(NOTIFICATION_CATEGORIES).map(renderCategory)}
            </View>
          </>
        )}

        {/* フッター情報 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            重要な通知（決済エラーなど）は設定に関わらず送信される場合があります
          </Text>
        </View>
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
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  saveButton: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  
  // メイン切り替え
  mainToggleSection: {
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
  mainToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mainToggleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mainToggleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // セクション共通
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },

  // 時間帯設定
  timeSlotSection: {
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
  timeSlotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  timeSlotOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  timeSlotInfo: {
    flex: 1,
  },
  timeSlotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timeSlotNameSelected: {
    color: '#007AFF',
  },
  timeSlotTime: {
    fontSize: 14,
    color: '#666',
  },
  timeSlotTimeSelected: {
    color: '#007AFF',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },

  // カテゴリ設定
  categoriesSection: {
    marginBottom: 20,
  },
  categorySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  
  // 個別通知設定
  notificationList: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // フッター
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
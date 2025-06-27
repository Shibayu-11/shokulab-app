export const NOTIFICATION_TYPES = {
    // コラボ関連
    COLLABORATION_REQUEST_RECEIVED: {
      id: 'collaboration_request_received',
      title: 'コラボ申請を受信',
      description: '他の店舗からコラボ申請が届いた時',
      category: 'collaboration',
      defaultEnabled: true,
      priority: 'high'
    },
    COLLABORATION_REQUEST_APPROVED: {
      id: 'collaboration_request_approved',
      title: 'コラボ申請が承認',
      description: '送信したコラボ申請が承認された時',
      category: 'collaboration',
      defaultEnabled: true,
      priority: 'high'
    },
    COLLABORATION_REQUEST_REJECTED: {
      id: 'collaboration_request_rejected',
      title: 'コラボ申請が拒否',
      description: '送信したコラボ申請が拒否された時',
      category: 'collaboration',
      defaultEnabled: true,
      priority: 'medium'
    },
  
    // チャット関連
    NEW_MESSAGE: {
      id: 'new_message',
      title: '新しいメッセージ',
      description: 'チャットで新しいメッセージを受信した時',
      category: 'chat',
      defaultEnabled: true,
      priority: 'high'
    },
    CONTRACT_RECEIVED: {
      id: 'contract_received',
      title: '契約書を受信',
      description: '契約書が送信されてきた時',
      category: 'chat',
      defaultEnabled: true,
      priority: 'high'
    },
  
    // 決済関連
    PAYMENT_COMPLETED: {
      id: 'payment_completed',
      title: '決済完了',
      description: '決済が正常に処理された時',
      category: 'payment',
      defaultEnabled: true,
      priority: 'high'
    },
    PAYMENT_FAILED: {
      id: 'payment_failed',
      title: '決済失敗',
      description: '決済処理に失敗した時',
      category: 'payment',
      defaultEnabled: true,
      priority: 'high'
    },
    PAYMENT_REMINDER: {
      id: 'payment_reminder',
      title: '支払い期限リマインダー',
      description: '支払い期限が近づいた時',
      category: 'payment',
      defaultEnabled: true,
      priority: 'medium'
    },
  
    // 本人確認関連
    VERIFICATION_APPROVED: {
      id: 'verification_approved',
      title: '本人確認承認',
      description: '本人確認が承認された時',
      category: 'verification',
      defaultEnabled: true,
      priority: 'high'
    },
    VERIFICATION_REJECTED: {
      id: 'verification_rejected',
      title: '本人確認拒否',
      description: '本人確認が拒否された時',
      category: 'verification',
      defaultEnabled: true,
      priority: 'high'
    },
  
    // マッチング・レコメンデーション
    NEW_MATCH_SUGGESTION: {
      id: 'new_match_suggestion',
      title: '新しいマッチング候補',
      description: 'おすすめの店舗が見つかった時',
      category: 'matching',
      defaultEnabled: false,
      priority: 'low'
    },
    POPULAR_STORE_UPDATE: {
      id: 'popular_store_update',
      title: '人気店舗の更新',
      description: 'エリアで人気の店舗情報が更新された時',
      category: 'matching',
      defaultEnabled: false,
      priority: 'low'
    },
  
    // イベント関連
    EVENT_INVITATION: {
      id: 'event_invitation',
      title: 'イベント招待',
      description: 'イベントに招待された時',
      category: 'event',
      defaultEnabled: true,
      priority: 'medium'
    },
    EVENT_REMINDER: {
      id: 'event_reminder',
      title: 'イベント開始リマインダー',
      description: 'イベント開始が近づいた時',
      category: 'event',
      defaultEnabled: true,
      priority: 'medium'
    },
  
    // システム・メンテナンス
    SYSTEM_UPDATE: {
      id: 'system_update',
      title: 'システム更新',
      description: 'アプリの重要な更新がある時',
      category: 'system',
      defaultEnabled: true,
      priority: 'medium'
    },
    MAINTENANCE_NOTICE: {
      id: 'maintenance_notice',
      title: 'メンテナンス通知',
      description: 'システムメンテナンスの予定がある時',
      category: 'system',
      defaultEnabled: true,
      priority: 'low'
    }
  };
  
  // 通知カテゴリ
  export const NOTIFICATION_CATEGORIES = {
    collaboration: {
      id: 'collaboration',
      name: 'コラボレーション',
      icon: '🤝',
      description: 'コラボ申請の送受信に関する通知'
    },
    chat: {
      id: 'chat',
      name: 'チャット・契約',
      icon: '💬',
      description: 'メッセージや契約書に関する通知'
    },
    payment: {
      id: 'payment',
      name: '決済・支払い',
      icon: '💳',
      description: '決済処理や支払い期限に関する通知'
    },
    verification: {
      id: 'verification',
      name: '本人確認',
      icon: '🛡️',
      description: '本人確認の進捗に関する通知'
    },
    matching: {
      id: 'matching',
      name: 'マッチング',
      icon: '🎯',
      description: 'おすすめ店舗やマッチングに関する通知'
    },
    event: {
      id: 'event',
      name: 'イベント',
      icon: '🎉',
      description: 'イベントの招待や開始に関する通知'
    },
    system: {
      id: 'system',
      name: 'システム',
      icon: '⚙️',
      description: 'アプリの更新やメンテナンスに関する通知'
    }
  };
  
  // 通知の優先度
  export const NOTIFICATION_PRIORITIES = {
    high: {
      id: 'high',
      name: '高',
      description: '即座に通知',
      sound: true,
      vibration: true,
      badge: true
    },
    medium: {
      id: 'medium',
      name: '中',
      description: '通常の通知',
      sound: true,
      vibration: false,
      badge: true
    },
    low: {
      id: 'low',
      name: '低',
      description: 'サイレント通知',
      sound: false,
      vibration: false,
      badge: true
    }
  };
  
  // 通知送信時間帯
  export const NOTIFICATION_TIME_SLOTS = {
    ANYTIME: { id: 'anytime', name: '24時間', start: '00:00', end: '23:59' },
    BUSINESS_HOURS: { id: 'business', name: '営業時間のみ', start: '09:00', end: '21:00' },
    CUSTOM: { id: 'custom', name: 'カスタム', start: '09:00', end: '18:00' }
  };
  
  // デフォルト通知設定
  export const DEFAULT_NOTIFICATION_SETTINGS = {
    // プッシュ通知全体の有効/無効
    pushNotificationsEnabled: true,
    
    // 送信時間帯
    timeSlot: NOTIFICATION_TIME_SLOTS.BUSINESS_HOURS,
    customStartTime: '09:00',
    customEndTime: '18:00',
    
    // 各通知タイプの設定
    notifications: Object.values(NOTIFICATION_TYPES).reduce((acc, type) => {
      acc[type.id] = {
        enabled: type.defaultEnabled,
        sound: NOTIFICATION_PRIORITIES[type.priority].sound,
        vibration: NOTIFICATION_PRIORITIES[type.priority].vibration,
        badge: NOTIFICATION_PRIORITIES[type.priority].badge
      };
      return acc;
    }, {}),
    
    // カテゴリ別の一括設定
    categorySettings: Object.keys(NOTIFICATION_CATEGORIES).reduce((acc, categoryId) => {
      acc[categoryId] = { enabled: true };
      return acc;
    }, {})
  };
  
  // 通知設定の検証関数
  export const validateNotificationSettings = (settings) => {
    const errors = [];
    
    if (!settings.timeSlot) {
      errors.push('通知時間帯が設定されていません');
    }
    
    if (settings.timeSlot?.id === 'custom') {
      if (!settings.customStartTime || !settings.customEndTime) {
        errors.push('カスタム時間帯の開始・終了時間を設定してください');
      }
      
      if (settings.customStartTime >= settings.customEndTime) {
        errors.push('開始時間は終了時間より前に設定してください');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
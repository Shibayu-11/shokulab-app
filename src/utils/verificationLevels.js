// src/utils/verificationLevels.js

// ユーザー認証レベル
export const USER_VERIFICATION_LEVELS = {
    UNVERIFIED: 'unverified',     // 未認証：基本機能のみ
    BASIC: 'basic',               // 基本認証：チャット可能
    VERIFIED: 'verified',         // 本人確認済み：契約機能可能
    PREMIUM: 'premium'            // 詳細確認済み：高額契約可能
  };
  
  // 各レベルで利用可能な機能
  export const FEATURE_PERMISSIONS = {
    [USER_VERIFICATION_LEVELS.UNVERIFIED]: {
      canViewStores: true,
      canSendCollabRequest: false,
      canChat: false,
      canCreateContract: false,
      maxContractValue: 0
    },
    [USER_VERIFICATION_LEVELS.BASIC]: {
      canViewStores: true,
      canSendCollabRequest: true,
      canChat: true,
      canCreateContract: false,
      maxContractValue: 0
    },
    [USER_VERIFICATION_LEVELS.VERIFIED]: {
      canViewStores: true,
      canSendCollabRequest: true,
      canChat: true,
      canCreateContract: true,
      maxContractValue: 100000 // 10万円まで
    },
    [USER_VERIFICATION_LEVELS.PREMIUM]: {
      canViewStores: true,
      canSendCollabRequest: true,
      canChat: true,
      canCreateContract: true,
      maxContractValue: 1000000 // 100万円まで
    }
  };
  
  // 本人確認に必要な書類
  export const VERIFICATION_DOCUMENTS = {
    IDENTITY: {
      id: 'identity',
      name: '身分証明書',
      description: '運転免許証、マイナンバーカード、パスポートのいずれか',
      required: true,
      types: ['image/jpeg', 'image/png'],
      maxSize: 5 * 1024 * 1024 // 5MB
    },
    BUSINESS_LICENSE: {
      id: 'business_license',
      name: '営業許可証',
      description: '食品営業許可証（飲食店営業許可等）',
      required: true,
      types: ['image/jpeg', 'image/png'],
      maxSize: 5 * 1024 * 1024
    },
    STORE_PHOTO: {
      id: 'store_photo',
      name: '店舗外観写真',
      description: '店舗の外観が分かる写真',
      required: true,
      types: ['image/jpeg', 'image/png'],
      maxSize: 5 * 1024 * 1024
    }
  };
  
  // 本人確認ステータス
  export const VERIFICATION_STATUS = {
    NOT_SUBMITTED: 'not_submitted',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired'
  };
  
  // 認証レベルチェック関数
  export const canUseFeature = (userLevel, feature) => {
    const permissions = FEATURE_PERMISSIONS[userLevel];
    return permissions ? permissions[feature] : false;
  };
  
  // 契約金額チェック関数
  export const canCreateContractWithValue = (userLevel, contractValue) => {
    const permissions = FEATURE_PERMISSIONS[userLevel];
    return permissions && contractValue <= permissions.maxContractValue;
  };
  
  // 本人確認画面用のフロー定義
  export const VERIFICATION_FLOW = [
    {
      step: 1,
      title: '身分証明書の提出',
      description: '運転免許証またはマイナンバーカードの写真を撮影してください',
      document: VERIFICATION_DOCUMENTS.IDENTITY,
      tips: [
        '文字がはっきり読める写真を撮影してください',
        '光の反射で文字が見えない場合は再撮影してください',
        '四隅がすべて写るように撮影してください'
      ]
    },
    {
      step: 2,
      title: '営業許可証の提出',
      description: '食品営業許可証の写真を撮影してください',
      document: VERIFICATION_DOCUMENTS.BUSINESS_LICENSE,
      tips: [
        '許可証番号がはっきり見える写真を撮影してください',
        '有効期限が確認できるようにしてください',
        '店舗名が身分証明書と一致していることを確認してください'
      ]
    },
    {
      step: 3,
      title: '店舗外観の撮影',
      description: '営業許可証に記載された住所の店舗外観を撮影してください',
      document: VERIFICATION_DOCUMENTS.STORE_PHOTO,
      tips: [
        '店舗名が確認できる看板も一緒に撮影してください',
        '住所表示がある場合は含めて撮影してください',
        '営業中であることが分かるように撮影してください'
      ]
    }
  ];
  
  // データベーステーブル設計（SQL）
  export const VERIFICATION_TABLES_SQL = `
  -- ユーザー認証情報テーブル
  CREATE TABLE user_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    verification_level VARCHAR DEFAULT 'unverified',
    status VARCHAR DEFAULT 'not_submitted',
    
    -- 提出された書類のURL
    identity_document_url TEXT,
    business_license_url TEXT,
    store_photo_url TEXT,
    bank_account_url TEXT,
    
    -- 認証情報
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id), -- 管理者ID
    rejection_reason TEXT,
    
    -- メタデータ
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- RLS設定
  ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
  
  -- ユーザーは自分の認証情報のみ閲覧・更新可能
  CREATE POLICY "Users can view own verification" ON user_verifications
    FOR SELECT USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can update own verification" ON user_verifications
    FOR UPDATE USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can insert own verification" ON user_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  `;
  
  // 契約機能制限のチェック関数
  export const checkContractPermission = (userVerificationLevel, contractValue = 0) => {
    const permissions = FEATURE_PERMISSIONS[userVerificationLevel];
    
    if (!permissions.canCreateContract) {
      return {
        allowed: false,
        reason: 'contract_not_allowed',
        message: '契約機能を利用するには本人確認が必要です。',
        action: 'プロフィール画面から本人確認を完了してください。'
      };
    }
    
    if (contractValue > permissions.maxContractValue) {
      return {
        allowed: false,
        reason: 'contract_value_exceeded',
        message: `${contractValue.toLocaleString()}円の契約には追加の認証が必要です。`,
        action: 'より詳細な本人確認を完了してください。'
      };
    }
    
    return {
      allowed: true,
      reason: 'permitted',
      message: '契約を作成できます。'
    };
  };
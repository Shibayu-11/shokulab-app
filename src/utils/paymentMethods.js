// src/utils/paymentMethods.js

// 支払い方法の定義
export const PAYMENT_METHODS = {
    SHOKULAB_ESCROW: {
      id: 'shokulab_escrow',
      name: '食ラボ安心決済',
      description: 'クレジットカードで支払い、銀行振込で受け取り',
      icon: '🛡️',
      advantages: [
        '支払い側：クレジットカードで簡単決済',
        '受け取り側：銀行振込で安心受領',
        '万が一のトラブル時にサポート',
        '取引履歴が自動記録',
        'クレジットカードのポイント獲得可能'
      ],
      disadvantages: [
        '決済手数料が発生'
      ],
      fees: {
        percentage: 3.6, // Stripe手数料3.6%
        minimum: 100,    // 最低100円
        maximum: 10000   // 最大10,000円
      },
      process: [
        '契約成立後、買い手がアプリ内でクレジットカード決済',
        'Stripeで即座に決済処理完了',
        '売り手に商品・サービス提供開始の通知',
        '提供完了後、買い手が受領確認',
        'リクステップが手数料を差し引いて売り手の銀行口座に振込'
      ],
      paymentFlow: {
        payer: {
          method: 'credit_card',
          provider: 'stripe',
          experience: 'アプリ内でクレジットカード情報入力→即座に決済完了'
        },
        receiver: {
          method: 'bank_transfer',
          provider: 'domestic_bank',
          experience: '銀行口座情報を事前登録→自動振込で受領'
        }
      },
      suitableFor: ['全ての取引（推奨）', '初回取引', '高額取引', '手軽に決済したい場合']
    },
  
    CASH: {
      id: 'cash',
      name: '現金決済',
      description: '商品受け渡し時に現金で支払い',
      icon: '💴',
      advantages: [
        '即座に決済完了',
        '手数料なし',
        '複雑な手続き不要'
      ],
      disadvantages: [
        '大金の持ち運びリスク',
        '釣り銭の準備が必要',
        'トラブル時のサポートなし'
      ],
      suitableFor: ['小額取引', '単発取引', '信頼関係のある相手']
    },
    
    DIRECT_BANK_TRANSFER: {
      id: 'direct_bank_transfer',
      name: '直接銀行振込',
      description: '当事者間で直接銀行振込',
      icon: '🏦',
      advantages: [
        '食ラボ手数料なし',
        '振込記録が残る'
      ],
      disadvantages: [
        '振込手数料が発生',
        'トラブル時は当事者間で解決',
        '口座情報の交換が必要'
      ],
      suitableFor: ['継続取引', '信頼できる相手', '手数料を節約したい場合']
    },
    
    MONTHLY_SETTLEMENT: {
      id: 'monthly_settlement',
      name: '月末締め翌月払い',
      description: '1ヶ月分をまとめて翌月に決済',
      icon: '📅',
      advantages: [
        '頻繁な決済手続きが不要',
        '事務処理の効率化',
        '取引量の把握が容易'
      ],
      disadvantages: [
        '信用取引のリスク',
        'キャッシュフローの遅れ'
      ],
      suitableFor: ['定期取引', '継続的な関係', '信頼できる相手']
    },
    
    COD: {
      id: 'cod',
      name: '代金引換',
      description: '商品配送時に配送業者経由で決済',
      icon: '🚚',
      advantages: [
        '配送と決済が同時',
        '第三者（配送業者）が仲介',
        '安全性が高い'
      ],
      disadvantages: [
        '代引き手数料が発生',
        '配送エリアの制限',
        '現金のみの場合が多い'
      ],
      suitableFor: ['配送取引', '初回取引', '中額取引']
    },
    
    DIGITAL_PAYMENT: {
      id: 'digital_payment',
      name: 'デジタル決済',
      description: 'PayPay、LINE Pay等のデジタル決済',
      icon: '📱',
      advantages: [
        '即座に決済完了',
        'QRコードで簡単',
        '少額の手数料'
      ],
      disadvantages: [
        '高額取引に制限',
        'サービス利用料',
        '法人利用の制約'
      ],
      suitableFor: ['小額〜中額取引', '若い経営者同士', 'カジュアルな取引']
    },
    
    BARTER: {
      id: 'barter',
      name: '物々交換',
      description: '商品やサービスの直接交換',
      icon: '🔄',
      advantages: [
        '現金が不要',
        '在庫処理に有効',
        'Win-Winの関係構築'
      ],
      disadvantages: [
        '価値の評価が難しい',
        '税務処理が複雑',
        '需要のマッチングが必要'
      ],
      suitableFor: ['余剰在庫の交換', '季節商品', '特殊な関係']
    }
  };
  
  // 支払いタイミングの選択肢
  export const PAYMENT_TIMING = {
    ADVANCE: {
      id: 'advance',
      name: '前払い',
      description: '商品・サービス提供前に支払い',
      riskLevel: 'low_for_seller',
      suitableFor: ['高額取引', '信用度の低い相手', '特注品']
    },
    
    COD_TIMING: {
      id: 'cod_timing',
      name: '引渡し時',
      description: '商品・サービス提供と同時に支払い',
      riskLevel: 'balanced',
      suitableFor: ['一般的な取引', 'スポット取引']
    },
    
    NET_PAYMENT: {
      id: 'net_payment',
      name: '後払い',
      description: '商品・サービス提供後に支払い',
      riskLevel: 'low_for_buyer',
      suitableFor: ['継続取引', '信頼関係のある相手']
    }
  };
  
  // 契約書での支払い条項テンプレート
  export const PAYMENT_CLAUSE_TEMPLATES = {
    [PAYMENT_METHODS.SHOKULAB_ESCROW.id]: {
      clause: `第X条（支払い方法 - 食ラボ安心決済）
  1. 支払いは食ラボ安心決済サービスを利用して行う。
  2. 乙（購入者）は契約成立後{paymentDeadline}以内に、食ラボアプリ内でクレジットカード決済を行う。
  3. 甲（提供者）はクレジットカード決済確認後、商品・サービスの提供を開始する。
  4. 乙は商品・サービスの受領確認を食ラボアプリ上で行う。
  5. 株式会社リクステップは受領確認後、決済手数料（{feeRate}%、最低{minFee}円、最大{maxFee}円）を差し引いて甲の指定銀行口座に振込を行う。
  6. 振込は受領確認後{transferDays}営業日以内に実行される。
  7. 万が一のトラブル時は株式会社リクステップが仲裁サポートを行う。`,
      
      variables: {
        paymentDeadline: ['3日', '5日', '7日'],
        feeRate: ['3.6'],
        minFee: ['100'],
        maxFee: ['10,000'],
        transferDays: ['3', '5', '7']
      }
    },
  
    [PAYMENT_METHODS.CASH.id]: {
      clause: `第X条（支払い方法）
  支払いは現金にて、{paymentTiming}に行うものとする。
  釣り銭の準備は{whoPrepares}が行う。`,
      
      variables: {
        paymentTiming: ['商品引渡し時', '月末', 'サービス完了時'],
        whoPrepares: ['支払い者', '受取り者', '双方で協議']
      }
    },
    
    [PAYMENT_METHODS.DIRECT_BANK_TRANSFER.id]: {
      clause: `第X条（支払い方法）
  支払いは銀行振込にて行う。
  振込先：{bankDetails}
  振込手数料は{whoPaysFee}の負担とする。
  支払期限：{paymentDeadline}
  ※本決済方法を選択した場合、食ラボのトラブルサポート対象外となる。`,
      
      variables: {
        bankDetails: ['契約締結時に別途通知', '甲が指定する口座', '乙が指定する口座'],
        whoPaysFee: ['振込者', '受取者', '双方で折半'],
        paymentDeadline: ['月末締め翌月末日', '商品受領後7日以内', '請求書発行後30日以内']
      }
    },
    
    [PAYMENT_METHODS.MONTHLY_SETTLEMENT.id]: {
      clause: `第X条（支払い方法）
  支払いは月末締めとし、翌月{paymentDate}までに{paymentMethod}にて行う。
  請求書は毎月{invoiceDate}までに発行する。
  支払いが遅延した場合、年{interestRate}%の遅延損害金を支払う。`,
      
      variables: {
        paymentDate: ['末日', '20日', '25日'],
        paymentMethod: ['食ラボ安心決済', '銀行振込', '現金'],
        invoiceDate: ['5日', '10日', '15日'],
        interestRate: ['6', '10', '14.6']
      }
    },
    
    [PAYMENT_METHODS.BARTER.id]: {
      clause: `第X条（物々交換の条件）
  本契約は物々交換契約とし、金銭の授受は行わない。
  甲提供物：{partyAItem}（評価額：{partyAValue}円）
  乙提供物：{partyBItem}（評価額：{partyBValue}円）
  評価額の差額が{toleranceAmount}円を超える場合は、現金で調整する。`,
      
      variables: {
        partyAItem: ['商品名を記載', '具体的なサービス内容'],
        partyAValue: ['市場価格に基づく', '双方合意額'],
        partyBItem: ['商品名を記載', '具体的なサービス内容'],
        partyBValue: ['市場価格に基づく', '双方合意額'],
        toleranceAmount: ['5,000', '10,000', '20,000']
      }
    }
  };
  
  // 支払い方法選択のヘルパー関数
  export const getRecommendedPaymentMethod = (contractValue, relationship, frequency) => {
    // 食ラボ安心決済を最優先で推奨
    const recommendations = [PAYMENT_METHODS.SHOKULAB_ESCROW];
    
    // 契約金額による追加推奨
    if (contractValue <= 10000) {
      recommendations.push(PAYMENT_METHODS.CASH, PAYMENT_METHODS.DIGITAL_PAYMENT);
    } else if (contractValue <= 100000) {
      recommendations.push(PAYMENT_METHODS.COD, PAYMENT_METHODS.DIRECT_BANK_TRANSFER);
    } else {
      recommendations.push(PAYMENT_METHODS.DIRECT_BANK_TRANSFER, PAYMENT_METHODS.MONTHLY_SETTLEMENT);
    }
    
    return recommendations;
  };
  
  // 手数料計算関数
  export const calculateEscrowFee = (amount) => {
    const { percentage, minimum, maximum } = PAYMENT_METHODS.SHOKULAB_ESCROW.fees;
    const calculatedFee = Math.floor(amount * (percentage / 100));
    
    return {
      fee: Math.max(minimum, Math.min(maximum, calculatedFee)),
      percentage,
      netAmount: amount - Math.max(minimum, Math.min(maximum, calculatedFee))
    };
  };
  
  // 支払い方法のリスク評価
  export const assessPaymentRisk = (method, timing, contractValue, relationship) => {
    let riskScore = 0;
    let riskFactors = [];
    
    // 支払い方法によるリスク
    switch (method) {
      case PAYMENT_METHODS.CASH.id:
        if (contractValue > 50000) {
          riskScore += 2;
          riskFactors.push('高額現金取引');
        }
        break;
        
      case PAYMENT_METHODS.BARTER.id:
        riskScore += 1;
        riskFactors.push('価値評価の主観性');
        break;
        
      case PAYMENT_METHODS.MONTHLY_SETTLEMENT.id:
        if (relationship === 'new') {
          riskScore += 3;
          riskFactors.push('新規取引相手との信用取引');
        }
        break;
    }
    
    // タイミングによるリスク
    if (timing === PAYMENT_TIMING.NET_PAYMENT.id && relationship === 'new') {
      riskScore += 2;
      riskFactors.push('新規相手への後払い');
    }
    
    return {
      riskLevel: riskScore <= 1 ? 'low' : riskScore <= 3 ? 'medium' : 'high',
      riskScore,
      riskFactors,
      recommendations: generateRiskRecommendations(riskScore, riskFactors)
    };
  };
  
  const generateRiskRecommendations = (riskScore, riskFactors) => {
    const recommendations = [];
    
    if (riskScore >= 3) {
      recommendations.push('契約前に相手の信用度を十分確認してください');
      recommendations.push('保証金や手付金の設定を検討してください');
    }
    
    if (riskFactors.includes('高額現金取引')) {
      recommendations.push('銀行振込への変更を検討してください');
    }
    
    if (riskFactors.includes('新規取引相手との信用取引')) {
      recommendations.push('最初は前払いまたは引渡し時決済を推奨します');
    }
    
    return recommendations;
  };
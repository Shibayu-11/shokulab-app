// src/utils/contractTemplates.js

// 固定条項（全契約書に必須）
export const MANDATORY_CLAUSES = {
    platformDisclaimer: `第9条（プラットフォーム免責・記録保持）
  1. 本契約における当事者間の取引内容、履行状況、紛争等について、食ラボ運営会社である株式会社リクステップは一切の責任を負わないものとする。
  2. 株式会社リクステップは、本契約書および関連する通信記録を適切に保存し、契約不履行等の問題が発生した場合、法的手続きに応じて開示する権利を有する。
  3. 当事者は、上記条項に同意の上で本契約を締結するものとする。`,
    
    finalClause: `第10条（その他）
  1. 本契約に関する紛争は、当事者間で誠実に協議して解決するものとする。
  2. 本契約は日本法に準拠し、解釈される。
  
  以上、本契約の成立を証するため、当事者が合意の上で本契約書に同意する。
  
  契約締結日時：{contractDate}
  食ラボアプリ上での電子契約として記録`
  };
  
  // 食材売買契約テンプレート
  export const FOOD_TRADING_CONTRACT_TEMPLATE = {
    id: 'food_trading',
    title: '食材売買契約書',
    userFriendlyTitle: '💰 食材を売買したい',
    description: '食材の購入・販売に関する契約',
    
    customFields: [
      {
        key: 'product',
        label: '商品名・食材名',
        type: 'text',
        required: true,
        placeholder: '例: 新鮮野菜セット、国産牛肉'
      },
      {
        key: 'quantity',
        label: '数量・単位',
        type: 'text',
        required: true,
        placeholder: '例: 毎週10kg、月1回50人分'
      },
      {
        key: 'price',
        label: '価格',
        type: 'text',
        required: true,
        placeholder: '例: 1kg当たり1,500円、月額50,000円'
      },
      {
        key: 'deliverySchedule',
        label: '納期・配送スケジュール',
        type: 'text',
        required: true,
        placeholder: '例: 毎週月曜日午前中、月末締め翌月5日配送'
      },
      {
        key: 'paymentTerms',
        label: '支払い条件',
        type: 'text',
        required: true,
        placeholder: '例: 月末締め翌月末払い、配送時現金決済'
      },
      {
        key: 'qualityStandards',
        label: '品質基準・規格',
        type: 'textarea',
        required: false,
        placeholder: '例: 農薬不使用、配送から24時間以内の新鮮度保持'
      },
      {
        key: 'contractPeriod',
        label: '契約期間',
        type: 'text',
        required: true,
        placeholder: '例: 2025年7月1日〜2025年12月31日（6ヶ月間）'
      }
    ],
  
    template: `食材売買契約書
  
  売主：{supplierName}（以下「甲」という）
  買主：{buyerName}（以下「乙」という）
  
  甲と乙は、以下の条件で食材売買契約を締結する。
  
  第1条（商品）
  甲は乙に対し、以下の食材を供給する。
  商品名：{product}
  数量：{quantity}
  
  第2条（価格）
  本契約における価格は以下の通りとする。
  {price}
  
  第3条（納期・配送）
  {deliverySchedule}
  
  第4条（支払い条件）
  {paymentTerms}
  
  第5条（品質基準）
  {qualityStandards}
  
  第6条（契約期間）
  {contractPeriod}
  
  第7条（契約の解除）
  当事者の一方が本契約に違反し、相当期間を定めて催告しても改善されない場合、相手方は本契約を解除できる。
  
  第8条（損害賠償）
  当事者の一方が本契約に違反し、相手方に損害を与えた場合、その損害を賠償しなければならない。
  
  {platformDisclaimer}
  
  {finalClause}`
  };
  
  // 食材・技術交換契約テンプレート
  export const FOOD_EXCHANGE_CONTRACT_TEMPLATE = {
    id: 'food_exchange',
    title: '食材・技術交換契約書',
    userFriendlyTitle: '🤝 食材・技術を交換したい',
    description: '食材や調理技術の相互交換に関する契約',
    
    customFields: [
      {
        key: 'partyAProvides',
        label: 'あなたが提供するもの',
        type: 'textarea',
        required: true,
        placeholder: '例: 新鮮野菜10kg/週、特製ソースのレシピ'
      },
      {
        key: 'partyBProvides',
        label: '相手方が提供するもの',
        type: 'textarea',
        required: true,
        placeholder: '例: 国産牛肉5kg/週、調理技術指導'
      },
      {
        key: 'exchangeSchedule',
        label: '交換スケジュール',
        type: 'text',
        required: true,
        placeholder: '例: 毎週月曜日、月2回、イベント時のみ'
      },
      {
        key: 'evaluationMethod',
        label: '価値評価方法',
        type: 'text',
        required: true,
        placeholder: '例: 市場価格ベース、双方合意額、同等の労働時間'
      },
      {
        key: 'exchangePeriod',
        label: '交換期間',
        type: 'text',
        required: true,
        placeholder: '例: 2025年7月〜12月、3ヶ月間、継続的'
      }
    ],
  
    template: `食材・技術交換契約書
  
  甲：{supplierName}
  乙：{buyerName}
  
  甲と乙は、以下の条件で食材・技術の相互交換を行う。
  
  第1条（交換内容）
  甲提供物：{partyAProvides}
  乙提供物：{partyBProvides}
  
  第2条（交換スケジュール）
  {exchangeSchedule}
  
  第3条（価値評価）
  {evaluationMethod}
  
  第4条（交換期間）
  {exchangePeriod}
  
  第5条（品質保証）
  双方は提供する食材・技術について、通常の品質を保証する。
  
  第6条（契約の解除）
  当事者の一方が本契約に違反した場合、相手方は契約を解除できる。
  
  {platformDisclaimer}
  
  {finalClause}`
  };
  
  // イベント協力契約テンプレート
  export const EVENT_CONTRACT_TEMPLATE = {
    id: 'event',
    title: 'イベント協力契約書',
    userFriendlyTitle: '👥 イベント一緒にやりたい',
    description: '共同イベント開催に関する契約',
    
    customFields: [
      {
        key: 'eventName',
        label: 'イベント名',
        type: 'text',
        required: true,
        placeholder: '例: 大阪グルメフェスティバル2025'
      },
      {
        key: 'eventDate',
        label: '開催日時',
        type: 'text',
        required: true,
        placeholder: '例: 2025年8月15日〜17日 10:00-20:00'
      },
      {
        key: 'venue',
        label: '開催場所',
        type: 'text',
        required: true,
        placeholder: '例: 大阪城公園特設会場'
      },
      {
        key: 'roles',
        label: '役割分担',
        type: 'textarea',
        required: true,
        placeholder: '例: 甲：会場設営・運営、乙：食材調達・調理'
      },
      {
        key: 'costSharing',
        label: '費用分担',
        type: 'textarea',
        required: true,
        placeholder: '例: 会場費は甲負担、材料費は乙負担'
      },
      {
        key: 'revenueSharing',
        label: '収益分配',
        type: 'text',
        required: true,
        placeholder: '例: 売上から経費を差し引き、甲60%・乙40%で分配'
      }
    ],
  
    template: `イベント協力契約書
  
  主催者A：{organizerA}（以下「甲」という）
  主催者B：{organizerB}（以下「乙」という）
  
  甲と乙は、以下の条件で共同イベントを開催する。
  
  第1条（イベント概要）
  イベント名：{eventName}
  開催日時：{eventDate}
  開催場所：{venue}
  
  第2条（役割分担）
  {roles}
  
  第3条（費用分担）
  {costSharing}
  
  第4条（収益分配）
  {revenueSharing}
  
  第5条（責任分担）
  各自の担当業務について、各自が責任を負う。
  
  第6条（契約の解除）
  やむを得ない事情により、当事者の一方が契約を解除する場合、30日前までに相手方に通知する。
  
  第7条（不可抗力）
  天災、政府の指示等により開催が困難になった場合、協議の上で開催中止または延期を決定する。
  
  第8条（損害賠償）
  当事者の故意または重過失により相手方に損害を与えた場合、その損害を賠償する。
  
  {platformDisclaimer}
  
  {finalClause}`
  };
  
  // 設備貸借契約テンプレート
  export const EQUIPMENT_CONTRACT_TEMPLATE = {
    id: 'equipment',
    title: '設備貸借契約書',
    userFriendlyTitle: '🏠 設備を貸し借りしたい',
    description: '厨房設備等の貸借に関する契約',
    
    customFields: [
      {
        key: 'equipment',
        label: '設備名・仕様',
        type: 'textarea',
        required: true,
        placeholder: '例: 業務用オーブン（メーカー：○○、型番：××）'
      },
      {
        key: 'usagePeriod',
        label: '利用期間',
        type: 'text',
        required: true,
        placeholder: '例: 2025年7月1日〜2025年7月31日（1ヶ月間）'
      },
      {
        key: 'usageTime',
        label: '利用時間',
        type: 'text',
        required: true,
        placeholder: '例: 平日9:00-17:00、土日は要相談'
      },
      {
        key: 'rentalFee',
        label: '賃借料',
        type: 'text',
        required: true,
        placeholder: '例: 日額5,000円、月額100,000円'
      },
      {
        key: 'deposit',
        label: '保証金',
        type: 'text',
        required: false,
        placeholder: '例: 50,000円（契約終了時に返還）'
      },
      {
        key: 'maintenanceRules',
        label: '保守・清掃規則',
        type: 'textarea',
        required: true,
        placeholder: '例: 使用後は清掃して返却、故障時は直ちに連絡'
      }
    ],
  
    template: `設備貸借契約書
  
  貸主：{lender}（以下「甲」という）
  借主：{borrower}（以下「乙」という）
  
  甲と乙は、以下の条件で設備貸借契約を締結する。
  
  第1条（貸借設備）
  {equipment}
  
  第2条（利用期間）
  {usagePeriod}
  
  第3条（利用時間）
  {usageTime}
  
  第4条（賃借料）
  {rentalFee}
  
  第5条（保証金）
  {deposit}
  
  第6条（保守・清掃）
  {maintenanceRules}
  
  第7条（故障・損害）
  乙の責に帰すべき事由により設備が故障・損傷した場合、乙がその修理費用を負担する。
  
  第8条（契約の解除）
  当事者の一方が本契約に違反した場合、相手方は契約を解除できる。
  
  {platformDisclaimer}
  
  {finalClause}`
  };
  
  // 利用可能な契約書テンプレート一覧
  export const CONTRACT_TEMPLATES = [
    FOOD_TRADING_CONTRACT_TEMPLATE,
    FOOD_EXCHANGE_CONTRACT_TEMPLATE,
    EVENT_CONTRACT_TEMPLATE,
    EQUIPMENT_CONTRACT_TEMPLATE
  ];
  
  // 契約書生成関数
  export const generateContract = (template, customData, partyA, partyB) => {
    let content = template.template;
    
    // 当事者名を置換
    content = content.replace(/{supplierName}/g, partyA);
    content = content.replace(/{buyerName}/g, partyB);
    content = content.replace(/{organizerA}/g, partyA);
    content = content.replace(/{organizerB}/g, partyB);
    content = content.replace(/{lender}/g, partyA);
    content = content.replace(/{borrower}/g, partyB);
    
    // カスタムフィールドを置換
    Object.keys(customData).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      content = content.replace(regex, customData[key] || '【未入力】');
    });
    
    // 固定条項を置換
    content = content.replace(/{platformDisclaimer}/g, MANDATORY_CLAUSES.platformDisclaimer);
    content = content.replace(/{finalClause}/g, MANDATORY_CLAUSES.finalClause);
    content = content.replace(/{contractDate}/g, new Date().toLocaleString('ja-JP'));
    
    return content;
  };
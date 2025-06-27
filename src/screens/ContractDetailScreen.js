import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateEscrowFee } from '../utils/paymentMethods';

const ContractDetailScreen = ({ route, navigation }) => {
  const { contractId, messageId } = route.params;
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadContractDetails();
  }, []);

  const loadContractDetails = async () => {
    try {
      let contractData;

      if (contractId) {
        // contractIdが直接提供された場合
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (error) throw error;
        contractData = data;
      } else if (messageId) {
        // messageIdから契約書を取得
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('chat_message_id', messageId)
          .single();

        if (error) throw error;
        contractData = data;
      } else {
        throw new Error('契約書IDまたはメッセージIDが必要です');
      }

      setContract(contractData);
    } catch (error) {
      console.error('契約書取得エラー:', error);
      Alert.alert('エラー', '契約書の取得に失敗しました', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAgree = async () => {
    Alert.alert(
      '契約書に合意',
      'この契約書の内容に合意しますか？合意後は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '合意する',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await supabase
                .from('contracts')
                .update({
                  status: 'agreed',
                  agreed_by: user.id,
                  agreed_at: new Date().toISOString()
                })
                .eq('id', contract.id);

              if (error) throw error;

              // エスクロー取引レコードを作成（食ラボ安心決済の場合）
              if (contract.content.paymentMethod === 'shokulab_escrow') {
                const contractValue = contract.content.contractValue || 0;
                const feeInfo = calculateEscrowFee(contractValue);

                await supabase
                  .from('escrow_transactions')
                  .insert([
                    {
                      contract_id: contract.id,
                      amount: contractValue,
                      fee: feeInfo.fee,
                      status: 'pending'
                    }
                  ]);
              }

              Alert.alert('合意完了', '契約書に合意しました！', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);

            } catch (error) {
              console.error('合意処理エラー:', error);
              Alert.alert('エラー', '合意処理に失敗しました');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('エラー', '拒否理由を入力してください');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'rejected',
          agreed_by: user.id,
          agreed_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (error) throw error;

      setShowRejectModal(false);
      Alert.alert('拒否完了', '契約書を拒否しました', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('拒否処理エラー:', error);
      Alert.alert('エラー', '拒否処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '承認待ち';
      case 'agreed': return '合意済み';
      case 'rejected': return '拒否済み';
      default: return '不明';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'agreed': return '#28a745';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const isCreator = contract?.created_by === user.id;
  const canTakeAction = !isCreator && contract?.status === 'pending';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>契約書詳細</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>読み込み中...</Text>
        </View>
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹ 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>契約書詳細</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>契約書が見つかりません</Text>
        </View>
      </View>
    );
  }

  const contractValue = contract.content?.contractValue || 0;
  const paymentMethod = contract.content?.paymentMethod || '';
  const feeInfo = paymentMethod === 'shokulab_escrow' ? calculateEscrowFee(contractValue) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>契約書詳細</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 契約書基本情報 */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.contractTitle}>{contract.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) }]}>
              <Text style={styles.statusText}>{getStatusText(contract.status)}</Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>作成日時</Text>
            <Text style={styles.metaValue}>
              {new Date(contract.created_at).toLocaleString('ja-JP')}
            </Text>
          </View>

          {contract.agreed_at && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>
                {contract.status === 'agreed' ? '合意日時' : '拒否日時'}
              </Text>
              <Text style={styles.metaValue}>
                {new Date(contract.agreed_at).toLocaleString('ja-JP')}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>契約タイプ</Text>
            <Text style={styles.metaValue}>{contract.template_type}</Text>
          </View>
        </View>

        {/* 契約金額・支払い情報 */}
        {contractValue > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>💰 契約金額・支払い</Text>
            
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>契約金額</Text>
              <Text style={styles.amountValue}>¥{contractValue.toLocaleString()}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>支払い方法</Text>
              <Text style={styles.metaValue}>
                {paymentMethod === 'shokulab_escrow' ? '食ラボ安心決済' :
                 paymentMethod === 'cash' ? '現金決済' :
                 paymentMethod === 'direct_bank_transfer' ? '直接銀行振込' : paymentMethod}
              </Text>
            </View>

            {feeInfo && (
              <>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>決済手数料 (3.6%)</Text>
                  <Text style={styles.feeValue}>¥{feeInfo.fee.toLocaleString()}</Text>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.netLabel}>受取金額</Text>
                  <Text style={styles.netValue}>¥{feeInfo.netAmount.toLocaleString()}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* 契約内容詳細 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📋 契約内容</Text>
          
          {Object.entries(contract.content || {}).map(([key, value]) => {
            if (key === 'contractValue' || key === 'paymentMethod') return null;
            
            return (
              <View key={key} style={styles.contentRow}>
                <Text style={styles.contentLabel}>{key}</Text>
                <Text style={styles.contentValue}>{value}</Text>
              </View>
            );
          })}
        </View>

        {/* 生成された契約書全文 */}
        {contract.generated_content && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>📄 契約書全文</Text>
            <View style={styles.contractContent}>
              <Text style={styles.contractText}>{contract.generated_content}</Text>
            </View>
          </View>
        )}

        {/* アクションボタン */}
        {canTakeAction && (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>この契約書への対応</Text>
            <Text style={styles.actionDescription}>
              内容をご確認の上、合意または拒否を選択してください
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <Text style={styles.rejectButtonText}>❌ 拒否</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.agreeButton]}
                onPress={handleAgree}
                disabled={actionLoading}
              >
                <Text style={styles.agreeButtonText}>
                  {actionLoading ? '処理中...' : '✅ 合意'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isCreator && contract.status === 'pending' && (
          <View style={styles.waitingSection}>
            <Text style={styles.waitingText}>⏳ 相手方の回答をお待ちください</Text>
          </View>
        )}
      </ScrollView>

      {/* 拒否理由入力モーダル */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>契約書を拒否</Text>
            <Text style={styles.modalDescription}>
              拒否理由を入力してください（任意）
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="拒否理由を入力..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleReject}
                disabled={actionLoading}
              >
                <Text style={styles.modalRejectText}>
                  {actionLoading ? '処理中...' : '拒否する'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contractTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  metaValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  amountLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 2,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
  },
  feeValue: {
    fontSize: 14,
    color: '#dc3545',
  },
  netLabel: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  netValue: {
    fontSize: 18,
    color: '#28a745',
    fontWeight: 'bold',
  },
  contentRow: {
    marginBottom: 12,
  },
  contentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contentValue: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  contractContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  contractText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#333',
  },
  actionSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  agreeButton: {
    backgroundColor: '#28a745',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: '#856404',
    fontWeight: '500',
  },
  // モーダル関連
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  modalRejectButton: {
    backgroundColor: '#dc3545',
  },
  modalRejectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ContractDetailScreen;
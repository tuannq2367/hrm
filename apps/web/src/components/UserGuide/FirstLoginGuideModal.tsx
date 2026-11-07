import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Space, Checkbox, Card } from 'antd';
import {
  RocketOutlined,
  BookOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { UserProfile } from '../../context/AuthContext';

const { Title, Paragraph, Text } = Typography;

interface FirstLoginGuideModalProps {
  user: UserProfile | null;
  onOpenGuide: () => void;
}

export const FirstLoginGuideModal: React.FC<FirstLoginGuideModalProps> = ({ user, onOpenGuide }) => {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Không hiện modal khuyến nghị đối với tài khoản thuần Admin
    if (user.role === 'ADMIN') return;

    const storageKey = `snake_hrm_guide_prompt_seen_${user.id || user.phone}`;
    const hasSeen = localStorage.getItem(storageKey);

    // Nếu chưa từng thấy popup khuyến nghị lần đầu
    if (!hasSeen) {
      // Đợi 600ms sau khi đăng nhập để giao diện ổn định rồi hiện popup chào mừng
      const timer = setTimeout(() => {
        setOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user && dontShowAgain) {
      const storageKey = `snake_hrm_guide_prompt_seen_${user.id || user.phone}`;
      localStorage.setItem(storageKey, 'true');
    }
    setOpen(false);
  };

  const handleOpenGuide = () => {
    handleDismiss();
    onOpenGuide();
  };

  if (!user || user.role === 'ADMIN') return null;

  const employeeName = user.employee?.fullName || user.phone;

  return (
    <Modal
      open={open}
      onCancel={handleDismiss}
      footer={null}
      width={560}
      centered
      closable={false}
      maskClosable={false}
      styles={{
        content: {
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      }}
    >
      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
          color: '#fff',
          padding: '24px 24px 20px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            marginBottom: 12,
            fontSize: 26,
          }}
        >
          <RocketOutlined />
        </div>
        <Title level={3} style={{ color: '#fff', margin: '0 0 6px 0', fontSize: 20 }}>
          Chào mừng bạn đến với Cổng Nhân Sự!
        </Title>
        <Text style={{ color: '#dbeafe', fontSize: 14 }}>
          Xin chào, <b>{employeeName}</b> 🎉
        </Text>
      </div>

      {/* Body Content */}
      <div style={{ padding: '20px 24px 24px 24px' }}>
        <Paragraph style={{ fontSize: 14, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>
          Bạn là nhân sự mới đăng nhập vào hệ thống. Để bạn làm quen nhanh chóng và không bỡ ngỡ với các thao tác hàng ngày, chúng tôi <b>khuyến nghị bạn xem nhanh bản Hướng dẫn sử dụng căn bản</b> (chỉ mất khoảng 1-2 phút).
        </Paragraph>

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ color: '#1e293b', display: 'block', marginBottom: 8, fontSize: 13 }}>
            Các chức năng quan trọng cần nắm:
          </Text>

          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Card
              size="small"
              style={{ background: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 8 }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#e0f2fe', color: '#0284c7', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileTextOutlined />
                </div>
                <div>
                  <b style={{ color: '#0f172a', fontSize: 13 }}>1. Đăng ký Đơn xin phép & Giải trình</b>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Đi muộn, xin làm bù sau 17h, làm thông trưa, nghỉ phép năm, tăng ca OT...
                  </div>
                </div>
              </div>
            </Card>

            <Card
              size="small"
              style={{ background: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 8 }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#dcfce7', color: '#16a34a', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarOutlined />
                </div>
                <div>
                  <b style={{ color: '#0f172a', fontSize: 13 }}>2. Kiểm tra Chấm công trong tháng</b>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Theo dõi lịch quẹt thẻ hàng ngày, số phút đi muộn, ngày công thực tế...
                  </div>
                </div>
              </div>
            </Card>

            <Card
              size="small"
              style={{ background: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 8 }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#f3e8ff', color: '#9333ea', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarOutlined />
                </div>
                <div>
                  <b style={{ color: '#0f172a', fontSize: 13 }}>3. Tra cứu Phiếu lương cá nhân</b>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Xem chi tiết thu nhập, lương KPI, OT, bảo hiểm và số tiền thực lĩnh...
                  </div>
                </div>
              </div>
            </Card>
          </Space>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Checkbox checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Đã hiểu, không hiển thị lại thông báo này</span>
          </Checkbox>
        </div>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleDismiss} size="middle" style={{ borderRadius: 6 }}>
            Để sau
          </Button>
          <Button
            type="primary"
            icon={<BookOutlined />}
            size="middle"
            onClick={handleOpenGuide}
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 600,
              borderRadius: 6,
              padding: '0 18px',
            }}
          >
            Xem Hướng Dẫn Sử Dụng Ngay
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

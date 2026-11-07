import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Tag } from 'antd';
import {
  DownloadOutlined,
  MobileOutlined,
  AppleOutlined,
  AndroidOutlined,
  CheckCircleOutlined,
  ShareAltOutlined,
  PlusSquareOutlined,
} from '@ant-design/icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Kiểm tra xem ứng dụng đã được chạy dưới dạng Standalone PWA hay chưa
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    // Kiểm tra xem có phải thiết bị iOS (iPhone/iPad) không
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // Bắt sự kiện beforeinstallprompt trên Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Nếu đã chạy dưới dạng Web App Standalone hoặc người dùng bấm ẩn banner tạm thời
  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Nếu là iOS hoặc trình duyệt chưa hỗ trợ prompt tự động, mở modal hướng dẫn
      setGuideModalOpen(true);
    }
  };

  return (
    <>
      {/* Banner nhỏ gọn gắn trên cùng hoặc hiển thị dạng Button Cài App */}
      {!dismissed && (
        <div
          className="pwa-install-banner"
          style={{
            background: 'linear-gradient(90deg, #1677ff 0%, #0958d9 100%)',
            color: '#fff',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 8,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(22,119,255,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📲</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Cài đặt WebApp HRM lên điện thoại
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Mở nhanh như ứng dụng native, không cần gõ link web
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleInstallClick}
              style={{
                backgroundColor: '#fff',
                color: '#1677ff',
                borderColor: '#fff',
                fontWeight: 600,
              }}
            >
              Cài App ngay
            </Button>
            <Button
              type="text"
              size="small"
              onClick={() => setDismissed(true)}
              style={{ color: '#fff', opacity: 0.7 }}
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Modal hướng dẫn cài đặt chi tiết cho Android & iPhone */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MobileOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <span>Hướng dẫn cài đặt App HRM vào điện thoại</span>
          </div>
        }
        open={guideModalOpen}
        onCancel={() => setGuideModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setGuideModalOpen(false)}>
            Tôi đã hiểu
          </Button>,
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#595959', marginBottom: 16 }}>
            Bạn có thể đưa biểu tượng <b>HRM</b> ra màn hình chính điện thoại để mở nhanh như ứng dụng Zalo, Facebook mà không cần nhập link mỗi ngày:
          </p>

          {isIos ? (
            /* Hướng dẫn cho iPhone (iOS Safari) */
            <Card
              size="small"
              title={
                <span style={{ color: '#1677ff' }}>
                  <AppleOutlined /> Dành cho iPhone / iPad (Trình duyệt Safari)
                </span>
              }
              style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>
                    Bước 1
                  </Tag>
                  <span>
                    Bấm vào nút <b>Chia sẻ</b> (<ShareAltOutlined /> hoặc biểu tượng mũi tên hướng lên) ở thanh dưới cùng trình duyệt Safari.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>
                    Bước 2
                  </Tag>
                  <span>
                    Cuộn xuống và chọn mục <b>"Thêm vào MH chính"</b> (<PlusSquareOutlined /> Add to Home Screen).
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color="green" style={{ fontSize: 14, padding: '2px 8px' }}>
                    Bước 3
                  </Tag>
                  <span>
                    Bấm <b>Thêm</b> (Add) ở góc trên bên phải. Icon <b>HRM Mobile</b> sẽ xuất hiện ngay trên màn hình chính!
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            /* Hướng dẫn cho Android (Chrome / Cốc Cốc / Edge) */
            <Card
              size="small"
              title={
                <span style={{ color: '#1677ff' }}>
                  <AndroidOutlined /> Dành cho điện thoại Android (Chrome / Cốc Cốc)
                </span>
              }
              style={{ background: '#e6f4ff', borderColor: '#91caff' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>
                    Cách 1
                  </Tag>
                  <span>
                    Bấm vào nút <b>"Cài App ngay"</b> ở banner trên cùng hoặc thanh thông báo của trình duyệt.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '2px 8px' }}>
                    Cách 2
                  </Tag>
                  <span>
                    Bấm vào dấu <b>3 chấm ⋮</b> ở góc phải trên cùng trình duyệt Chrome $\rightarrow$ Chọn <b>"Cài đặt ứng dụng"</b> (hoặc "Thêm vào màn hình chính").
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Tag color="green" style={{ fontSize: 14, padding: '2px 8px' }}>
                    Xong
                  </Tag>
                  <span>
                    Ứng dụng sẽ được cài đặt và hoạt động toàn màn hình không có thanh URL.
                  </span>
                </div>
              </div>
            </Card>
          )}

          <div
            style={{
              marginTop: 16,
              background: '#fafafa',
              padding: 12,
              borderRadius: 6,
              fontSize: 13,
              color: '#389e0d',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircleOutlined />
            <span>Mỗi lần mở từ màn hình chính, bạn sẽ được tự động duy trì đăng nhập và xem công, lương tức thì!</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

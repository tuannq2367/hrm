import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Tag, Drawer, Dropdown } from 'antd';
import {
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  ApartmentOutlined,
  LogoutOutlined,
  KeyOutlined,
  MenuOutlined,
  BugOutlined,
  ReadOutlined,
  HomeOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { PwaInstallBanner } from '../PwaInstallBanner';
import { FirstLoginGuideModal } from '../UserGuide/FirstLoginGuideModal';

const { Header, Sider, Content } = Layout;

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN';
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN' || user?.role === 'HR';

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    ...(isAdminOrHr
      ? [
          {
            key: '/employees',
            icon: <TeamOutlined />,
            label: 'Quản lý Nhân sự',
          },
        ]
      : []),
    {
      key: '/attendance',
      icon: <CalendarOutlined />,
      label: 'Chấm công',
    },
    {
      key: '/requests',
      icon: <FileTextOutlined />,
      label: 'Quản lý Đơn từ',
    },
    {
      key: '/my-payslip',
      icon: <DollarOutlined />,
      label: 'Phiếu lương của tôi',
    },
    {
      key: '/documents',
      icon: <ReadOutlined />,
      label: 'Văn bản & Quy chế',
    },
    {
      key: '/guide',
      icon: <BookOutlined style={{ color: '#fa8c16' }} />,
      label: 'Hướng dẫn sử dụng',
    },
    ...(isAdminOrHr
      ? [
          {
            key: '/payroll',
            icon: <DollarOutlined />,
            label: 'Bảng Lương Công Ty',
          },
        ]
      : []),
    ...(isAdminOrHr
      ? [
          {
            key: '/external-insurance',
            icon: <SafetyCertificateOutlined />,
            label: 'Gửi đóng BHXH Ngoài',
          },
        ]
      : []),
    ...(isAdminOrHr
      ? [
          {
            key: '/org',
            icon: <ApartmentOutlined />,
            label: 'Cơ cấu Tổ chức',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            key: '/system-errors',
            icon: <BugOutlined />,
            label: 'Nhật ký Lỗi Hệ thống',
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  const userDropdownItems = [
    {
      key: 'guide',
      icon: <BookOutlined />,
      label: 'Hướng dẫn sử dụng',
      onClick: () => navigate('/guide'),
    },
    {
      key: 'change-pass',
      icon: <KeyOutlined />,
      label: 'Đổi mật khẩu',
      onClick: () => setChangePassOpen(true),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: logout,
    },
  ];

  const roleLabels: Record<string, { text: string; color: string }> = {
    ADMIN: { text: 'Quản trị viên (Admin)', color: 'red' },
    SUB_ADMIN: { text: 'Phó QTV (Sub-Admin)', color: 'magenta' },
    HR: { text: 'Nhân sự', color: 'blue' },
    MANAGER: { text: 'Quản lý', color: 'purple' },
    EMPLOYEE: { text: 'Nhân viên', color: 'green' },
  };

  const userBadge = roleLabels[user?.role || 'EMPLOYEE'] || { text: 'Nhân viên', color: 'green' };

  // Bottom Navigation tabs cho mobile
  const bottomNavItems = [
    {
      key: '/',
      label: 'Trang chủ',
      icon: <HomeOutlined />,
    },
    {
      key: '/attendance',
      label: 'Chấm công',
      icon: <CalendarOutlined />,
    },
    {
      key: '/requests',
      label: 'Nộp đơn',
      icon: <FileTextOutlined />,
    },
    {
      key: '/my-payslip',
      label: 'Phiếu lương',
      icon: <DollarOutlined />,
    },
    {
      key: 'menu',
      label: 'Menu',
      icon: <AppstoreOutlined />,
      onClick: () => setMobileDrawerOpen(true),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Sidebar Desktop */}
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{
          background: '#001529',
          boxShadow: '2px 0 6px rgba(0,21,41,0.35)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 18,
            letterSpacing: 1,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            gap: 8,
          }}
        >
          <img src="/icon.svg" alt="HRM" style={{ width: 28, height: 28 }} />
          <span>HRM SYSTEM</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      {/* Drawer Mobile Menu */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icon.svg" alt="HRM" style={{ width: 26, height: 26 }} />
            <span style={{ fontWeight: 600 }}>CỔNG NHÂN VIÊN HRM</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        bodyStyle={{ padding: 0 }}
      >
        {/* User Card trong Drawer */}
        <div
          style={{
            padding: 16,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            color: '#fff',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar size={48} style={{ backgroundColor: '#fff', color: '#1677ff' }} icon={<UserOutlined />} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {user?.employee?.fullName || 'Tài khoản: ' + user?.phone}
              </div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                {user?.employee?.employeeCode ? `Mã NV: ${user.employee.employeeCode}` : user?.phone}
              </div>
              <Tag color={userBadge.color} style={{ marginTop: 4 }}>
                {userBadge.text}
              </Tag>
            </div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />

        <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            block
            icon={<KeyOutlined />}
            onClick={() => {
              setMobileDrawerOpen(false);
              setChangePassOpen(true);
            }}
          >
            Đổi mật khẩu
          </Button>
          <Button block danger icon={<LogoutOutlined />} onClick={logout}>
            Đăng xuất
          </Button>
        </div>
      </Drawer>

      <Layout>
        {/* Header */}
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button
              className="mobile-menu-btn"
              type="text"
              icon={<MenuOutlined style={{ fontSize: 18 }} />}
              onClick={() => setMobileDrawerOpen(true)}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/icon.svg" alt="HRM" style={{ width: 28, height: 28 }} className="mobile-logo-icon" />
              <h3 className="app-header-title" style={{ margin: 0, fontWeight: 600, color: '#1f1f1f', fontSize: 16 }}>
                HRM Mobile
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="text"
              icon={<QuestionCircleOutlined style={{ color: '#1677ff', fontSize: 16 }} />}
              onClick={() => navigate('/guide')}
              style={{ fontWeight: 500, color: '#1677ff', display: 'flex', alignItems: 'center' }}
            >
              <span className="desktop-username">Hướng dẫn</span>
            </Button>
            <Tag color={userBadge.color}>{userBadge.text}</Tag>
            <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 6,
                }}
              >
                <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                <span className="desktop-username" style={{ fontWeight: 500 }}>
                  {user?.employee?.fullName || user?.phone}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          className="app-content-wrapper"
          style={{
            margin: '20px',
            padding: 20,
            background: '#fff',
            borderRadius: 8,
            minHeight: 280,
          }}
        >
          {/* Banner hỗ trợ cài đặt PWA vào màn hình chính điện thoại */}
          <PwaInstallBanner />

          {children}
        </Content>

        {/* Bottom Navigation Bar dành riêng cho Mobile */}
        <div className="mobile-bottom-nav">
          {bottomNavItems.map((item) => {
            const isActive = item.key === location.pathname;
            return (
              <div
                key={item.key}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else {
                    navigate(item.key);
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </Layout>

      {/* Modal Đổi mật khẩu bắt buộc lần đầu */}
      <ChangePasswordModal
        open={user?.mustChangePassword || false}
        isFirstLogin={true}
      />

      {/* Modal Đổi mật khẩu chủ động */}
      <ChangePasswordModal
        open={changePassOpen}
        isFirstLogin={false}
        onCancel={() => setChangePassOpen(false)}
        onSuccess={() => setChangePassOpen(false)}
      />

      {/* Modal Khuyến nghị xem Hướng dẫn sử dụng cho nhân sự mới đăng nhập lần đầu */}
      <FirstLoginGuideModal
        user={user}
        onOpenGuide={() => navigate('/guide')}
      />

      <style>{`
        /* Responsive styles cho Mobile WebApp */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: inline-flex !important;
          }
          .desktop-username {
            display: none !important;
          }
          .app-content-wrapper {
            margin: 8px 8px 72px 8px !important;
            padding: 12px !important;
            border-radius: 6px !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 58px;
            background: #ffffff;
            border-top: 1px solid #f0f0f0;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.06);
            z-index: 1000;
            justify-content: space-around;
            align-items: center;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex: 1;
            color: #8c8c8c;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            padding: 4px 0;
            user-select: none;
            transition: color 0.2s;
          }
          .mobile-nav-item.active {
            color: #1677ff;
            font-weight: 600;
          }
          .mobile-nav-item .anticon {
            font-size: 20px;
            margin-bottom: 2px;
          }
          .ant-table {
            font-size: 13px !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </Layout>
  );
};

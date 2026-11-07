import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Button, List, Tag, Avatar } from 'antd';
import {
  TeamOutlined,
  UserSwitchOutlined,
  FileDoneOutlined,
  DollarCircleOutlined,
  PlusOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ReadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    probationEmployees: 0,
    pendingRequests: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const isAdminOrHr = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN' || user?.role === 'HR';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (isAdminOrHr) {
        const empRes = await apiClient.get('/employees');
        const emps = empRes.data || [];
        const probation = emps.filter((e: any) => e.status === 'PROBATION').length;
        const reqRes = await apiClient.get('/requests?status=PENDING');
        setStats({
          totalEmployees: emps.length,
          probationEmployees: probation,
          pendingRequests: reqRes.data?.length || 0,
        });
        setRecentRequests(reqRes.data?.slice(0, 5) || []);
      } else {
        const myReqRes = await apiClient.get('/requests/my');
        setRecentRequests(myReqRes.data?.slice(0, 5) || []);
      }

      if (user?.employee?.id) {
        try {
          const lbRes = await apiClient.get('/requests/leave-balance');
          setLeaveBalance(lbRes.data);
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <div>
      {/* Header Chào mừng & Thông tin nhân viên */}
      <div
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #e6f4ff 0%, #ffffff 100%)',
          padding: '16px 20px',
          borderRadius: 8,
          border: '1px solid #bae0ff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={48} style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0958d9' }}>
              Xin chào, {user?.employee?.fullName || user?.phone}!
            </h3>
            <div style={{ color: '#595959', fontSize: 13, marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {user?.employee?.employeeCode && (
                <span>
                  Mã NV: <b>{user.employee.employeeCode}</b>
                </span>
              )}
              {user?.employee?.attendanceCode && (
                <span>
                  Mã chấm công: <b>{user.employee.attendanceCode}</b>
                </span>
              )}
              {(user?.employee as any)?.department?.name && (
                <span>Phòng: {(user?.employee as any).department.name}</span>
              )}
              {leaveBalance && (
                <Tag color={leaveBalance.available > 0 ? 'green' : 'red'}>
                  🌴 Phép năm: <b>{leaveBalance.available}</b>/{leaveBalance.totalEntitled} ngày khả dụng
                </Tag>
              )}
            </div>
          </div>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/requests')}
          style={{ height: 38, fontWeight: 600 }}
        >
          Tạo đơn mới
        </Button>
      </div>

      {/* 4 Nút hành động nhanh đặc biệt tiện lợi cho Mobile */}
      <div style={{ marginBottom: 20 }}>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Card
              hoverable
              onClick={() => navigate('/attendance')}
              style={{ textAlign: 'center', borderColor: '#91caff', background: '#f0f5ff' }}
              bodyStyle={{ padding: 14 }}
            >
              <CalendarOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Chấm công</div>
              <small style={{ color: '#8c8c8c' }}>Xem giờ vào/ra, số công</small>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              hoverable
              onClick={() => navigate('/my-payslip')}
              style={{ textAlign: 'center', borderColor: '#b7eb8f', background: '#f6ffed' }}
              bodyStyle={{ padding: 14 }}
            >
              <DollarCircleOutlined style={{ fontSize: 28, color: '#52c41a', marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Phiếu lương</div>
              <small style={{ color: '#8c8c8c' }}>Xem chi tiết thu nhập</small>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              hoverable
              onClick={() => navigate('/requests')}
              style={{ textAlign: 'center', borderColor: '#ffd591', background: '#fffbe6' }}
              bodyStyle={{ padding: 14 }}
            >
              <FileTextOutlined style={{ fontSize: 28, color: '#fa8c16', marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Gửi đơn từ</div>
              <small style={{ color: '#8c8c8c' }}>Nghỉ phép, làm bù, OT</small>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              hoverable
              onClick={() => navigate('/documents')}
              style={{ textAlign: 'center', borderColor: '#d3adf7', background: '#f9f0ff' }}
              bodyStyle={{ padding: 14 }}
            >
              <ReadOutlined style={{ fontSize: 28, color: '#722ed1', marginBottom: 6 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>Văn bản & Quy chế</div>
              <small style={{ color: '#8c8c8c' }}>Nội quy, quy trình cty</small>
            </Card>
          </Col>
        </Row>
      </div>

      {isAdminOrHr && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Tổng số nhân sự"
                value={stats.totalEmployees}
                prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Đang thử việc"
                value={stats.probationEmployees}
                prefix={<UserSwitchOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Đơn đang chờ duyệt"
                value={stats.pendingRequests}
                prefix={<FileDoneOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <Card
            title={isAdminOrHr ? '📌 Đơn từ cần xử lý gần đây' : '📌 Đơn từ của bạn gần đây'}
            extra={<Button type="link" onClick={() => navigate('/requests')}>Xem tất cả</Button>}
          >
            {recentRequests.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#bfbfbf', padding: 24 }}>
                Hiện không có đơn từ nào
              </div>
            ) : (
              <List
                dataSource={recentRequests}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tag color={item.status === 'PENDING' ? 'orange' : item.status === 'APPROVED' ? 'green' : 'red'}>
                        {item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                      </Tag>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.employee ? `${item.employee.fullName} (${item.employee.employeeCode})` : 'Đơn cá nhân'}
                      description={`Loại: ${item.type} | Ngày: ${new Date(item.targetDate).toLocaleDateString('vi-VN')} | Lý do: ${item.reason}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card title="⚡ Lối tắt chức năng">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button block icon={<CalendarOutlined />} onClick={() => navigate('/attendance')}>
                Xem Bảng Chấm Công Cá Nhân
              </Button>
              <Button block icon={<DollarCircleOutlined />} onClick={() => navigate('/my-payslip')}>
                Xem Phiếu Lương Chi Tiết
              </Button>
              <Button block icon={<ReadOutlined />} onClick={() => navigate('/documents')}>
                Xem Kho Văn Bản & Quy Định Công Ty
              </Button>
              {isAdminOrHr && (
                <>
                  <Button block icon={<TeamOutlined />} onClick={() => navigate('/employees')}>
                    Quản Lý Danh Sách Nhân Viên
                  </Button>
                  <Button block icon={<DollarCircleOutlined />} onClick={() => navigate('/payroll')}>
                    Tính & Chốt Bảng Lương Tháng
                  </Button>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

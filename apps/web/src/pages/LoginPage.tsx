import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      let phoneClean = values.phone ? String(values.phone).trim() : '';
      if (
        phoneClean.toLowerCase() !== 'admin' &&
        phoneClean.toLowerCase() !== 'admin@company.com'
      ) {
        let digits = phoneClean.replace(/\D/g, '');
        if (digits.startsWith('84') && digits.length >= 11) {
          phoneClean = '0' + digits.slice(2);
        } else if (!digits.startsWith('0') && digits.length === 9) {
          phoneClean = '0' + digits;
        } else if (digits.length > 0) {
          phoneClean = digits;
        }
      }

      const res = await apiClient.post('/auth/login', {
        phone: phoneClean,
        password: values.password,
      });

      login(res.data.accessToken, res.data.user);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1677ff 0%, #002c8c 100%)',
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={2} style={{ margin: 0, color: '#1677ff' }}>
            HRM PORTAL
          </Title>
          <Text type="secondary">Hệ thống Quản lý Hành chính & Nhân sự</Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="phone"
            label="Số điện thoại hoặc Tài khoản"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại hoặc tài khoản' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const valTrim = String(value).trim().toLowerCase();
                  if (valTrim === 'admin') {
                    return Promise.resolve();
                  }
                  const cleaned = String(value).replace(/\D/g, '');
                  if (cleaned.length >= 9 && cleaned.length <= 11) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Vui lòng nhập số điện thoại hợp lệ'));
                },
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Nhập số điện thoại hoặc tài khoản"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Nhân sự đăng nhập bằng số điện thoại, mật khẩu mặc định là 6 số cuối SĐT.
          </Text>
        </div>
      </Card>
    </div>
  );
};

import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface ChangePasswordModalProps {
  open: boolean;
  isFirstLogin?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  isFirstLogin = false,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();
  const [form] = Form.useForm();

  const handleFinish = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('Đổi mật khẩu thành công!');
      updateUser({ mustChangePassword: false });
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      // lỗi đã hiển thị qua interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isFirstLogin ? '🔒 Bắt buộc đổi mật khẩu lần đầu đăng nhập' : 'Đổi mật khẩu'}
      open={open}
      closable={!isFirstLogin}
      maskClosable={!isFirstLogin}
      footer={null}
      onCancel={onCancel}
    >
      {isFirstLogin && (
        <div style={{ marginBottom: 16, color: '#fa8c16' }}>
          Vì lý do an toàn, bạn được yêu cầu đổi mật khẩu mặc định trước khi sử dụng hệ thống.
        </div>
      )}
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {!isFirstLogin && (
          <Form.Item
            name="oldPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
        )}
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới (tối thiểu 6 ký tự)"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          ]}
        >
          <Input.Password placeholder="Nhập mật khẩu mới" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu mới"
          rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu' }]}
        >
          <Input.Password placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>
        <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
          {!isFirstLogin && (
            <Button onClick={onCancel} style={{ marginRight: 8 }}>
              Hủy
            </Button>
          )}
          <Button type="primary" htmlType="submit" loading={loading}>
            Lưu mật khẩu mới
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Input, Space, Select, message } from 'antd';
import { BugOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';

export const SystemErrorsPage: React.FC = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [selectedError, setSelectedError] = useState<any>(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadErrors();
  }, [statusFilter]);

  const loadErrors = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/system/errors?status=${statusFilter}`);
      setErrors(res.data);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;
    try {
      setResolving(true);
      await apiClient.put(`/system/errors/${selectedError.id}/resolve`, {
        note: resolveNote || 'Đã khắc phục lỗi thành công',
      });
      message.success(`Đã chuyển trạng thái ${selectedError.errorTraceId} sang RESOLVED!`);
      setResolveModalOpen(false);
      setResolveNote('');
      loadErrors();
    } catch (err) {
      // handled
    } finally {
      setResolving(false);
    }
  };

  const columns = [
    {
      title: 'Mã Lỗi',
      dataIndex: 'errorTraceId',
      key: 'traceId',
      render: (t: string) => <Tag color="volcano">{t}</Tag>,
    },
    {
      title: 'Đường dẫn API',
      key: 'path',
      render: (_: any, r: any) => (
        <span>
          <Tag>{r.method}</Tag> {r.path}
        </span>
      ),
    },
    {
      title: 'Thông báo lỗi',
      dataIndex: 'message',
      key: 'msg',
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'time',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) =>
        st === 'RESOLVED' ? (
          <Tag color="green">Đã xử lý (RESOLVED)</Tag>
        ) : (
          <Tag color="red">Chưa xử lý (OPEN)</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, r: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedError(r)}
          >
            Chi tiết Stack
          </Button>
          {r.status === 'OPEN' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setSelectedError(r);
                setResolveModalOpen(true);
              }}
            >
              Chuyển Resolved
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Space wrap>
          <h3 style={{ margin: 0 }}>
            <BugOutlined style={{ color: '#cf1322', marginRight: 8 }} />
            Nhật Ký & Quản Lý Lỗi Hệ Thống
          </h3>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            options={[
              { label: 'Chưa xử lý (OPEN)', value: 'OPEN' },
              { label: 'Đã xử lý (RESOLVED)', value: 'RESOLVED' },
              { label: 'Tất cả (ALL)', value: 'ALL' },
            ]}
          />
        </Space>
      </div>

      <Table
        dataSource={errors}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
      />

      {/* Modal Xem chi tiết Stack Trace */}
      <Modal
        title={`Chi tiết Lỗi: ${selectedError?.errorTraceId}`}
        open={!!selectedError && !resolveModalOpen}
        onCancel={() => setSelectedError(null)}
        footer={null}
        width={800}
      >
        <p>
          <b>API:</b> {selectedError?.method} {selectedError?.path} (HTTP {selectedError?.statusCode})
        </p>
        <p>
          <b>Thông báo:</b> {selectedError?.message}
        </p>
        <p>
          <b>Trạng thái:</b>{' '}
          {selectedError?.status === 'RESOLVED' ? (
            <Tag color="green">RESOLVED (Ghi chú: {selectedError?.resolutionNote})</Tag>
          ) : (
            <Tag color="red">OPEN</Tag>
          )}
        </p>
        <div style={{ marginTop: 16 }}>
          <b>Stack Trace:</b>
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              maxHeight: 300,
              overflowY: 'auto',
              fontSize: 12,
              marginTop: 6,
            }}
          >
            {selectedError?.stack || '(Không có stack trace)'}
          </pre>
        </div>
      </Modal>

      {/* Modal Chuyển trạng thái Resolved */}
      <Modal
        title={`Đánh dấu Đã xử lý (Resolved): ${selectedError?.errorTraceId}`}
        open={resolveModalOpen}
        onCancel={() => setResolveModalOpen(false)}
        footer={null}
      >
        <div style={{ marginBottom: 12 }}>
          Lỗi: <b>{selectedError?.message}</b>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
            Ghi chú cách khắc phục / sửa chữa:
          </label>
          <Input.TextArea
            rows={3}
            placeholder="VD: Đã sửa lại định dạng regex trong bộ đọc chấm công..."
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
          />
        </div>
        <div style={{ textAlign: 'right' }}>
          <Button onClick={() => setResolveModalOpen(false)} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button
            type="primary"
            loading={resolving}
            onClick={handleResolve}
          >
            Xác nhận RESOLVED
          </Button>
        </div>
      </Modal>
    </div>
  );
};

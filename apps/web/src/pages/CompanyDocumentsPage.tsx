import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  DatePicker,
  Popconfirm,
  message,
  Card,
  Tooltip,
} from 'antd';
import {
  FileTextOutlined,
  UploadOutlined,
  SearchOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

const categoryLabels: Record<string, { label: string; color: string }> = {
  QUY_CHE: { label: 'Quy chế', color: 'blue' },
  NOI_QUY: { label: 'Nội quy', color: 'volcano' },
  QUY_TRINH: { label: 'Quy trình', color: 'green' },
  CONG_VAN: { label: 'Công văn', color: 'purple' },
  THONG_BAO: { label: 'Thông báo', color: 'orange' },
  KHAC: { label: 'Khác', color: 'default' },
};

export const CompanyDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN';
  const isAdminOrHr = isAdmin || user?.role === 'HR';

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Upload modal
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDocuments();
  }, [categoryFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (categoryFilter && categoryFilter !== 'ALL') {
        params.category = categoryFilter;
      }
      if (search) {
        params.search = search;
      }
      const res = await apiClient.get('/documents', { params });
      setDocuments(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (values: any) => {
    if (!fileToUpload) {
      message.error('Vui lòng chọn file văn bản đính kèm');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', values.title);
      if (values.documentNumber) formData.append('documentNumber', values.documentNumber);
      formData.append('category', values.category || 'QUY_CHE');
      if (values.effectiveDate) {
        formData.append('effectiveDate', values.effectiveDate.format('YYYY-MM-DD'));
      }
      if (values.description) formData.append('description', values.description);

      await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      message.success('Đã tải lên văn bản mới thành công!');
      setModalOpen(false);
      form.resetFields();
      setFileToUpload(null);
      loadDocuments();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tải lên văn bản');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      message.success('Đã xóa văn bản');
      loadDocuments();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa văn bản');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const columns = [
    {
      title: 'Số hiệu văn bản',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      width: 150,
      render: (v: string) => <b>{v || '-'}</b>,
    },
    {
      title: 'Tên văn bản / Trích yếu',
      key: 'title',
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
          {r.description && (
            <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>{r.description}</div>
          )}
          <small style={{ color: '#bfbfbf' }}>Tên file gốc: {r.fileName}</small>
        </div>
      ),
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (cat: string) => {
        const item = categoryLabels[cat] || { label: cat, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 130,
      render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Kích thước',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 140,
      render: (_: any, r: any) => (
        <Space size="small">
          <Tooltip title="Xem hoặc Tải về">
            <Button
              size="small"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                // Mở trực tiếp link file qua static serve hoặc download API
                window.open(`/${r.filePath}`, '_blank');
              }}
            >
              Tải về
            </Button>
          </Tooltip>

          {isAdmin && (
            <Popconfirm
              title="Xóa văn bản này?"
              description="Hành động này sẽ xóa file vĩnh viễn khỏi máy chủ."
              onConfirm={() => handleDelete(r.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa văn bản">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
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
          <h3 style={{ margin: 0 }}>Văn bản, Quy chế & Quy trình Công ty</h3>
          <Input
            placeholder="Tìm theo tiêu đề, số hiệu..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={loadDocuments}
            style={{ width: 260 }}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 160 }}
            options={[
              { label: 'Tất cả phân loại', value: 'ALL' },
              { label: 'Quy chế', value: 'QUY_CHE' },
              { label: 'Nội quy', value: 'NOI_QUY' },
              { label: 'Quy trình', value: 'QUY_TRINH' },
              { label: 'Công văn', value: 'CONG_VAN' },
              { label: 'Thông báo', value: 'THONG_BAO' },
              { label: 'Khác', value: 'KHAC' },
            ]}
          />
          <Button onClick={loadDocuments}>Lọc dữ liệu</Button>
        </Space>

        {isAdminOrHr && (
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({
                category: 'QUY_CHE',
                effectiveDate: dayjs(),
              });
              setFileToUpload(null);
              setModalOpen(true);
            }}
          >
            Tải lên văn bản mới
          </Button>
        )}
      </div>

      <Table
        dataSource={documents}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
      />

      {/* Modal Tải lên văn bản */}
      <Modal
        title="Tải lên Văn bản, Quy định, Quy trình mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateDocument}>
          <Form.Item
            name="title"
            label="Tiêu đề văn bản / Tên quy chế"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="VD: Quy chế làm việc và chấm công năm 2026" />
          </Form.Item>

          <Form.Item name="documentNumber" label="Số hiệu văn bản (nếu có)">
            <Input placeholder="VD: 01/2026/QĐ-HRM" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Phân loại"
            rules={[{ required: true, message: 'Vui lòng chọn phân loại' }]}
          >
            <Select
              options={[
                { label: 'Quy chế', value: 'QUY_CHE' },
                { label: 'Nội quy', value: 'NOI_QUY' },
                { label: 'Quy trình', value: 'QUY_TRINH' },
                { label: 'Công văn', value: 'CONG_VAN' },
                { label: 'Thông báo', value: 'THONG_BAO' },
                { label: 'Khác', value: 'KHAC' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="effectiveDate"
            label="Ngày có hiệu lực"
            rules={[{ required: true, message: 'Vui lòng chọn ngày có hiệu lực' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item label="Chọn file văn bản (PDF, DOCX, XLSX...)">
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFileToUpload(e.target.files[0]);
                }
              }}
            />
          </Form.Item>

          <Form.Item name="description" label="Trích yếu / Mô tả tóm tắt nội dung">
            <Input.TextArea rows={3} placeholder="Mô tả tóm tắt các điểm quan trọng để nhân viên nắm bắt..." />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={uploading}>
              Tải lên và Lưu
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

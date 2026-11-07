import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Row, Col, Card, message, Popconfirm, Tag, Tooltip, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ShopOutlined } from '@ant-design/icons';
import { apiClient } from '../api/client';

export const OrgPage: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editDeptModalOpen, setEditDeptModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [posModalOpen, setPosModalOpen] = useState(false);

  const [deptForm] = Form.useForm();
  const [deptEditForm] = Form.useForm();
  const [posForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptRes, posRes] = await Promise.all([
        apiClient.get('/org/departments'),
        apiClient.get('/org/positions'),
      ]);
      setDepartments(deptRes.data);
      setPositions(posRes.data);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (values: any) => {
    try {
      await apiClient.post('/org/departments', {
        code: values.code,
        name: values.name,
        standardWorkDays: values.standardWorkDays ? Number(values.standardWorkDays) : 26,
        otRatePerHour: values.otRatePerHour ? Number(values.otRatePerHour) : 50000,
        unionFee: values.unionFee !== undefined && values.unionFee !== null && values.unionFee !== ''
          ? Number(values.unionFee)
          : (values.isStoreSales ? 0 : 50000),
        isStoreSales: Boolean(values.isStoreSales),
      });
      message.success('Thêm phòng ban thành công');
      setDeptModalOpen(false);
      deptForm.resetFields();
      loadData();
    } catch (err) {
      // handled
    }
  };

  const handleUpdateDept = async (values: any) => {
    if (!selectedDept) return;
    try {
      await apiClient.put(`/org/departments/${selectedDept.id}`, {
        code: values.code,
        name: values.name,
        standardWorkDays: values.standardWorkDays ? Number(values.standardWorkDays) : 26,
        otRatePerHour: values.otRatePerHour ? Number(values.otRatePerHour) : 50000,
        unionFee: values.unionFee !== undefined && values.unionFee !== null && values.unionFee !== ''
          ? Number(values.unionFee)
          : (values.isStoreSales ? 0 : 50000),
        isStoreSales: Boolean(values.isStoreSales),
      });
      message.success('Cập nhật phòng ban thành công');
      setEditDeptModalOpen(false);
      setSelectedDept(null);
      deptEditForm.resetFields();
      loadData();
    } catch (err) {
      // handled
    }
  };

  const handleCreatePos = async (values: any) => {
    try {
      await apiClient.post('/org/positions', values);
      message.success('Thêm chức danh thành công');
      setPosModalOpen(false);
      posForm.resetFields();
      loadData();
    } catch (err) {
      // handled
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      await apiClient.delete(`/org/departments/${id}`);
      message.success('Đã xóa phòng ban');
      loadData();
    } catch (err) {
      // handled
    }
  };

  const handleDeletePos = async (id: string) => {
    try {
      await apiClient.delete(`/org/positions/${id}`);
      message.success('Đã xóa chức danh');
      loadData();
    } catch (err) {
      // handled
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Cơ cấu Tổ chức: Phòng ban & Chức danh</h3>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={14}>
          <Card
            title="🏢 Danh sách Phòng Ban"
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  deptForm.resetFields();
                  deptForm.setFieldsValue({
                    standardWorkDays: 26,
                    otRatePerHour: 50000,
                    unionFee: 50000,
                    isStoreSales: false,
                  });
                  setDeptModalOpen(true);
                }}
              >
                Thêm phòng ban
              </Button>
            }
          >
            <Table
              dataSource={departments}
              rowKey="id"
              loading={loading}
              pagination={false}
              columns={[
                { title: 'Mã', dataIndex: 'code', key: 'code', width: 80 },
                {
                  title: 'Tên phòng ban',
                  dataIndex: 'name',
                  key: 'name',
                  render: (name: string, r: any) => (
                    <span>
                      <b>{name}</b>
                      {r.isStoreSales && (
                        <Tag color="cyan" style={{ marginLeft: 6 }}>
                          Bán hàng (Báo công)
                        </Tag>
                      )}
                    </span>
                  ),
                },
                {
                  title: 'Công chuẩn',
                  dataIndex: 'standardWorkDays',
                  key: 'standardWorkDays',
                  width: 105,
                  render: (v: number) => <Tag color="blue">{v || 26} ngày</Tag>,
                },
                {
                  title: 'Đơn giá OT',
                  dataIndex: 'otRatePerHour',
                  key: 'otRatePerHour',
                  width: 120,
                  render: (v: number) => (
                    <span style={{ fontWeight: 600, color: '#389e0d' }}>
                      {(v || 50000).toLocaleString('vi-VN')} đ/h
                    </span>
                  ),
                },
                {
                  title: 'Trích CĐ / BH',
                  dataIndex: 'unionFee',
                  key: 'unionFee',
                  width: 125,
                  render: (v: number, r: any) => {
                    const fee = v !== undefined && v !== null ? v : (r.isStoreSales ? 0 : 50000);
                    return fee > 0 ? (
                      <span style={{ fontWeight: 600, color: '#fa8c16' }}>
                        {fee.toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <Tag color="default">0 đ (Miễn)</Tag>
                    );
                  },
                },
                {
                  title: 'Nhân sự',
                  dataIndex: ['_count', 'employees'],
                  key: 'count',
                  width: 85,
                  render: (c: number) => `${c} người`,
                },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 100,
                  render: (_: any, r: any) => (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Tooltip title="Chỉnh sửa cấu hình phòng ban">
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setSelectedDept(r);
                            deptEditForm.setFieldsValue({
                              code: r.code,
                              name: r.name,
                              standardWorkDays: r.standardWorkDays ?? 26,
                              otRatePerHour: r.otRatePerHour ?? 50000,
                              unionFee: r.unionFee !== undefined && r.unionFee !== null ? r.unionFee : (r.isStoreSales ? 0 : 50000),
                              isStoreSales: Boolean(r.isStoreSales),
                            });
                            setEditDeptModalOpen(true);
                          }}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="Xóa phòng ban này?"
                        onConfirm={() => handleDeleteDept(r.id)}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card
            title="💼 Danh mục Chức Danh"
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setPosModalOpen(true)}
              >
                Thêm chức danh
              </Button>
            }
          >
            <Table
              dataSource={positions}
              rowKey="id"
              loading={loading}
              pagination={false}
              columns={[
                { title: 'Mã', dataIndex: 'code', key: 'code', width: 90 },
                { title: 'Tên chức danh', dataIndex: 'name', key: 'name' },
                {
                  title: 'Nhân sự',
                  dataIndex: ['_count', 'employees'],
                  key: 'count',
                  width: 90,
                  render: (c: number) => `${c} người`,
                },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 80,
                  render: (_: any, r: any) => (
                    <Popconfirm
                      title="Xóa chức danh này?"
                      onConfirm={() => handleDeletePos(r.id)}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal Thêm phòng ban */}
      <Modal
        title="Thêm phòng ban mới"
        open={deptModalOpen}
        onCancel={() => setDeptModalOpen(false)}
        footer={null}
      >
        <Form form={deptForm} layout="vertical" onFinish={handleCreateDept}>
          <Form.Item name="code" label="Mã phòng ban (VD: MKT)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên phòng ban" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="standardWorkDays"
                label="Ngày công chuẩn / tháng"
                extra="Mặc định: 26 ngày"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={31} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="otRatePerHour"
                label="Đơn giá tăng ca (VNĐ/h)"
                extra="Mặc định: 50.000đ/h"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  step={5000}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="unionFee"
            label="Số tiền trích công đoàn / BH hàng tháng (VNĐ)"
            extra="Mặc định các nhóm là 50.000đ, của nhân viên cửa hàng sẽ là 0đ. Áp dụng cho nhân viên chính thức."
          >
            <InputNumber
              min={0}
              step={5000}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="50000"
            />
          </Form.Item>
          <Form.Item name="isStoreSales" valuePropName="checked">
            <Checkbox
              onChange={(e) => {
                if (e.target.checked) {
                  deptForm.setFieldsValue({ unionFee: 0 });
                } else {
                  deptForm.setFieldsValue({ unionFee: 50000 });
                }
              }}
            >
              <b>Nhóm bán hàng tại cửa hàng</b> (Chốt công tháng, không quẹt thẻ, ngày lễ tính công thực tế không tự cộng nghỉ lễ, miễn trích công đoàn)
            </Checkbox>
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setDeptModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Chỉnh sửa phòng ban */}
      <Modal
        title={`Chỉnh sửa cấu hình phòng ban: ${selectedDept?.name || ''}`}
        open={editDeptModalOpen}
        onCancel={() => setEditDeptModalOpen(false)}
        footer={null}
      >
        <Form form={deptEditForm} layout="vertical" onFinish={handleUpdateDept}>
          <Form.Item name="code" label="Mã phòng ban" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên phòng ban" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="standardWorkDays"
                label="Ngày công chuẩn / tháng"
                extra="Tùy biến cho bộ phận"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={31} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="otRatePerHour"
                label="Đơn giá tăng ca (VNĐ/h)"
                extra="Tùy biến cho bộ phận"
                rules={[{ required: true }]}
              >
                <InputNumber
                  min={0}
                  step={5000}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="unionFee"
            label="Số tiền trích công đoàn / BH hàng tháng (VNĐ)"
            extra="Mặc định các nhóm là 50.000đ, của nhân viên cửa hàng sẽ là 0đ. Áp dụng cho nhân viên chính thức."
          >
            <InputNumber
              min={0}
              step={5000}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
              placeholder="50000"
            />
          </Form.Item>
          <Form.Item name="isStoreSales" valuePropName="checked">
            <Checkbox
              onChange={(e) => {
                if (e.target.checked) {
                  deptEditForm.setFieldsValue({ unionFee: 0 });
                } else {
                  deptEditForm.setFieldsValue({ unionFee: 50000 });
                }
              }}
            >
              <b>Nhóm bán hàng tại cửa hàng</b> (Chốt công tháng, không quẹt thẻ, ngày lễ tính công thực tế không tự cộng nghỉ lễ, miễn trích công đoàn)
            </Checkbox>
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setEditDeptModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Cập nhật
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Thêm chức danh */}
      <Modal
        title="Thêm chức danh mới"
        open={posModalOpen}
        onCancel={() => setPosModalOpen(false)}
        footer={null}
      >
        <Form form={posForm} layout="vertical" onFinish={handleCreatePos}>
          <Form.Item name="code" label="Mã chức danh (VD: DEV)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên chức danh" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={() => setPosModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit">
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

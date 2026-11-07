import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Tabs,
  Alert,
  Space,
  Typography,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  PrinterOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export const UserGuideContent: React.FC<{ onNavigateTo?: (path: string) => void }> = ({ onNavigateTo }) => {
  const [activeTab, setActiveTab] = useState<string>('requests');

  return (
    <div className="user-guide-container">
      <style>{`
        .user-guide-container {
          max-width: 1100px;
          margin: 0 auto;
        }
        .guide-step-card {
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          margin-bottom: 20px;
          transition: all 0.25s ease;
        }
        .guide-step-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          border-color: #cbd5e1;
        }
        .guide-badge-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1677ff;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .mockup-window {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
          font-family: inherit;
        }
        .mockup-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-bottom: 10px;
          margin-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .mockup-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .mockup-form-item {
          background: #ffffff;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 10px;
        }
        .mockup-pointer-pill {
          background: #ff4d4f;
          color: #fff;
          font-size: 12px;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 12px;
          margin-left: 8px;
          box-shadow: 0 2px 4px rgba(255, 77, 79, 0.4);
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @media print {
          .no-print-guide {
            display: none !important;
          }
          .user-guide-container {
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Hero Header */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
          borderRadius: 12,
          color: '#ffffff',
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.25)',
        }}
        bordered={false}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space direction="vertical" size={4}>
              <Tag color="cyan" style={{ fontSize: 13, padding: '2px 10px', borderRadius: 12 }}>
                <RocketOutlined /> SỔ TAY NHÂN VIÊN MỚI
              </Tag>
              <Title level={2} style={{ color: '#fff', margin: '8px 0 4px 0' }}>
                Hướng Dẫn Sử Dụng Căn Bản
              </Title>
              <Paragraph style={{ color: '#e0f2fe', fontSize: 15, margin: 0 }}>
                Dành cho toàn bộ nhân sự công ty. Nắm vững cách gửi đơn xin phép, theo dõi chấm công và tra cứu phiếu lương chỉ trong 2 phút!
              </Paragraph>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderColor: '#fff' }}
              className="no-print-guide"
            >
              In / Tải PDF hướng dẫn
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabs Navigation */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        type="card"
        size="large"
        items={[
          {
            key: 'requests',
            label: (
              <span>
                <FileTextOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                1. Đăng ký Đơn xin phép
              </span>
            ),
          },
          {
            key: 'attendance',
            label: (
              <span>
                <CalendarOutlined style={{ marginRight: 6, color: '#52c41a' }} />
                2. Kiểm tra Chấm công
              </span>
            ),
          },
          {
            key: 'payslip',
            label: (
              <span>
                <DollarOutlined style={{ marginRight: 6, color: '#722ed1' }} />
                3. Tra cứu Phiếu lương
              </span>
            ),
          },
        ]}
      />

      {/* NỘI DUNG 1: ĐĂNG KÝ ĐƠN XIN PHÉP */}
      {activeTab === 'requests' && (
        <div>
          <Alert
            message="Tại sao và khi nào cần gửi đơn xin phép?"
            description="Bất cứ khi nào bạn đi muộn, về sớm, xin làm bù sau 17h, làm thông trưa về sớm, nghỉ phép năm, nghỉ không lương, tăng ca OT hoặc quên quẹt thẻ chấm công, bạn cần gửi đơn lên hệ thống để cấp quản lý phê duyệt và bảo toàn công lương đầy đủ."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 20 }}
          />

          {/* Quy trình 4 bước */}
          <Title level={4}>
            <SafetyCertificateOutlined style={{ color: '#1677ff', marginRight: 8 }} />
            Quy trình 4 bước gửi đơn xin phép cực kỳ đơn giản:
          </Title>

          {/* Bước 1 */}
          <Card className="guide-step-card">
            <Row gutter={[20, 20]} align="middle">
              <Col xs={24} md={12}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className="guide-badge-num">1</div>
                  <div>
                    <Title level={5} style={{ margin: '0 0 6px 0' }}>
                      Truy cập mục "Quản lý Đơn từ"
                    </Title>
                    <Paragraph style={{ color: '#595959', marginBottom: 8 }}>
                      • <b>Trên Máy tính:</b> Bấm vào menu <b>"Quản lý Đơn từ"</b> ở cột bên trái màn hình.
                      <br />
                      • <b>Trên Điện thoại:</b> Bấm vào nút <b>"Nộp đơn"</b> (biểu tượng trang giấy) ở thanh điều hướng bên dưới.
                    </Paragraph>
                    <Paragraph style={{ color: '#595959', marginBottom: 12 }}>
                      Tại đây, bấm nút xanh <b>"+ Gửi đơn xin phép mới"</b> để mở cửa sổ tạo đơn.
                    </Paragraph>
                    {onNavigateTo && (
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={() => onNavigateTo('/requests')}
                        className="no-print-guide"
                      >
                        Thử bấm đến trang Đơn từ ngay
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                {/* Mockup minh họa bước 1 */}
                <div className="mockup-window">
                  <div className="mockup-header">
                    <span className="mockup-dot" style={{ background: '#ff5f56' }} />
                    <span className="mockup-dot" style={{ background: '#ffbd2e' }} />
                    <span className="mockup-dot" style={{ background: '#27c93f' }} />
                    <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>
                      Trang Quản lý Đơn từ & Phê duyệt
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Danh sách đơn của tôi</span>
                    <Button type="primary" size="small" style={{ background: '#1677ff' }}>
                      + Gửi đơn xin phép mới <span className="mockup-pointer-pill">Bấm vào đây</span>
                    </Button>
                  </div>
                  <div style={{ background: '#fff', border: '1px dashed #d9d9d9', padding: 12, borderRadius: 6, marginTop: 12, textAlign: 'center', color: '#8c8c8c' }}>
                    [Bảng lịch sử các đơn đã gửi và trạng thái Chờ duyệt / Đã duyệt]
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Bước 2 & 3 */}
          <Card className="guide-step-card">
            <Row gutter={[20, 20]} align="middle">
              <Col xs={24} md={12}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className="guide-badge-num">2</div>
                  <div>
                    <Title level={5} style={{ margin: '0 0 6px 0' }}>
                      Chọn Loại đơn & Thời gian áp dụng
                    </Title>
                    <Paragraph style={{ color: '#595959', marginBottom: 8 }}>
                      Hệ thống hỗ trợ đầy đủ các loại đơn phổ biến:
                    </Paragraph>
                    <ul style={{ paddingLeft: 20, color: '#262626', lineHeight: 1.8 }}>
                      <li>
                        <Tag color="blue">Đi muộn / Về sớm (Miễn)</Tag>: Dành cho lý do bất khả kháng được công ty miễn trừ phạt.
                      </li>
                      <li>
                        <Tag color="purple">Đi muộn / Về sớm (Xin làm bù)</Tag>: Đi muộn buổi sáng và đăng ký bù lại sau 17h.
                      </li>
                      <li>
                        <Tag color="magenta">Làm thông trưa</Tag>: Không nghỉ trưa để được về sớm lúc 16h00.
                      </li>
                      <li>
                        <Tag color="green">Nghỉ phép năm (Có lương)</Tag>: Hệ thống sẽ hiển thị số ngày phép khả dụng còn lại của bạn.
                      </li>
                      <li>
                        <Tag color="volcano">Nghỉ không lương</Tag>: Khi đã hết phép năm hoặc có việc riêng.
                      </li>
                      <li>
                        <Tag color="gold">Tăng ca (OT sau 17h)</Tag>: Đăng ký làm thêm giờ có tính tiền OT và thưởng bậc.
                      </li>
                      <li>
                        <Tag color="orange">Giải trình quên chấm công</Tag>: Khi có đi làm nhưng quên quẹt vân tay.
                      </li>
                    </ul>
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                {/* Mockup minh họa bước 2: Form */}
                <div className="mockup-window">
                  <div className="mockup-header">
                    <span className="mockup-dot" style={{ background: '#ff5f56' }} />
                    <span className="mockup-dot" style={{ background: '#ffbd2e' }} />
                    <span className="mockup-dot" style={{ background: '#27c93f' }} />
                    <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>Cửa sổ Gửi đơn</span>
                  </div>
                  <div className="mockup-form-item">
                    <small style={{ color: '#8c8c8c' }}>Loại đơn:</small>
                    <div style={{ fontWeight: 600, color: '#1677ff', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Nghỉ phép năm (Có hưởng lương)</span>
                      <span className="mockup-pointer-pill">Chọn loại</span>
                    </div>
                  </div>
                  <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '6px 10px', borderRadius: 4, marginBottom: 10, fontSize: 12, color: '#389e0d' }}>
                    ℹ️ Quỹ phép năm khả dụng: <b>12 ngày</b> (Đã dùng: 0/12)
                  </div>
                  <div className="mockup-form-item">
                    <small style={{ color: '#8c8c8c' }}>Ngày xin phép:</small>
                    <div style={{ fontWeight: 600 }}>25/11/2026 📅</div>
                  </div>
                  <div className="mockup-form-item">
                    <small style={{ color: '#8c8c8c' }}>Thời lượng nghỉ:</small>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <Tag color="blue" style={{ flex: 1, textAlign: 'center' }}>Cả ngày (1 ngày)</Tag>
                      <Tag style={{ flex: 1, textAlign: 'center' }}>Nửa ngày sáng</Tag>
                      <Tag style={{ flex: 1, textAlign: 'center' }}>Nửa ngày chiều</Tag>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Bước 4 */}
          <Card className="guide-step-card">
            <Row gutter={[20, 20]} align="middle">
              <Col xs={24} md={12}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className="guide-badge-num">3</div>
                  <div>
                    <Title level={5} style={{ margin: '0 0 6px 0' }}>
                      Ghi lý do chi tiết & Bấm "Gửi đơn"
                    </Title>
                    <Paragraph style={{ color: '#595959', marginBottom: 8 }}>
                      • Nhập lý do ngắn gọn nhưng rõ ràng (Ví dụ: <i>Khám bệnh tại viện 108</i>, <i>Đưa con đi tiêm chủng</i>, <i>Hoàn thành gấp dự án cuối tháng</i>...).
                      <br />
                      • Bấm nút <b>"Gửi đơn"</b>.
                    </Paragraph>
                    <Paragraph style={{ color: '#595959' }}>
                      Đơn sẽ chuyển sang trạng thái <Tag color="orange">Chờ duyệt</Tag>. Khi người quản lý hoặc Ban Giám Đốc bấm duyệt, trạng thái chuyển thành <Tag color="green">Đã duyệt</Tag> và hệ thống tự động ghi nhận công, xóa phạt đi muộn hoặc trừ ngày phép tương ứng.
                    </Paragraph>
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 14 }}>
                  <Text strong style={{ color: '#262626' }}>
                    💡 Mẹo hay cho nhân sự:
                  </Text>
                  <ul style={{ paddingLeft: 18, marginTop: 6, color: '#595959', fontSize: 13, lineHeight: 1.6 }}>
                    <li>
                      Nếu đơn vẫn ở trạng thái <Tag color="orange">Chờ duyệt</Tag> mà bạn đổi ý không muốn nghỉ nữa, bạn hoàn toàn có thể bấm nút <b>"Hủy đơn"</b> màu đỏ.
                    </li>
                    <li>
                      Với đơn xin làm bù: Hãy quẹt vân tay ra về sau 17h để máy ghi nhận thời gian làm bù thực tế.
                    </li>
                  </ul>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* NỘI DUNG 2: KIỂM TRA CHẤM CÔNG */}
      {activeTab === 'attendance' && (
        <div>
          <Alert
            message="Chủ động kiểm tra chấm công hàng ngày / hàng tuần"
            description="Dữ liệu quẹt vân tay được đồng bộ trực tiếp từ máy chấm công. Bạn nên kiểm tra định kỳ để phát hiện sớm các ngày quên quẹt thẻ hoặc bị ghi nhận đi muộn, từ đó nộp đơn giải trình kịp thời trước khi chốt lương."
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 20 }}
          />

          <Row gutter={[20, 20]}>
            <Col xs={24} md={14}>
              <Card className="guide-step-card" title="📌 Các bước kiểm tra chấm công cá nhân:">
                <div style={{ display: 'flex', marginBottom: 16 }}>
                  <div className="guide-badge-num">1</div>
                  <div>
                    <Text strong>Truy cập mục "Chấm công"</Text>
                    <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>
                      Bấm vào menu <b>"Chấm công"</b> (biểu tượng lịch) ở thanh điều hướng.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', marginBottom: 16 }}>
                  <div className="guide-badge-num">2</div>
                  <div>
                    <Text strong>Chọn Tháng cần tra cứu</Text>
                    <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>
                      Mặc định hệ thống mở tháng hiện tại. Bạn có thể chọn tháng trước để kiểm tra lại công cả tháng.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', marginBottom: 16 }}>
                  <div className="guide-badge-num">3</div>
                  <div>
                    <Text strong>Xem 4 thẻ tóm tắt tổng quan đầu trang</Text>
                    <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>
                      • <b>Tổng ngày công thực tế:</b> Số ngày bạn đã đi làm trong tháng.
                      <br />
                      • <b>Số lần & số phút đi muộn:</b> Tổng thời gian bị trễ giờ làm sáng.
                      <br />
                      • <b>Số giờ tăng ca (OT):</b> Số giờ làm thêm được duyệt.
                      <br />
                      • <b>Nghỉ lễ / phép năm:</b> Ngày công được tính lương theo quy định.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex' }}>
                  <div className="guide-badge-num">4</div>
                  <div>
                    <Text strong>Kiểm tra chi tiết từng ngày trong bảng</Text>
                    <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>
                      Bảng liệt kê rõ Giờ vào (In), Giờ ra (Out), Trạng thái (Đi đúng giờ, Muộn XX phút, Quên chấm công...).
                    </div>
                  </div>
                </div>

                {onNavigateTo && (
                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<CalendarOutlined />}
                    style={{ marginTop: 16 }}
                    onClick={() => onNavigateTo('/attendance')}
                    className="no-print-guide"
                  >
                    Xem bảng Chấm công của tôi ngay
                  </Button>
                )}
              </Card>
            </Col>

            <Col xs={24} md={10}>
              {/* Mockup Bảng chấm công */}
              <div className="mockup-window">
                <div className="mockup-header">
                  <span className="mockup-dot" style={{ background: '#ff5f56' }} />
                  <span className="mockup-dot" style={{ background: '#ffbd2e' }} />
                  <span className="mockup-dot" style={{ background: '#27c93f' }} />
                  <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>Màn hình Chấm công cá nhân</span>
                </div>

                {/* 2 mini stats */}
                <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                  <Col span={12}>
                    <div style={{ background: '#e6f4ff', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#0958d9' }}>Công thực tế</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>24.5 ngày</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ background: '#fff2f0', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#cf1322' }}>Đi muộn</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4d4f' }}>1 lần (12p)</div>
                    </div>
                  </Col>
                </Row>

                {/* Mockup Rows */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                    <span><b>04/11 (Thứ 4)</b></span>
                    <span>07:55 - 17:05</span>
                    <Tag color="green">Đúng giờ (1.0 công)</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12 }}>
                    <span><b>05/11 (Thứ 5)</b></span>
                    <span>08:12 - 17:30</span>
                    <Tag color="volcano">Muộn 12p (Đã làm bù)</Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                    <span><b>06/11 (Thứ 6)</b></span>
                    <span>07:58 - 19:00</span>
                    <Tag color="gold">OT 2.0h</Tag>
                  </div>
                </div>

                <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, fontSize: 12, color: '#d46b08' }}>
                  ⚠️ <b>Lưu ý:</b> Nếu thấy ngày nào hiển thị <i>"Thiếu quẹt thẻ"</i>, hãy qua mục <b>Quản lý Đơn từ</b> nộp ngay đơn <i>"Giải trình quên chấm công"</i>.
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* NỘI DUNG 3: XEM PHIẾU LƯƠNG */}
      {activeTab === 'payslip' && (
        <div>
          <Alert
            message="Minh bạch - Rõ ràng - Bảo mật tuyệt đối"
            description="Phiếu lương được tính toán tự động dựa trên ngày công chấm thực tế, tỷ lệ hoàn thành KPI, số giờ tăng ca OT và các khoản thưởng/phạt. Mỗi nhân viên chỉ có thể xem phiếu lương của chính mình."
            type="warning"
            showIcon
            icon={<SafetyCertificateOutlined />}
            style={{ marginBottom: 20 }}
          />

          <Row gutter={[20, 20]}>
            <Col xs={24} md={14}>
              <Card className="guide-step-card" title="📌 Cách đọc và kiểm tra Phiếu lương của bạn:">
                <Paragraph style={{ color: '#595959', marginBottom: 16 }}>
                  Vào mục <b>"Phiếu lương của tôi"</b> (biểu tượng đồng tiền 💵). Chọn tháng cần xem. Phiếu lương được chia làm 3 phần cực kỳ rõ ràng:
                </Paragraph>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                    1. Các khoản THU NHẬP (Cộng vào):
                  </Text>
                  <ul style={{ paddingLeft: 20, marginTop: 6, marginBottom: 0, color: '#334155', lineHeight: 1.7 }}>
                    <li><b>Lương cơ bản (LCB):</b> Tính theo số ngày đi làm thực tế + ngày nghỉ lễ.</li>
                    <li><b>Phụ cấp (10%):</b> Theo thỏa thuận hợp đồng lao động.</li>
                    <li><b>Lương chuyên môn:</b> Tính theo tay nghề và ngày công thực tế.</li>
                    <li><b>Lương KPI:</b> Lương hiệu quả công việc = Mức KPI × % hoàn thành KPI trong tháng (mặc định 100%).</li>
                    <li><b>Làm thêm giờ (OT):</b> Tiền lương tăng ca + Tiền thưởng bậc OT (thưởng thêm lũy tiến khi OT nhiều).</li>
                    <li><b>Thưởng Ban Giám Đốc / Thưởng lễ:</b> Các khoản thưởng nóng, thưởng dự án hoặc tiền thưởng ngày lễ.</li>
                  </ul>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <Text strong style={{ color: '#cf1322', fontSize: 15 }}>
                    2. Các khoản GIẢM TRỪ (Trừ đi):
                  </Text>
                  <ul style={{ paddingLeft: 20, marginTop: 6, marginBottom: 0, color: '#334155', lineHeight: 1.7 }}>
                    <li><b>Bảo hiểm (10.5%):</b> Gồm BHXH (8%), BHYT (1.5%), BHTN (1%) trích nộp theo quy định nhà nước.</li>
                    <li><b>Kinh phí Công đoàn:</b> (Nếu có).</li>
                    <li><b>Thuế Thu nhập cá nhân (TNCN):</b> Tạm tính theo biểu thuế lũy tiến (đã trừ 11tr bản thân + 4.4tr/người phụ thuộc).</li>
                    <li><b>Tạm ứng lương:</b> Khoản tiền bạn đã tạm ứng trước trong tháng.</li>
                    <li><b>Phạt muộn / vi phạm:</b> Các lỗi đi muộn không gửi đơn làm bù hoặc vi phạm nội quy.</li>
                  </ul>
                </div>

                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: 12, borderRadius: 8 }}>
                  <Text strong style={{ color: '#389e0d', fontSize: 15 }}>
                    3. THỰC LĨNH CHUYỂN KHOẢN (Net Salary):
                  </Text>
                  <Paragraph style={{ color: '#27272a', margin: '4px 0 0 0' }}>
                    = <b>Tổng thu nhập</b> trừ đi <b>Tổng các khoản giảm trừ</b>. Đây chính là số tiền chính xác công ty sẽ chuyển khoản vào Số tài khoản ngân hàng của bạn vào kỳ thanh toán lương!
                  </Paragraph>
                </div>

                {onNavigateTo && (
                  <Button
                    type="primary"
                    ghost
                    size="small"
                    icon={<DollarOutlined />}
                    style={{ marginTop: 16 }}
                    onClick={() => onNavigateTo('/my-payslip')}
                    className="no-print-guide"
                  >
                    Mở trang Phiếu lương của tôi
                  </Button>
                )}
              </Card>
            </Col>

            <Col xs={24} md={10}>
              {/* Mockup Phiếu lương */}
              <div className="mockup-window" style={{ background: '#fff' }}>
                <div className="mockup-header">
                  <span className="mockup-dot" style={{ background: '#ff5f56' }} />
                  <span className="mockup-dot" style={{ background: '#ffbd2e' }} />
                  <span className="mockup-dot" style={{ background: '#27c93f' }} />
                  <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>Mô phỏng Phiếu lương cá nhân</span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a8a' }}>PHIẾU LƯƠNG THÁNG 10/2026</div>
                  <small style={{ color: '#8c8c8c' }}>Nhân viên: Nguyễn Văn A (NV023)</small>
                </div>

                <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>• Lương thời gian (24/24 công):</span>
                    <b>5,000,000 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>• Phụ cấp 10%:</span>
                    <b>500,000 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>• Lương chuyên môn:</span>
                    <b>4,500,000 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>• Lương KPI (Đạt 110%):</span>
                    <b style={{ color: '#722ed1' }}>2,200,000 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>• Tăng ca OT (8 tiếng) + Thưởng bậc:</span>
                    <b style={{ color: '#1677ff' }}>600,000 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #d9d9d9', color: '#1677ff' }}>
                    <b>TỔNG THU NHẬP GỘP:</b>
                    <b>12,800,000 đ</b>
                  </div>
                </div>

                <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 10, fontSize: 12, marginBottom: 10, background: '#fff2f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#cf1322' }}>
                    <span>• Bảo hiểm (10.5% lương LCB):</span>
                    <b>-525,000 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#cf1322' }}>
                    <span>• Thuế TNCN tạm tính:</span>
                    <b>0 đ</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed #ffccc7', color: '#cf1322' }}>
                    <b>TỔNG GIẢM TRỪ:</b>
                    <b>-525,000 đ</b>
                  </div>
                </div>

                <div style={{ background: '#f6ffed', border: '2px solid #52c41a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#237804', fontWeight: 600 }}>THỰC LĨNH CHUYỂN KHOẢN:</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#389e0d', margin: '4px 0' }}>
                    12,275,000 VNĐ
                  </div>
                  <small style={{ color: '#8c8c8c' }}>Ngân hàng Vietcombank - STK: 1029384756</small>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* Footer Support Notice */}
      <Divider style={{ margin: '24px 0' }} />
      <Card size="small" style={{ background: '#f8fafc', borderRadius: 8, borderColor: '#e2e8f0' }}>
        <Row align="middle" justify="space-between" gutter={[12, 12]}>
          <Col xs={24} md={18}>
            <Space>
              <QuestionCircleOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <div>
                <b>Bạn cần trợ giúp thêm hoặc có thắc mắc về số liệu chấm công, tính lương?</b>
                <div style={{ color: '#595959', fontSize: 13 }}>
                  Vui lòng liên hệ trực tiếp Bộ phận Nhân sự (Phòng HR) hoặc quản lý trực tiếp của bạn để được hỗ trợ và giải đáp nhanh nhất.
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
              Hotline HR: 0965.648.493
            </Tag>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

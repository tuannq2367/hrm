const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  if (command === 'list') {
    const status = args[1] || 'OPEN';
    const errors = await prisma.systemError.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log(`\n=== DANH SÁCH LỖI HỆ THỐNG [Trạng thái: ${status}] (${errors.length}) ===\n`);
    if (errors.length === 0) {
      console.log('✨ Không có lỗi nào!');
    } else {
      errors.forEach((err, idx) => {
        console.log(`[${idx + 1}] Mã: ${err.errorTraceId} | ${err.method} ${err.path}`);
        console.log(`    Thông điệp: ${err.message}`);
        console.log(`    Thời gian: ${err.createdAt.toLocaleString('vi-VN')}`);
        console.log(`    Trạng thái: ${err.status}${err.status === 'RESOLVED' ? ` (Ghi chú: ${err.resolutionNote})` : ''}`);
        console.log('------------------------------------------------------------');
      });
      console.log('\n💡 Để xem chi tiết stack trace: node scripts/manage-errors.js detail <Mã-Lỗi>');
      console.log('💡 Để đánh dấu đã sửa: node scripts/manage-errors.js resolve <Mã-Lỗi> [Ghi-chú-sửa]');
    }
  } else if (command === 'detail') {
    const code = args[1];
    if (!code) {
      console.log('Vui lòng nhập mã lỗi: node scripts/manage-errors.js detail <Mã-Lỗi>');
      return;
    }
    const err = await prisma.systemError.findFirst({
      where: { errorTraceId: code },
    });
    if (!err) {
      console.log(`Không tìm thấy lỗi với mã: ${code}`);
      return;
    }
    console.log(`\n=== CHI TIẾT LỖI: ${err.errorTraceId} ===`);
    console.log(`Đường dẫn: ${err.method} ${err.path} (HTTP ${err.statusCode})`);
    console.log(`Thông báo: ${err.message}`);
    console.log(`Trạng thái: ${err.status}`);
    console.log(`Stack trace:\n${err.stack || '(Không có stack trace)'}`);
  } else if (command === 'resolve') {
    const code = args[1];
    const note = args.slice(2).join(' ') || 'Đã khắc phục xong';
    if (!code) {
      console.log('Vui lòng nhập mã lỗi: node scripts/manage-errors.js resolve <Mã-Lỗi> [Ghi chú]');
      return;
    }
    const err = await prisma.systemError.findFirst({
      where: { errorTraceId: code },
    });
    if (!err) {
      console.log(`Không tìm thấy lỗi với mã: ${code}`);
      return;
    }
    await prisma.systemError.update({
      where: { id: err.id },
      data: {
        status: 'RESOLVED',
        resolutionNote: note,
        resolvedAt: new Date(),
        resolvedBy: 'CLI Admin',
      },
    });
    console.log(`✅ Đã chuyển trạng thái lỗi ${code} sang RESOLVED!`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

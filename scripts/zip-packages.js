const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function zipDir(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(sourceDir)) {
      return reject(new Error(`Source directory ${sourceDir} does not exist.`));
    }
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`✅ Đã đóng gói thành công ${path.basename(outPath)} (${(archive.pointer() / (1024 * 1024)).toFixed(2)} MB)`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  console.log('🚀 Bắt đầu tạo file ZIP triển khai...');
  await zipDir(path.join(__dirname, '..', 'deploy_update_only'), path.join(__dirname, '..', 'deploy_UPDATE_ONLY.zip'));
  await zipDir(path.join(__dirname, '..', 'deploy_hosting'), path.join(__dirname, '..', 'deploy_FULL_SETUP.zip'));
  console.log('🎉 Hoàn tất nén file ZIP!');
}

main().catch((err) => {
  console.error('❌ Lỗi khi nén ZIP:', err);
  process.exit(1);
});

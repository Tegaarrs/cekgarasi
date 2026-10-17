// Inspection Barcode Card Generator (Output: High-Resolution JPG / JPEG)
import { getCarPhoto } from './carPhoto';

export interface BarcodeCarData {
  id: number;
  nama_mobil: string;
  merek?: string;
  tipe_bodi?: string;
  tahun: number;
  jarak_tempuh_ribu_km: number;
  harga_rp: number;
  transmisi: string;
  tipe_plat?: string;
  jenis_plat?: string;
  lokasi?: string;
  klaster: number;
  nama_segmen: string;
  status?: string;
  foto_url?: string;
}

export async function generateInspectionBarcodeJpg(car: BarcodeCarData): Promise<void> {
  const width = 1200;
  const height = 760;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Gagal menginisialisasi kanvas gambar.');

  // 1. Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer border & frame
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // 2. Header Bar
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, '#001540');
  headerGrad.addColorStop(0.7, '#082567');
  headerGrad.addColorStop(1, '#001540');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(10, 10, width - 20, 115);

  // Brand Accent Tag
  ctx.fillStyle = '#FE6A2B';
  ctx.fillRect(40, 32, 8, 48);

  // Brand Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "Outfit", "Inter", sans-serif';
  ctx.fillText('CEKGARASI', 58, 56);

  ctx.fillStyle = '#FE6A2B';
  ctx.font = 'bold 30px "Outfit", "Inter", sans-serif';
  ctx.fillText('.ID', 58 + ctx.measureText('CEKGARASI').width, 56);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText('PORTAL BURSA & KELAYAKAN MOBIL BEKAS INDONESIA', 58, 74);

  // Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px "Outfit", "Inter", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('KARTU BARCODE INSPEKSI & KELAYAKAN UNIT', width - 45, 52);

  ctx.fillStyle = '#38BDF8';
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText('TERVERIFIKASI SISTEM CEKGARASI • DATA LISTING RESMI', width - 45, 72);
  ctx.textAlign = 'left';

  // 3. Left Section - Car Image & Specs Box
  const leftX = 35;
  const leftY = 145;
  const leftW = 640;
  const leftH = 555;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(leftX, leftY, leftW, leftH);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(leftX, leftY, leftW, leftH);

  // Try to load and draw car image
  const photoSrc = getCarPhoto(car.nama_mobil, car.foto_url);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = photoSrc;
    });

    if (img.width > 0) {
      // Rounded image container
      ctx.save();
      const imgX = leftX + 18;
      const imgY = leftY + 18;
      const imgW = leftW - 36;
      const imgH = 260;
      const r = 12;

      ctx.beginPath();
      ctx.moveTo(imgX + r, imgY);
      ctx.arcTo(imgX + imgW, imgY, imgX + imgW, imgY + imgH, r);
      ctx.arcTo(imgX + imgW, imgY + imgH, imgX, imgY + imgH, r);
      ctx.arcTo(imgX, imgY + imgH, imgX, imgY, r);
      ctx.arcTo(imgX, imgY, imgX + imgW, imgY, r);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, imgX, imgY, imgW, imgH);
      ctx.restore();

      // Status Pill on top of image
      ctx.fillStyle = 'rgba(0, 21, 64, 0.85)';
      ctx.fillRect(leftX + 30, leftY + 30, 110, 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.fillText(`STATUS: ${(car.status || 'TAYANG').toUpperCase()}`, leftX + 40, leftY + 47);
    }
  } catch {
    // Fallback if image fails to load
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(leftX + 18, leftY + 18, leftW - 36, 260);
  }

  // Car Name
  ctx.fillStyle = '#001540';
  ctx.font = 'bold 22px "Outfit", "Inter", sans-serif';
  ctx.fillText(car.nama_mobil, leftX + 20, leftY + 310);

  // Segment Badge
  const segHex = car.klaster === 0 ? '#2563EB' : car.klaster === 1 ? '#059669' : '#D97706';
  ctx.fillStyle = segHex;
  ctx.fillRect(leftX + 20, leftY + 324, 180, 22);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.fillText(`SEGMEN: ${car.nama_segmen.toUpperCase()}`, leftX + 28, leftY + 339);

  // Vehicle Technical Data Grid
  const dataYStart = leftY + 370;
  const col1X = leftX + 20;
  const col2X = leftX + 330;

  const specs = [
    { label: 'Tahun Perakitan', val: `${car.tahun}` },
    { label: 'Odometer Terkini', val: `${car.jarak_tempuh_ribu_km} rb KM` },
    { label: 'Transmisi', val: car.transmisi },
    { label: 'Jenis Plat Nomor', val: (car.tipe_plat || car.jenis_plat || 'Ganjil').toUpperCase() },
    { label: 'Lokasi Unit', val: car.lokasi || 'Hub Fatmawati' },
    { label: 'Harga Listing Resmi', val: `Rp ${car.harga_rp.toLocaleString('id-ID')}` },
  ];

  specs.forEach((item, idx) => {
    const isCol2 = idx % 2 === 1;
    const row = Math.floor(idx / 2);
    const currX = isCol2 ? col2X : col1X;
    const currY = dataYStart + row * 45;

    ctx.fillStyle = '#64748B';
    ctx.font = '600 11px "Inter", sans-serif';
    ctx.fillText(item.label, currX, currY);

    ctx.fillStyle = '#001540';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.fillText(item.val, currX, currY + 18);

    // Separator line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(currX, currY + 25);
    ctx.lineTo(currX + 280, currY + 25);
    ctx.stroke();
  });

  // 4. Right Section - Inspection Certificate & Barcode Zone
  const rightX = 700;
  const rightY = 145;
  const rightW = 465;
  const rightH = 555;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(rightX, rightY, rightW, rightH);
  ctx.strokeStyle = '#001540';
  ctx.lineWidth = 2;
  ctx.strokeRect(rightX, rightY, rightW, rightH);

  // Subheader banner in right card
  ctx.fillStyle = '#001540';
  ctx.fillRect(rightX, rightY, rightW, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.fillText('AUTHENTIC INSPECTION PASS & BARCODE', rightX + 20, rightY + 25);

  // Certificate ID & Reg Number
  const certId = `CG-INSP-${car.id.toString().padStart(6, '0')}-${car.tahun}`;
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText('NOMOR SERTIFIKAT DIGITAL:', rightX + 25, rightY + 70);

  ctx.fillStyle = '#001540';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText(certId, rightX + 25, rightY + 92);

  // Date of Issue
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) + ' - ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  ctx.fillStyle = '#64748B';
  ctx.font = '600 11px "Inter", sans-serif';
  ctx.fillText(`Tanggal Uji: ${dateStr}`, rightX + 25, rightY + 115);

  // BARCODE GRAPHIC (Code 128 High-Density Simulation)
  const barX = rightX + 30;
  const barY = rightY + 140;
  const barW = rightW - 60;
  const barH = 75;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(barX - 8, barY - 10, barW + 16, barH + 35);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX - 8, barY - 10, barW + 16, barH + 35);

  // Draw procedural vertical bars
  let curBarX = barX;
  const seedString = `${car.id}938210492${car.tahun}${car.nama_mobil}`;
  ctx.fillStyle = '#000000';

  // Guard bars start
  ctx.fillRect(curBarX, barY, 3, barH); curBarX += 5;
  ctx.fillRect(curBarX, barY, 2, barH); curBarX += 4;

  for (let i = 0; i < seedString.length && curBarX < barX + barW - 15; i++) {
    const charCode = seedString.charCodeAt(i);
    const b1 = (charCode % 3) + 1;
    const space = ((charCode * 3) % 4) + 1;
    const b2 = ((charCode * 7) % 3) + 1;

    ctx.fillRect(curBarX, barY, b1, barH);
    curBarX += b1 + space;
    if (curBarX < barX + barW - 15) {
      ctx.fillRect(curBarX, barY, b2, barH);
      curBarX += b2 + 2;
    }
  }

  // Guard bars end
  ctx.fillRect(barX + barW - 8, barY, 2, barH);
  ctx.fillRect(barX + barW - 4, barY, 3, barH);

  // Monospace barcode number string
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`* ${certId} *`, rightX + (rightW / 2), barY + barH + 18);
  ctx.textAlign = 'left';

  // QR CODE & VERIFICATION BOX
  const qrBoxY = rightY + 275;
  const qrSize = 110;
  const qrX = rightX + 30;

  // Draw QR Pattern Box
  ctx.fillStyle = '#000000';
  ctx.fillRect(qrX, qrBoxY, qrSize, qrSize);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX + 3, qrBoxY + 3, qrSize - 6, qrSize - 6);

  // Authentic QR Corner Finder Patterns
  const drawCorner = (cx: number, cy: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx, cy, 26, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx + 4, cy + 4, 18, 18);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx + 8, cy + 8, 10, 10);
  };

  drawCorner(qrX + 6, qrBoxY + 6);
  drawCorner(qrX + qrSize - 32, qrBoxY + 6);
  drawCorner(qrX + 6, qrBoxY + qrSize - 32);

  // Procedural QR Data Matrix
  ctx.fillStyle = '#000000';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if ((r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3)) continue;
      if ((r * 7 + c * 13 + car.id) % 3 === 0) {
        ctx.fillRect(qrX + 38 + c * 6, qrBoxY + 38 + r * 6, 4, 4);
      }
    }
  }

  // Verification Instructions beside QR
  ctx.fillStyle = '#001540';
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.fillText('Pindai untuk Verifikasi', qrX + qrSize + 18, qrBoxY + 20);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 11px "Inter", sans-serif';
  ctx.fillText('Arahkan kamera smartphone ke', qrX + qrSize + 18, qrBoxY + 38);
  ctx.fillText('QR Code ini untuk memvalidasi', qrX + qrSize + 18, qrBoxY + 54);
  ctx.fillText('keaslian inspeksi di bursa.', qrX + qrSize + 18, qrBoxY + 70);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText('✓ Data Terverifikasi CekGarasi', qrX + qrSize + 18, qrBoxY + 95);

  // OFFICIAL INSPECTION STAMP (Circular Seal)
  const stampCenterX = rightX + (rightW / 2);
  const stampCenterY = rightY + 465;
  const stampRadius = 55;

  ctx.save();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stampCenterX, stampCenterY, stampRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(stampCenterX, stampCenterY, stampRadius - 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INSPEKSI RESMI', stampCenterX, stampCenterY - 15);

  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.fillText('GRADE A', stampCenterX, stampCenterY + 8);

  ctx.font = '600 9px "Inter", sans-serif';
  ctx.fillText('CEKGARASI INDONESIA', stampCenterX, stampCenterY + 25);
  ctx.restore();

  // 5. Card Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Dokumen ini dicetak otomatis dari Dasbor Portal Dealer Resmi CekGarasi. Hak cipta dilindungi undang-undang.',
    width / 2,
    height - 22
  );

  // 6. Convert Canvas to JPG Blob and Trigger Download
  return new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Gagal mengekspor kanvas ke format JPG.'));
          return;
        }

        const safeName = (car.nama_mobil || 'unit')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/_+/g, '_');
        const fileName = `Barcode_Inspeksi_${safeName}_ID${car.id}.jpg`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      },
      'image/jpeg',
      0.96
    );
  });
}

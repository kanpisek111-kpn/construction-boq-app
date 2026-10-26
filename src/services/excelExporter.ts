import * as XLSX from 'xlsx';
import { BOQItem, ConstructionCategory, QuotationMeta, PaymentMilestone } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface ExportBOQExcelParams {
  items: BOQItem[];
  projectName: string;
  houseAreaSqm: number;
  quotationMeta?: QuotationMeta;
  milestones?: PaymentMilestone[];
  overheadPercent?: number; // e.g. 10
  vatPercent?: number;      // e.g. 7
}

export function exportBOQToExcel({
  items,
  projectName = 'โครงการก่อสร้าง',
  houseAreaSqm = 120,
  quotationMeta,
  milestones = [],
  overheadPercent = 10,
  vatPercent = 0
}: ExportBOQExcelParams) {
  const wb = XLSX.utils.book_new();

  // จัดกลุ่มรายการตามหมวดงาน
  const categoriesOrder: ConstructionCategory[] = [
    'preparation',
    'structure',
    'roof',
    'masonry_wall',
    'doors_windows',
    'finishes',
    'decorations',
    'sanitary',
    'electrical',
    'external_works'
  ];

  const itemsByCategory: Record<ConstructionCategory, BOQItem[]> = {
    preparation: [],
    structure: [],
    roof: [],
    masonry_wall: [],
    doors_windows: [],
    finishes: [],
    decorations: [],
    sanitary: [],
    electrical: [],
    external_works: []
  };

  items.forEach(item => {
    if (itemsByCategory[item.category]) {
      itemsByCategory[item.category].push(item);
    } else {
      itemsByCategory.preparation.push(item);
    }
  });

  // สร้างแถวข้อมูลสำหรับ Sheet 1: รายการ BOQ
  const wsData: any[][] = [];

  // Header Title
  const docDate = quotationMeta?.issueDate || new Date().toISOString().split('T')[0];
  const clientName = quotationMeta?.customerName || 'เจ้าของโครงการ';
  const location = quotationMeta?.customerAddress || 'ไม่ระบุสถานที่';
  const contractorName = quotationMeta?.contractorName || 'ผู้รับเหมาก่อสร้าง';

  wsData.push(['ใบแสดงรายการปริมาณงานและราคา (BILL OF QUANTITIES - BOQ)']);
  wsData.push(['ชื่อโครงการ:', projectName, '', 'วันที่ทำรายการ:', docDate]);
  wsData.push(['เจ้าของโครงการ:', clientName, '', 'พื้นที่ใช้สอยรวม:', `${houseAreaSqm} ตารางเมตร`]);
  wsData.push(['สถานที่ก่อสร้าง:', location, '', 'ผู้จัดทำ / ผู้รับเหมา:', contractorName]);
  wsData.push([]); // แถวที่ 5: แถวว่าง

  // Table Column Headers (แถวที่ 6 ใน Excel)
  const tableHeaders = [
    'ลำดับ',
    'รายการงานก่อสร้าง',
    'รายละเอียด / สเปกวัสดุ',
    'จำนวน',
    'หน่วย',
    'ค่าวัสดุ/หน่วย',
    'รวมค่าวัสดุ (บาท)',
    'ค่าแรง/หน่วย',
    'รวมค่าแรง (บาท)',
    'รวมเป็นเงินทั้งสิ้น (บาท)',
    'หมายเหตุ'
  ];
  wsData.push(tableHeaders);

  let grandMatTotal = 0;
  let grandLabTotal = 0;
  let grandTotal = 0;
  let categoryIndex = 1;
  const categorySubtotalRows: number[] = [];

  // วนลูปตามแต่ละหมวดงาน
  categoriesOrder.forEach((catKey) => {
    const catItems = itemsByCategory[catKey];
    if (catItems.length === 0) return;

    const catLabel = CATEGORY_LABELS[catKey]?.title || catKey;
    
    // แถวหัวข้อหมวดงาน
    wsData.push([
      `หมวดที่ ${categoryIndex}`,
      catLabel,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    let catMatSum = 0;
    let catLabSum = 0;
    let catTotalSum = 0;
    const startItemRow = wsData.length + 1; // 1-based row ใน Excel

    catItems.forEach((item, itemIdx) => {
      const currentRow = wsData.length + 1; // 1-based row ใน Excel
      const qty = Number(item.quantity) || 0;
      const wasteFactor = 1 + ((Number(item.wastePercent) || 0) / 100);
      const effectiveQty = qty * wasteFactor;
      
      const matUnit = Number(item.materialUnitPrice) || 0;
      const labUnit = Number(item.laborUnitPrice) || 0;
      
      const matTotal = Math.round(effectiveQty * matUnit);
      const labTotal = Math.round(qty * labUnit);
      const rowTotal = matTotal + labTotal;

      catMatSum += matTotal;
      catLabSum += labTotal;
      catTotalSum += rowTotal;

      const wastePct = Number(item.wastePercent) || 0;
      const matFormula = wastePct > 0 
        ? `ROUND(D${currentRow}*F${currentRow}*(1+${wastePct}/100), 0)` 
        : `ROUND(D${currentRow}*F${currentRow}, 0)`;
      const labFormula = `ROUND(D${currentRow}*H${currentRow}, 0)`;
      const totalFormula = `G${currentRow}+I${currentRow}`;

      wsData.push([
        `${categoryIndex}.${itemIdx + 1}`,
        item.name || '',
        item.spec || '',
        Math.round(qty * 100) / 100,
        item.unit || '',
        matUnit,
        { t: 'n', v: matTotal, f: matFormula },
        labUnit,
        { t: 'n', v: labTotal, f: labFormula },
        { t: 'n', v: rowTotal, f: totalFormula },
        item.wastePercent ? `เผื่อเศษ ${item.wastePercent}%` : ''
      ]);
    });

    const endItemRow = wsData.length; // 1-based row ของไอเทมสุดท้าย
    const subtotalRow = wsData.length + 1;
    categorySubtotalRows.push(subtotalRow);

    // แถวรวมประจำหมวดงาน พร้อมสูตร SUM
    wsData.push([
      '',
      `รวม หมวดที่ ${categoryIndex}: ${catLabel}`,
      '',
      '',
      '',
      '',
      { t: 'n', v: catMatSum, f: `SUM(G${startItemRow}:G${endItemRow})` },
      '',
      { t: 'n', v: catLabSum, f: `SUM(I${startItemRow}:I${endItemRow})` },
      { t: 'n', v: catTotalSum, f: `SUM(J${startItemRow}:J${endItemRow})` },
      ''
    ]);
    wsData.push([]); // แถวคั่น

    grandMatTotal += catMatSum;
    grandLabTotal += catLabSum;
    grandTotal += catTotalSum;
    categoryIndex++;
  });

  // สรุปยอดรวมท้ายตาราง (Summary Block) พร้อมสูตรคำนวณเชื่อมโยง
  wsData.push(['สรุปมูลค่างานก่อสร้าง (SUMMARY)', '', '', '', '', '', '', '', '', '', '']);

  const matSubtotalFormula = categorySubtotalRows.map(r => `G${r}`).join('+');
  const labSubtotalFormula = categorySubtotalRows.map(r => `I${r}`).join('+');

  const matSumRow = wsData.length + 1;
  wsData.push([
    '1. รวมต้นทุนค่าวัสดุทั้งหมด (Total Material Cost)', 
    '', '', '', '', '', 
    { t: 'n', v: grandMatTotal, f: matSubtotalFormula || '0' }, 
    '', '', '', 'บาท'
  ]);

  const labSumRow = wsData.length + 1;
  wsData.push([
    '2. รวมต้นทุนค่าแรงทั้งหมด (Total Labor Cost)', 
    '', '', '', '', '', '', '', 
    { t: 'n', v: grandLabTotal, f: labSubtotalFormula || '0' }, 
    '', 'บาท'
  ]);

  const directCostRow = wsData.length + 1;
  wsData.push([
    '3. รวมต้นทุนตรงงานก่อสร้าง (Direct Construction Cost)', 
    '', '', '', '', '', '', '', '', 
    { t: 'n', v: grandTotal, f: `G${matSumRow}+I${labSumRow}` }, 
    'บาท'
  ]);
  
  const overheadAmount = Math.round(grandTotal * (overheadPercent / 100));
  const overheadRow = wsData.length + 1;
  wsData.push([
    `4. ค่าดำเนินการ, กำไร และการจัดการ (${overheadPercent}%)`, 
    '', '', '', '', '', '', '', '', 
    { t: 'n', v: overheadAmount, f: `ROUND(J${directCostRow}*${overheadPercent}/100, 0)` }, 
    'บาท'
  ]);
  
  const subTotalWithOverhead = grandTotal + overheadAmount;
  let vatAmount = 0;
  let vatRow = 0;
  if (vatPercent > 0) {
    vatAmount = Math.round(subTotalWithOverhead * (vatPercent / 100));
    vatRow = wsData.length + 1;
    wsData.push([
      `5. ภาษีมูลค่าเพิ่ม VAT (${vatPercent}%)`, 
      '', '', '', '', '', '', '', '', 
      { t: 'n', v: vatAmount, f: `ROUND((J${directCostRow}+J${overheadRow})*${vatPercent}/100, 0)` }, 
      'บาท'
    ]);
  }
  
  const finalNetTotal = subTotalWithOverhead + vatAmount;
  const grandTotalRow = wsData.length + 1;
  const grandTotalFormula = vatPercent > 0 
    ? `J${directCostRow}+J${overheadRow}+J${vatRow}` 
    : `J${directCostRow}+J${overheadRow}`;
  wsData.push([
    'ยอดรวมค่าก่อสร้างสุทธิทั้งสิ้น (GRAND TOTAL)', 
    '', '', '', '', '', '', '', '', 
    { t: 'n', v: finalNetTotal, f: grandTotalFormula }, 
    'บาท'
  ]);
  
  const costPerSqm = houseAreaSqm > 0 ? Math.round(finalNetTotal / houseAreaSqm) : 0;
  wsData.push([
    'ราคาเฉลี่ยต่อตารางเมตร (AVERAGE COST PER SQ.M.)', 
    '', '', '', '', '', '', '', '', 
    { t: 'n', v: costPerSqm, f: `ROUND(J${grandTotalRow}/${Math.max(1, houseAreaSqm)}, 0)` }, 
    'บาท / ตร.ม.'
  ]);

  // ลายเซ็น
  wsData.push([]);
  wsData.push(['ลงชื่อ......................................................ผู้เสนอราคา / ผู้รับเหมา', '', '', '', '', 'ลงชื่อ......................................................ผู้ว่าจ้าง / เจ้าของบ้าน']);
  wsData.push([`      ( ${contractorName} )`, '', '', '', '', `      ( ${clientName} )`]);
  wsData.push([`วันที่ ...... / ...... / ..........`, '', '', '', '', `วันที่ ...... / ...... / ..........`]);

  // สร้าง Worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // กำหนดความกว้างคอลัมน์ให้สวยงามและอ่านง่าย
  ws['!cols'] = [
    { wch: 10 }, // ลำดับ
    { wch: 36 }, // รายการ
    { wch: 42 }, // รายละเอียด/สเปก
    { wch: 10 }, // ปริมาณ
    { wch: 8 },  // หน่วย
    { wch: 14 }, // ค่าวัสดุ/หน่วย
    { wch: 18 }, // รวมค่าวัสดุ
    { wch: 14 }, // ค่าแรง/หน่วย
    { wch: 18 }, // รวมค่าแรง
    { wch: 22 }, // รวมทั้งสิ้น
    { wch: 18 }, // หมายเหตุ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'รายการประมาณราคา BOQ');

  // Sheet 2: แผนการเบิกจ่ายงวดงาน (Payment Milestones)
  if (milestones && milestones.length > 0) {
    const msData: any[][] = [];
    msData.push(['แผนและเงื่อนไขการเบิกจ่ายค่างวดงานก่อสร้าง (PAYMENT MILESTONES)']);
    msData.push(['ชื่อโครงการ:', projectName, '', 'ยอดรวมทั้งสิ้น:', finalNetTotal, 'บาท']);
    msData.push([]);
    msData.push(['งวดที่', 'ชื่องวดงาน', 'เปอร์เซ็นต์ (%)', 'จำนวนเงิน (บาท)', 'ระยะเวลาดำเนินงาน', 'รายละเอียดและผลงานที่ส่งมอบ']);

    milestones.forEach((m, idx) => {
      const amount = Math.round(finalNetTotal * ((m.percentage || 0) / 100));
      const rowNum = 5 + idx; // แถวข้อมูลใน Excel
      msData.push([
        `งวดที่ ${m.milestoneNumber || ''}`,
        m.title || '',
        `${m.percentage}%`,
        { t: 'n', v: amount, f: `ROUND(D2*${m.percentage}/100, 0)` },
        m.durationDays ? `${m.durationDays} วัน` : '-',
        m.deliverables?.join(', ') || ''
      ]);
    });

    const wsMilestones = XLSX.utils.aoa_to_sheet(msData);
    wsMilestones['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 55 }
    ];
    XLSX.utils.book_append_sheet(wb, wsMilestones, 'งวดงานก่อสร้าง');
  }

  // เซฟไฟล์และดาวน์โหลด
  const cleanFileName = `BOQ_${projectName.replace(/[\/\\:*?"<>|]/g, '_')}_${docDate}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}

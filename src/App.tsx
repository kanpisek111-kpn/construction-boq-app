import { exportBOQToExcel } from './services/excelExporter';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BOQItem, ConstructionCategory, QuotationMeta, ProjectSaveState, PaymentMilestone, ProjectStatus } from './types';
import { CATEGORY_LABELS, DEFAULT_STANDARD_BOQ, DEFAULT_BASE_AREA_SQM, DEFAULT_QUOTATION_META, DEFAULT_PAYMENT_MILESTONES, formatMilestonesToPaymentTerms } from './constants';
import { computeBOQSummary, scaleBOQByArea, generateSiteMaterialsProcurementList } from './services/calculator';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ProjectDashboardView } from './components/ProjectDashboardView';
import { BOQTable } from './components/BOQTable';
import { SiteProcurementView } from './components/SiteProcurementView';
import { GanttChartScheduleView } from './components/GanttChartScheduleView';
import { RoofEstimatorModal } from './components/RoofEstimatorModal';
import { StructureEstimatorModal } from './components/StructureEstimatorModal';
import { StairEstimatorModal } from './components/StairEstimatorModal';
import { PlanAnalyzerModal } from './components/PlanAnalyzerModal';
import { AluminumSelectorModal } from './components/AluminumSelectorModal';
import { TileSelectorModal } from './components/TileSelectorModal';
import { MasonryEstimatorModal } from './components/MasonryEstimatorModal';
import { RoomDoorSelectorModal } from './components/RoomDoorSelectorModal';
import { ExternalWorksModal } from './components/ExternalWorksModal';
import { DecorationEstimatorModal } from './components/DecorationEstimatorModal';
import { ElectricalEstimatorModal } from './components/ElectricalEstimatorModal';
import { SanitaryEstimatorModal } from './components/SanitaryEstimatorModal';
import { SanitaryFixtureSelectorModal } from './components/SanitaryFixtureSelectorModal';
import { QuotationPrintModal } from './components/QuotationPrintModal';
import { MilestonesManagerModal } from './components/MilestonesManagerModal';
import { PaintEstimatorModal } from './components/PaintEstimatorModal';
import { Flow } from 'flow-sdk';
const DRAFT_STORAGE_KEY = 'thai_boq_project_draft_v1';
const PROJECTS_LIST_KEY = 'thai_boq_projects_list_v1';
const ACTIVE_PROJECT_ID_KEY = 'thai_boq_active_project_id_v1';
function generateId(): string {
  return 'proj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}
function makeDefaultProject(
  name = 'บ้านพักอาศัย คสล. 1-2 ชั้น พร้อมรั้วและโรงจอดรถ', 
  area = 120,
  clientName = 'คุณสมศักดิ์ สุขเจริญ (เจ้าของโครงการ)',
  clientPhone = '081-234-5678',
  clientAddress = 'แปลงที่ 14 หมู่บ้านสุขนิเวศน์ ต.บางกรวย อ.บางกรวย จ.นนทบุรี',
  status: ProjectStatus = 'draft'
): ProjectSaveState {
  const scaledItems = scaleBOQByArea(DEFAULT_STANDARD_BOQ, area, DEFAULT_BASE_AREA_SQM);
  return {
    id: generateId(),
    version: '1.0',
    savedAt: new Date().toISOString(),
    projectName: name,
    houseAreaSqm: area,
    overheadPercent: 7,
    vatPercent: 7,
    items: scaledItems,
    quotationMeta: {
      ...DEFAULT_QUOTATION_META,
      customerName: clientName,
      customerPhone: clientPhone,
      customerAddress: clientAddress,
    },
    milestones: DEFAULT_PAYMENT_MILESTONES,
    projectStartDate: new Date().toISOString().split('T')[0],
    status,
  };
}
function loadProjectsList(): ProjectSaveState[] {
  try {
    const raw = localStorage.getItem(PROJECTS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // migrate legacy single project
    const legacy = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (legacy) {
      const p = JSON.parse(legacy) as ProjectSaveState;
      const migrated = { ...p, id: generateId() };
      return [migrated as ProjectSaveState];
    }
  } catch {}
  return [];
}
function saveProjectsList(list: ProjectSaveState[]): void {
  try { localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(list)); } catch {}
}
export default function App() {
  // ======== MULTI-PROJECT STATE ========
  const [projects, setProjects] = useState<ProjectSaveState[]>(() => {
    const list = loadProjectsList();
    if (list.length > 0) return list;
    const defaultProj = makeDefaultProject();
    saveProjectsList([defaultProj]);
    return [defaultProj];
  });
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const list = loadProjectsList();
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_ID_KEY) : null;
    if (savedId && list.some((p) => p.id === savedId)) return savedId;
    return list[0]?.id || 'proj-init';
  });
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  // Active project reference
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || makeDefaultProject();
  }, [projects, activeProjectId]);

  const [activeMainTab, setActiveMainTab] = useState<'dashboard' | 'boq_estimate' | 'site_procurement' | 'gantt_schedule'>('dashboard');
  const [houseAreaSqm, setHouseAreaSqm] = useState<number>(120);
  const [items, setItems] = useState<BOQItem[]>(DEFAULT_STANDARD_BOQ);
  const [selectedCategory, setSelectedCategory] = useState<ConstructionCategory | 'all'>('all');
  const [boqSearchQuery, setBoqSearchQuery] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('บ้านพักอาศัย คสล. 1-2 ชั้น พร้อมรั้วและโรงจอดรถ');
  const [overheadPercent, setOverheadPercent] = useState<number>(7);
  const [vatPercent, setVatPercent] = useState<number>(7);
  const [quotationMeta, setQuotationMeta] = useState<QuotationMeta>(DEFAULT_QUOTATION_META);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(DEFAULT_PAYMENT_MILESTONES);
  const [projectStartDate, setProjectStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  // Auto-save feedback state
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('');
  const [saveStatusToast, setSaveStatusToast] = useState<string>('');
  // Confirmation Modal for Resetting Quantities to 0
  const [isResetZeroModalOpen, setIsResetZeroModalOpen] = useState<boolean>(false);
  // Modals for each construction category & Milestones
  const [isRoofModalOpen, setIsRoofModalOpen] = useState<boolean>(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState<boolean>(false);
  const [isStairModalOpen, setIsStairModalOpen] = useState<boolean>(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [isAluminumModalOpen, setIsAluminumModalOpen] = useState<boolean>(false);
  const [isTileModalOpen, setIsTileModalOpen] = useState<boolean>(false);
  const [isMasonryModalOpen, setIsMasonryModalOpen] = useState<boolean>(false);
  const [isRoomDoorModalOpen, setIsRoomDoorModalOpen] = useState<boolean>(false);
  const [isDecorationModalOpen, setIsDecorationModalOpen] = useState<boolean>(false);
  const [isExternalModalOpen, setIsExternalModalOpen] = useState<boolean>(false);
  const [isElectricalModalOpen, setIsElectricalModalOpen] = useState<boolean>(false);
  const [isSanitaryModalOpen, setIsSanitaryModalOpen] = useState<boolean>(false);
  const [isSanitaryFixtureModalOpen, setIsSanitaryFixtureModalOpen] = useState<boolean>(false);
  const [isPaintModalOpen, setIsPaintModalOpen] = useState<boolean>(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState<boolean>(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  // Hidden File Input for Loading Project File
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Load Google Fonts & CSS securely
  useEffect(() => {
    try {
      const fontId = 'thai-boq-fonts';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sarabun:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
      }
      const styleId = 'thai-boq-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root {
            margin: 0; padding: 0; width: 100%; height: 100%;
            background: #0f172a;
            color: #f8fafc;
            font-family: 'Sarabun', 'Plus Jakarta Sans', sans-serif;
          }
          .material-symbols-outlined {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {
      console.warn('Font loading non-fatal issue', e);
    }
  }, []);
  // 1. กู้คืน Draft อัตโนมัติเมื่อเปิดโปรแกรม
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const savedDraft = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const parsed: ProjectSaveState = JSON.parse(savedDraft);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            setProjectName(parsed.projectName || 'บ้านพักอาศัย คสล. 1-2 ชั้น');
            setHouseAreaSqm(parsed.houseAreaSqm || 120);
            setOverheadPercent(typeof parsed.overheadPercent === 'number' ? parsed.overheadPercent : 7);
            setVatPercent(typeof parsed.vatPercent === 'number' ? parsed.vatPercent : 7);
            setItems(parsed.items);
            if (parsed.quotationMeta) setQuotationMeta(parsed.quotationMeta);
            if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
              setMilestones(parsed.milestones);
            }
            if (parsed.projectStartDate) setProjectStartDate(parsed.projectStartDate);
            setSaveStatusToast('กู้คืนงานร่างเรียบร้อย ✓');
            setTimeout(() => setSaveStatusToast(''), 3000);
          }
        }
      }
    } catch (e) {
      console.warn('Draft recovery skipped', e);
    }
  }, []);
  // 2. บันทึก Draft อัตโนมัติ + sync projects list
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const state: ProjectSaveState = {
          id: activeProjectId || generateId(),
          version: '1.0',
          savedAt: new Date().toISOString(),
          projectName,
          houseAreaSqm,
          overheadPercent,
          vatPercent,
          items,
          quotationMeta,
          milestones,
          projectStartDate
        };

        // Sync into projects list & localStorage
        setProjects((prev) => {
          const next = prev.map((p) => (p.id === activeProjectId ? state : p));
          saveProjectsList(next);
          return next;
        });

        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLastAutoSavedTime(timeStr);
      } catch (e) {
        console.warn('Auto-save error', e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [projectName, houseAreaSqm, overheadPercent, vatPercent, items, quotationMeta, milestones, projectStartDate, activeProjectId]);
  // ======== MULTI-PROJECT HANDLERS ========
  const handleSwitchProject = (id: string) => {
    // 1. Save current active project state first
    setProjects((prev) => {
      const currentState: ProjectSaveState = {
        id: activeProjectId,
        version: '1.0',
        savedAt: new Date().toISOString(),
        projectName,
        houseAreaSqm,
        overheadPercent,
        vatPercent,
        items,
        quotationMeta,
        milestones,
        projectStartDate,
      };
      const next = prev.map((p) => (p.id === activeProjectId ? currentState : p));
      saveProjectsList(next);
      return next;
    });

    // 2. Load target project
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    setActiveProjectId(id);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
    setProjectName(target.projectName);
    setHouseAreaSqm(target.houseAreaSqm);
    setOverheadPercent(target.overheadPercent ?? 7);
    setVatPercent(target.vatPercent ?? 7);
    setItems(target.items || DEFAULT_STANDARD_BOQ);
    if (target.quotationMeta) setQuotationMeta(target.quotationMeta);
    if (Array.isArray(target.milestones) && target.milestones.length > 0) {
      setMilestones(target.milestones);
    } else {
      setMilestones(DEFAULT_PAYMENT_MILESTONES);
    }
    if (target.projectStartDate) setProjectStartDate(target.projectStartDate);
    setSelectedCategory('all');
    setBoqSearchQuery('');
    setSaveStatusToast(`เปิดโครงการ "${target.projectName}" เรียบร้อย ✓`);
    setTimeout(() => setSaveStatusToast(''), 3000);
  };

  const handleCreateProject = (
    name: string,
    area: number,
    clientName?: string,
    clientPhone?: string,
    clientAddress?: string,
    status?: ProjectStatus
  ) => {
    const newProj = makeDefaultProject(
      name,
      area,
      clientName || 'คุณสมศักดิ์ สุขเจริญ (เจ้าของโครงการ)',
      clientPhone || '081-234-5678',
      clientAddress || 'แปลงที่ 14 หมู่บ้านสุขนิเวศน์ ต.บางกรวย อ.บางกรวย จ.นนทบุรี',
      status || 'draft'
    );
    setProjects((prev) => {
      const next = [...prev, newProj];
      saveProjectsList(next);
      return next;
    });

    // Switch to new project immediately
    setActiveProjectId(newProj.id);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, newProj.id);
    setProjectName(newProj.projectName);
    setHouseAreaSqm(newProj.houseAreaSqm);
    setOverheadPercent(newProj.overheadPercent);
    setVatPercent(newProj.vatPercent);
    setItems(newProj.items);
    setQuotationMeta(newProj.quotationMeta);
    setMilestones(newProj.milestones || DEFAULT_PAYMENT_MILESTONES);
    if (newProj.projectStartDate) setProjectStartDate(newProj.projectStartDate);

    setActiveMainTab('boq_estimate');
    setSaveStatusToast(`สร้างโครงการ "${newProj.projectName}" เรียบร้อย ✓`);
    setTimeout(() => setSaveStatusToast(''), 3000);
  };

  const handleDuplicateProject = (id: string) => {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const copy: ProjectSaveState = {
      ...source,
      id: generateId(),
      projectName: `${source.projectName} (สำเนา)`,
      savedAt: new Date().toISOString(),
    };
    setProjects((prev) => {
      const next = [...prev, copy];
      saveProjectsList(next);
      return next;
    });
    setSaveStatusToast(`ทำสำเนา "${source.projectName}" เรียบร้อย ✓`);
    setTimeout(() => setSaveStatusToast(''), 3000);
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, projectName: newName } : p));
      saveProjectsList(next);
      return next;
    });
    if (id === activeProjectId) setProjectName(newName);
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert('ไม่สามารถลบได้ เนื่องจากต้องมีอย่างน้อย 1 โครงการในระบบ');
      return;
    }
    const isActive = id === activeProjectId;
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjectsList(next);
      if (isActive && next.length > 0) {
        const first = next[0];
        setActiveProjectId(first.id);
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, first.id);
        setProjectName(first.projectName);
        setHouseAreaSqm(first.houseAreaSqm);
        setOverheadPercent(first.overheadPercent ?? 7);
        setVatPercent(first.vatPercent ?? 7);
        setItems(first.items);
        if (first.quotationMeta) setQuotationMeta(first.quotationMeta);
        if (Array.isArray(first.milestones) && first.milestones.length > 0) setMilestones(first.milestones);
        if (first.projectStartDate) setProjectStartDate(first.projectStartDate);
      }
      return next;
    });
    setSaveStatusToast('ลบโครงการเรียบร้อย ✓');
    setTimeout(() => setSaveStatusToast(''), 2500);
  };

  // ปรับสเกลปริมาณงานทุกรายการใน BOQ ตามพื้นที่บ้าน
  const handleAreaChange = (newArea: number) => {
    const targetArea = Math.max(1, newArea);
    setHouseAreaSqm(targetArea);
    setItems(prev => scaleBOQByArea(prev, targetArea, DEFAULT_BASE_AREA_SQM));
  };
  const handleStepArea = (delta: number) => {
    handleAreaChange(houseAreaSqm + delta);
  };
  const handleQuickPresetArea = (area: number) => {
    handleAreaChange(area);
  };
  // เซ็ต 0 ปริมาณงานทั้งหมดใน BOQ เพื่อเริ่มใหม่
  const handleResetAllToZero = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      quantity: 0
    })));
    setIsResetZeroModalOpen(false);
    setSaveStatusToast('เซ็ตปริมาณงานเป็น 0 เรียบร้อย ✓');
    setTimeout(() => setSaveStatusToast(''), 3000);
  };
  // รีเซ็ตกลับเป็นค่าเริ่มต้นมาตรฐาน (120 ตร.ม.)
  const handleResetToDefaultStandard = () => {
    setHouseAreaSqm(120);
    setItems(DEFAULT_STANDARD_BOQ);
    setIsResetZeroModalOpen(false);
    setSaveStatusToast('รีเซ็ตกลับเป็นค่ามาตรฐาน 120 ตร.ม. เรียบร้อย ✓');
    setTimeout(() => setSaveStatusToast(''), 3000);
  };
  // Compute Total BOQ Summary
  const summary = useMemo(() => {
    return computeBOQSummary(items, overheadPercent, vatPercent);
  }, [items, overheadPercent, vatPercent]);
  // สรุปรายการวัสดุสั่งซื้อหน้างานจริง
  const siteMaterialItems = useMemo(() => {
    return generateSiteMaterialsProcurementList(items, houseAreaSqm, milestones);
  }, [items, houseAreaSqm, milestones]);
  // ราคาเฉลี่ยต่อ ตารางเมตร
  const costPerSqm = useMemo(() => {
    if (houseAreaSqm <= 0) return 0;
    return Math.round(summary.grandTotal / houseAreaSqm);
  }, [summary.grandTotal, houseAreaSqm]);
  // กรองรายการ BOQ ตามคำค้นหา
  const displayedItems = useMemo(() => {
    if (!boqSearchQuery.trim()) return items;
    const q = boqSearchQuery.toLowerCase();
    return items.filter(i => 
      (i.name && i.name.toLowerCase().includes(q)) || 
      (i.spec && i.spec.toLowerCase().includes(q)) || 
      (i.unit && i.unit.toLowerCase().includes(q))
    );
  }, [items, boqSearchQuery]);
  const handleUpdateItem = (id: string, updated: Partial<BOQItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  const handleAddItem = (category: ConstructionCategory) => {
    const newItem: BOQItem = {
      id: `custom-${Date.now()}`,
      category,
      name: 'รายการใหม่',
      spec: 'ระบุขนาด/ยี่ห้อ/มาตรฐาน',
      quantity: 1,
      unit: 'หน่วย',
      materialUnitPrice: 0,
      laborUnitPrice: 0,
      wastePercent: 0,
      basePerSqm: 1 / Math.max(1, houseAreaSqm),
    };
    setItems(prev => [...prev, newItem]);
    setSaveStatusToast('เพิ่มแถวรายการใหม่เรียบร้อย ✓');
    setTimeout(() => setSaveStatusToast(''), 2500);
  };
  const handleMergeNewItems = (newItems: BOQItem[]) => {
    setItems(prev => [...prev, ...newItems]);
    setSaveStatusToast(`เพิ่มวัสดุ ${newItems.length} รายการลง BOQ เรียบร้อย ✓`);
    setTimeout(() => setSaveStatusToast(''), 3000);
  };
  const handleSaveMilestones = (updatedMilestones: PaymentMilestone[]) => {
    setMilestones(updatedMilestones);
    const formattedTerms = formatMilestonesToPaymentTerms(updatedMilestones, summary.grandTotal);
    setQuotationMeta(prev => ({
      ...prev,
      paymentTerms: formattedTerms
    }));
    setSaveStatusToast('อัปเดตงวดงานเรียบร้อย ✓');
    setTimeout(() => setSaveStatusToast(''), 3000);
  };
  const handleSaveProjectFile = async () => {
    try {
      const state: ProjectSaveState = {
        id: activeProjectId || generateId(),
        version: '1.0',
        savedAt: new Date().toISOString(),
        projectName,
        houseAreaSqm,
        overheadPercent,
        vatPercent,
        items,
        quotationMeta,
        milestones,
        projectStartDate
      };
      const jsonStr = JSON.stringify(state, null, 2);
      const bytes = new TextEncoder().encode(jsonStr);
      const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9ก-๙]/g, '_') || 'Project';
      await Flow.download({
        base64,
        mimeType: 'application/json',
        filename: `${safeProjectName}_${houseAreaSqm}sqm_${Date.now()}.json`
      });
      setSaveStatusToast('บันทึกไฟล์โปรเจกต์สำเร็จแล้ว ✓');
      setTimeout(() => setSaveStatusToast(''), 3000);
    } catch (e) {
      console.error('Save project file failed:', e);
      setSaveStatusToast('บันทึกไฟล์ไม่สำเร็จ กรุณาลองใหม่');
      setTimeout(() => setSaveStatusToast(''), 3000);
    }
  };
  const handleLoadProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: ProjectSaveState = JSON.parse(text);
        if (parsed && Array.isArray(parsed.items)) {
          setProjectName(parsed.projectName || 'โปรเจกต์ที่โหลด');
          setHouseAreaSqm(parsed.houseAreaSqm || 120);
          setOverheadPercent(parsed.overheadPercent ?? 7);
          setVatPercent(parsed.vatPercent ?? 7);
          setItems(parsed.items);
          if (parsed.quotationMeta) setQuotationMeta(parsed.quotationMeta);
          if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
            setMilestones(parsed.milestones);
          }
          if (parsed.projectStartDate) setProjectStartDate(parsed.projectStartDate);
          setSaveStatusToast(`โหลดโปรเจกต์สำเร็จ (${parsed.items.length} รายการ) ✓`);
          setTimeout(() => setSaveStatusToast(''), 3500);
        } else {
          alert('ไฟล์ไม่ถูกต้องหรือไม่ใช่ไฟล์โครงการของระบบนี้');
        }
      } catch (err) {
        console.error('Load project error:', err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบว่าเป็นไฟล์ JSON ที่ถูกต้อง');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      exportBOQToExcel({
        items,
        projectName: projectName || 'โครงการก่อสร้าง',
        houseAreaSqm: houseAreaSqm || 120,
        quotationMeta,
        milestones,
        overheadPercent: 10,
        vatPercent: 0
      });
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let csvContent = '\uFEFF';
      csvContent += `โครงการ,"${(projectName || 'โครงการ').replace(/"/g, '""')}"\n`;
      csvContent += `พื้นที่ใช้สอยบ้าน,${houseAreaSqm},ตร.ม.\n`;
      csvContent += `งบประมาณเฉลี่ยต่อ ตร.ม.,${costPerSqm},บาท/ตร.ม.\n\n`;
      csvContent += 'หมวด,รายการ,สเปก,ปริมาณ,หน่วย,ราคาวัสดุต่อหน่วย,เผื่อเศษ(%),รวมค่าวัสดุ,ราคาค่าแรงต่อหน่วย,รวมค่าแรง,รวมทั้งสิ้น\n';
      items.forEach(item => {
        const wasteMult = 1 + ((item.wastePercent || 0) / 100);
        const matTotal = (item.quantity || 0) * (item.materialUnitPrice || 0) * wasteMult;
        const labTotal = (item.quantity || 0) * (item.laborUnitPrice || 0);
        const lineTotal = matTotal + labTotal;
        const catName = CATEGORY_LABELS[item.category]?.title || item.category;
        const cleanName = `"${(item.name || '').replace(/"/g, '""')}"`;
        const cleanSpec = `"${(item.spec || '').replace(/"/g, '""')}"`;
        const cleanCat = `"${(catName || '').replace(/"/g, '""')}"`;
        csvContent += `${cleanCat},${cleanName},${cleanSpec},${item.quantity},"${item.unit}",${item.materialUnitPrice},${item.wastePercent},${Math.round(matTotal)},${item.laborUnitPrice},${Math.round(labTotal)},${Math.round(lineTotal)}\n`;
      });
      csvContent += `\n,,,สรุปรวมค่าวัสดุ,,,,${summary.totalMaterial}\n`;
      csvContent += `,,,สรุปรวมค่าแรงงาน,,,,${summary.totalLabor}\n`;
      csvContent += `,,,รวมต้นทุนตรง (Direct Cost),,,,${summary.directCost}\n`;
      csvContent += `,,,ค่าดำเนินการ/กำไร (${overheadPercent}%),,,,${summary.overheadCost}\n`;
      csvContent += `,,,ภาษีมูลค่าเพิ่ม VAT (${vatPercent}%),,,,${summary.vatAmount}\n`;
      csvContent += `,,,ราคาสุทธิรวมทั้งสิ้น (Grand Total),,,,${summary.grandTotal}\n`;
      csvContent += `,,,ราคาต่อ ตร.ม. (บาท/ตร.ม.),,,,${costPerSqm}\n\n`;
      const bytes = new TextEncoder().encode(csvContent);
      const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
      await Flow.download({
        base64,
        mimeType: 'text/csv',
        filename: `BOQ_${projectName.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}_${houseAreaSqm}sqm_${Date.now()}.csv`
      });
    } catch (e) {
      console.error('CSV Export failed:', e);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Hidden File Input for Loading Projects */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadProjectFile}
        accept=".json,application/json"
        className="hidden"
      />
      {/* Header Bar */}
      <header className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-col gap-2 shrink-0">
        {/* Row 1: ชื่อโครงการ + โหมดหลัก + ปุ่มฟังก์ชันหลัก */}
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-cyan-500 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <span className="material-symbols-outlined text-white text-xl">real_estate_agent</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="font-bold text-sm bg-transparent border-0 border-b border-transparent hover:border-slate-700 focus:border-indigo-400 focus:outline-none text-white w-56 sm:w-72 px-1"
                  placeholder="ชื่อโครงการ / สัญญาจ้าง"
                />
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-semibold shrink-0">
                  {houseAreaSqm} ตร.ม.
                </span>
              </div>
              <div className="flex items-center gap-2 pl-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ร่างอัตโนมัติ {lastAutoSavedTime ? `(${lastAutoSavedTime})` : ''}</span>
                </span>
                {saveStatusToast && (
                  <span className="text-amber-300 font-medium px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                    {saveStatusToast}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Main Views Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shadow-inner">
              <button
                onClick={() => setActiveMainTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeMainTab === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                    : 'text-amber-400/90 hover:text-amber-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm">dashboard</span>
                <span>Dashboard โครงการ ({projects.length})</span>
              </button>
              <button
                onClick={() => setActiveMainTab('boq_estimate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeMainTab === 'boq_estimate'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">calculate</span>
                <span>1. ตาราง BOQ</span>
              </button>
              <button
                onClick={() => setActiveMainTab('site_procurement')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeMainTab === 'site_procurement'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                    : 'text-amber-400/90 hover:text-amber-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm">local_shipping</span>
                <span>2. สั่งซื้อหน้างาน ({siteMaterialItems.length})</span>
              </button>
              <button
                onClick={() => setActiveMainTab('gantt_schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeMainTab === 'gantt_schedule'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                <span className="material-symbols-outlined text-sm">timeline</span>
                <span>3. แผนงาน Gantt</span>
              </button>
            </div>
            {/* Actions & Export */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsResetZeroModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1 shadow-sm transition active:scale-95"
                title="เซ็ต 0 ปริมาณงานทั้งหมดใน BOQ เพื่อเริ่มกรอกใหม่"
              >
                <span className="material-symbols-outlined text-sm text-rose-400">restart_alt</span>
                <span>เซ็ต 0</span>
              </button>
              <button
                onClick={() => setIsMilestonesModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1 shadow-sm transition active:scale-95"
                title="ปรับสัดส่วนเปอร์เซ็นต์งวดงาน 3/4/5/6 งวด"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                <span>งวดงาน ({milestones.length})</span>
              </button>
              <button
                onClick={() => setIsQuotationModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-sm transition active:scale-95"
                title="ออกใบเสนอราคาอย่างเป็นทางการและพิมพ์ / บันทึก PDF"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>พิมพ์ PDF</span>
              </button>
              <button
                onClick={handleSaveProjectFile}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                title="บันทึกไฟล์โครงการ (.json)"
              >
                <span className="material-symbols-outlined text-sm text-emerald-400">save</span>
                <span>เซฟ</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                title="เปิดไฟล์โครงการเดิมกลับมาทำต่อ"
              >
                <span className="material-symbols-outlined text-sm text-cyan-400">file_open</span>
                <span>เปิด</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title="ส่งออกรายการเป็นไฟล์ Excel (.xlsx) สวยงามสำหรับยื่นกู้ธนาคาร (ธอส./ออมสิน)"
              >
                <span className="material-symbols-outlined text-sm text-emerald-400">description</span>
                <span>Excel (.xlsx)</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                title="ส่งออกตารางเป็นไฟล์ CSV"
              >
                <span className="material-symbols-outlined text-sm text-amber-300">table_view</span>
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
        {/* Row 2: แถบเครื่องมือคำนวณวัสดุครบวงจร */}
        <div className="flex items-center justify-between bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/90 overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1 shrink-0 mr-1">
              <span className="material-symbols-outlined text-xs">handyman</span>
              เครื่องมือคำนวณ:
            </span>
            {/* 1. โครงสร้าง: เสา-คาน-พื้น */}
            <button
              onClick={() => setIsStructureModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-cyan-400">apartment</span>
              <span>1. เสา-คาน-พื้น</span>
            </button>
            {/* 1.1 บันได คสล. */}
            <button
              onClick={() => setIsStairModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-950 to-indigo-950 hover:from-cyan-900 hover:to-indigo-900 border border-cyan-400/60 text-cyan-200 text-xs font-black flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-sm"
              title="คำนวณบันได คสล."
            >
              <span className="material-symbols-outlined text-sm text-cyan-300 font-bold">stairs</span>
              <span>1.1 บันได คสล.</span>
            </button>
            {/* 2. โครงหลังคา & มุง */}
            <button
              onClick={() => setIsRoofModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-amber-400">roofing</span>
              <span>2. หลังคา & มุง</span>
            </button>
            {/* 3. ผนังก่อฉาบ & ทับหลัง */}
            <button
              onClick={() => setIsMasonryModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-orange-950/70 hover:bg-orange-900 border border-orange-500/40 text-orange-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-orange-400">handyman</span>
              <span>3. ผนังก่อฉาบ</span>
            </button>
            {/* 4. ประตูห้อง (70/80/90) */}
            <button
              onClick={() => setIsRoomDoorModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-amber-400">meeting_room</span>
              <span>4. ประตูห้อง</span>
            </button>
            {/* 5. อลูมิเนียม */}
            <button
              onClick={() => setIsAluminumModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-teal-950/70 hover:bg-teal-900 border border-teal-500/40 text-teal-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-teal-400">door_front</span>
              <span>5. อลูมิเนียม</span>
            </button>
            {/* 6. กระเบื้องพื้น & ผนัง */}
            <button
              onClick={() => setIsTileModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">grid_view</span>
              <span>6. กระเบื้อง</span>
            </button>
            {/* 7. ท่อประปา & สุขาภิบาล */}
            <button
              onClick={() => setIsSanitaryModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-500/60 text-blue-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-blue-400 font-bold">plumbing</span>
              <span>7. ท่อประปา</span>
            </button>
            {/* 7.1 อุปกรณ์ห้องน้ำและสุขภัณฑ์ */}
            <button
              onClick={() => setIsSanitaryFixtureModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-950 via-cyan-950 to-teal-950 hover:from-blue-900 hover:to-cyan-900 border border-cyan-400/80 text-cyan-200 text-xs font-black flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-md"
            >
              <span className="material-symbols-outlined text-sm text-cyan-300 font-bold">wash</span>
              <span>7.1 สุขภัณฑ์ & อุปกรณ์</span>
            </button>
            {/* 8. สายไฟ วสท. */}
            <button
              onClick={() => setIsElectricalModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-500/60 text-yellow-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-yellow-400 font-bold">bolt</span>
              <span>8. คำนวณสายไฟ</span>
            </button>
            {/* 9. บัวพื้น-บัวปูน-หินกาบ */}
            <button
              onClick={() => setIsDecorationModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-rose-400">architecture</span>
              <span>9. ตกแต่งบัว-หิน</span>
            </button>
            {/* 10. งานภายนอก */}
            <button
              onClick={() => setIsExternalModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-purple-400">fence</span>
              <span>10. งานภายนอก</span>
            </button>
            {/* 11. สีอาคาร & สีเหล็ก */}
            <button
              onClick={() => setIsPaintModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-pink-950/80 hover:bg-pink-900 border border-pink-500/60 text-pink-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-pink-400 font-bold">format_paint</span>
              <span>11. สีอาคาร & เหล็ก</span>
            </button>
          </div>
          {/* AI ผู้ช่วยถอดแบบแปลน */}
          <div className="shrink-0 pl-2 border-l border-slate-800">
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>AI ถอดแบบแปลน</span>
            </button>
          </div>
        </div>
      </header>
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Category Navigator & House Area Controls */}
        {activeMainTab === 'boq_estimate' && (
          <aside className="w-72 border-r border-slate-800 bg-slate-900/70 p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="flex flex-col gap-4">
              {/* HOUSE AREA CONTROLLER CARD */}
              <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-cyan-950/80 p-4 rounded-2xl border-2 border-indigo-500/50 shadow-xl shadow-indigo-950/40 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-400 text-base">square_foot</span>
                    พื้นที่ใช้สอยบ้าน (ตร.ม.)
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    Scale Mode
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/80 border border-indigo-400/50 rounded-xl px-2 py-1.5 focus-within:border-indigo-400 transition">
                  <button
                    type="button"
                    onClick={() => handleStepArea(-10)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm transition shrink-0"
                    title="ลดขนาด 10 ตร.ม."
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    step="1"
                    value={houseAreaSqm === 0 ? '' : houseAreaSqm}
                    placeholder="120"
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      handleAreaChange(isNaN(val) ? 0 : val);
                    }}
                    className="w-full text-center bg-transparent text-2xl font-black font-mono text-amber-400 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-300 shrink-0 pr-1">ตร.ม.</span>
                  <button
                    type="button"
                    onClick={() => handleStepArea(10)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold flex items-center justify-center text-sm transition shrink-0"
                    title="เพิ่มขนาด 10 ตร.ม."
                  >
                    +
                  </button>
                </div>
                {/* Area Slider */}
                <div className="flex flex-col gap-1">
                  <input
                    type="range"
                    min="30"
                    max="400"
                    step="5"
                    value={houseAreaSqm}
                    onChange={(e) => handleAreaChange(parseInt(e.target.value) || 30)}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>30 ตร.ม.</span>
                    <span>150 ตร.ม.</span>
                    <span>400 ตร.ม.</span>
                  </div>
                </div>
                {/* Quick Area Presets */}
                <div className="flex flex-col gap-1 pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium">ขนาดบ้านยอดนิยม:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[60, 90, 120, 150, 180, 220, 260, 320].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleQuickPresetArea(preset)}
                        className={`py-1 text-[11px] rounded-lg font-mono font-semibold transition ${
                          houseAreaSqm === preset
                            ? 'bg-amber-400 text-slate-950 font-bold shadow'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetZeroModalOpen(true)}
                  className="w-full py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm text-rose-400">restart_alt</span>
                  <span>เซ็ต 0 งานทั้งหมดเพื่อเริ่มใหม่</span>
                </button>
              </div>
              {/* งวดงานชำระเงิน */}
              <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-slate-950 rounded-xl border border-emerald-500/40 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-400">payments</span>
                    งวดงานชำระเงิน ({milestones.length} งวด)
                  </span>
                  <button
                    onClick={() => setActiveMainTab('gantt_schedule')}
                    className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>ผัง Gantt</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  {milestones.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-slate-300 py-0.5">
                      <span className="truncate pr-1 text-slate-400">• งวด {m.milestoneNumber} ({m.percentage}%):</span>
                      <span className="font-bold text-white shrink-0">฿{Math.round(summary.grandTotal * (m.percentage / 100)).toLocaleString()}</span>
                    </div>
                  ))}
                  {milestones.length > 3 && (
                    <span className="text-[10px] text-slate-500 italic text-right">+ อีก {milestones.length - 3} งวดงาน</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMilestonesModalOpen(true)}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span>ปรับแต่งงวดงาน & เกณฑ์ตรวจรับ</span>
                </button>
              </div>
              {/* Category Navigator List */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    หมวดหมู่งาน ({Object.keys(CATEGORY_LABELS).length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddItem(selectedCategory === 'all' ? 'structure' : selectedCategory)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5"
                    title="เพิ่มรายการใหม่"
                  >
                    <span className="material-symbols-outlined text-xs">add_circle</span>
                    <span>+ รายการ</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">view_list</span>
                    <span>แสดงทุกหมวดหมู่งาน</span>
                  </div>
                  <span className="font-mono text-[10px] opacity-80">{items.length}</span>
                </button>
                {(Object.keys(CATEGORY_LABELS) as ConstructionCategory[]).map(catKey => {
                  const info = CATEGORY_LABELS[catKey];
                  const count = items.filter(i => i.category === catKey).length;
                  const isSelected = selectedCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setSelectedCategory(catKey)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition text-left ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-sm">{info.icon}</span>
                        <span className="truncate">{info.title.split('. ')[1] || info.title}</span>
                      </div>
                      <span className="font-mono text-[10px] ml-1 bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Rate Adjuster Card */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mt-4 flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                ตัวคูณกำไรและภาษี
              </span>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>ค่าดำเนินการ/กำไร (Overhead):</span>
                  <span className="font-mono text-white font-bold">{overheadPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={overheadPercent}
                  onChange={(e) => setOverheadPercent(parseInt(e.target.value) || 0)}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                  <span className="font-mono text-white font-bold">{vatPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(parseInt(e.target.value) || 0)}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>
            </div>
          </aside>
        )}
        {/* Middle/Center: Workspace */}
        <main className="flex-1 overflow-y-auto p-0 bg-slate-950 flex flex-col">
          {/* TAB 0: PROJECT DASHBOARD */}
          {activeMainTab === 'dashboard' && (
            <ProjectDashboardView
              projects={projects}
              activeProjectId={activeProjectId}
              onOpenProject={(id) => {
                handleSwitchProject(id);
                setActiveMainTab('boq_estimate');
              }}
              onCreateProject={handleCreateProject}
              onDuplicateProject={handleDuplicateProject}
              onDeleteProject={handleDeleteProject}
              onImportProjectFile={handleLoadProjectFile}
            />
          )}
          {/* TAB 1: BOQ ESTIMATE TABLE */}
          {activeMainTab === 'boq_estimate' && (
            <div className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
            <>
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
                  <span className="text-xs text-slate-400 font-medium">รวมค่าวัสดุ (Material)</span>
                  <span className="text-xl font-bold font-mono text-white mt-1">
                    ฿{summary.totalMaterial.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">คำนวณตามสัดส่วน {houseAreaSqm} ตร.ม.</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
                  <span className="text-xs text-slate-400 font-medium">รวมค่าแรงช่าง (Labor)</span>
                  <span className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    ฿{summary.totalLabor.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">ตามมาตรฐานราคากลางช่างไทย</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col">
                  <span className="text-xs text-slate-400 font-medium">ต้นทุนตรง (Direct Cost)</span>
                  <span className="text-xl font-bold font-mono text-amber-400 mt-1">
                    ฿{summary.directCost.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    ของ {Math.round((summary.totalMaterial / (summary.directCost || 1)) * 100)}% : แรง {Math.round((summary.totalLabor / (summary.directCost || 1)) * 100)}%
                  </span>
                </div>
                <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 border border-indigo-500/40 p-4 rounded-xl flex flex-col shadow-lg shadow-indigo-950/20">
                  <span className="text-xs text-indigo-300 font-bold">ราคาเฉลี่ยต่อ ตร.ม.</span>
                  <span className="text-2xl font-black font-mono text-amber-300 mt-1">
                    ฿{costPerSqm.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-indigo-200/60 mt-1">
                    บาท / 1 ตร.ม. (สร้างเสร็จพร้อมอยู่)
                  </span>
                </div>
                <div className="bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/40 p-4 rounded-xl flex flex-col shadow-lg shadow-cyan-950/30 col-span-2 md:col-span-1">
                  <span className="text-xs text-cyan-300 font-bold">ราคาสุทธิทั้งหลัง</span>
                  <span className="text-2xl font-black font-mono text-cyan-400 mt-1">
                    ฿{summary.grandTotal.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-cyan-200/60 mt-1">
                    รวม OH ฿{summary.overheadCost.toLocaleString()} + VAT ฿{summary.vatAmount.toLocaleString()}
                  </span>
                </div>
              </div>
              {/* Milestone Payment Schedule Preview Banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/40 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">
                        กำหนดการแบ่งชำระเงินตามงวดงานก่อสร้าง ({milestones.length} งวดงาน)
                      </h4>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-400 text-slate-950 font-bold text-[10px]">
                        ครบ 100%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1 flex-wrap font-mono">
                      {milestones.map((m) => (
                        <span key={m.id} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          งวด {m.milestoneNumber}: <strong className="text-emerald-300">{m.percentage}%</strong> (~฿{Math.round(summary.grandTotal * (m.percentage / 100)).toLocaleString()})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveMainTab('gantt_schedule')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">timeline</span>
                    <span>ดูผัง Gantt</span>
                  </button>
                  <button
                    onClick={() => setIsMilestonesModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>ปรับแต่งงวดงาน</span>
                  </button>
                  <button
                    onClick={() => setIsQuotationModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                    <span>ใบเสนอราคา</span>
                  </button>
                </div>
              </div>
              {/* BOQ Search Bar & Count */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 w-72 focus-within:border-indigo-400 transition">
                  <span className="material-symbols-outlined text-slate-500 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อวัสดุ สเปก หรือหน่วยใน BOQ..."
                    value={boqSearchQuery}
                    onChange={(e) => setBoqSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                  {boqSearchQuery && (
                    <button onClick={() => setBoqSearchQuery('')} className="text-slate-500 hover:text-white">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>แสดง <strong>{displayedItems.length}</strong> จากทั้งหมด {items.length} รายการ</span>
                  {boqSearchQuery && (
                    <span className="text-amber-400 font-sans text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      กรองด้วย "{boqSearchQuery}"
                    </span>
                  )}
                </div>
              </div>
              {/* BOQ Main Table */}
              <BOQTable
                items={displayedItems}
                selectedCategory={selectedCategory}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleAddItem}
              />
            </>
            </div>
          )}
          {/* TAB 2: สรุปรายการวัสดุที่ต้องใช้รวมทั้งหมด */}
          {activeMainTab === 'site_procurement' && (
            <div className="p-4 sm:p-6 flex-1">
              <SiteProcurementView
              items={siteMaterialItems}
              projectName={projectName}
              houseAreaSqm={houseAreaSqm}
              milestones={milestones}
            />
            </div>
          )}
          {/* TAB 3: แผนงาน Gantt Chart */}
          {activeMainTab === 'gantt_schedule' && (
            <div className="p-4 sm:p-6 flex-1">
              <GanttChartScheduleView
              milestones={milestones}
              projectName={projectName}
              projectStartDate={projectStartDate}
              onUpdateMilestones={handleSaveMilestones}
              grandTotal={summary.grandTotal}
              />
            </div>
          )}
        </main>
      </div>
      {/* Modal ยืนยันการเซ็ต 0 งานทั้งหมด */}
      {isResetZeroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">restart_alt</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">เซ็ตปริมาณงานทั้งหมดเป็น 0 หรือไม่?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  เลือกวิธีที่คุณต้องการจัดการกับข้อมูลในตาราง BOQ
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-rose-400 shrink-0 mt-0.5">check</span>
                <span><strong>เซ็ต 0 ทุกรายการ:</strong> ปริมาณงาน (Quantity) ทุกแถวจะถูกปรับเป็น 0 โดยชื่อรายการ สเปก และราคาต่อหน่วยจะยังคงอยู่ครบ ให้คุณเริ่มกรอกตัวเลขใหม่ได้ทันที</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-cyan-400 shrink-0 mt-0.5">refresh</span>
                <span><strong>รีเซ็ตกลับเป็นค่ามาตรฐาน (120 ตร.ม.):</strong> คืนค่าปริมาณและรายการ BOQ ทุกหมวดกลับสู่สูตรคำนวณมาตรฐานเริ่มต้น</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetZeroModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleResetToDefaultStandard}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">refresh</span>
                <span>คืนค่ามาตรฐาน</span>
              </button>
              <button
                type="button"
                onClick={handleResetAllToZero}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-lg shadow-rose-600/30 active:scale-95"
              >
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                <span>ยืนยันเซ็ต 0 ทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🪜 Stair Estimator Modal 🪜 */}
      <StairEstimatorModal
        isOpen={isStairModalOpen}
        onClose={() => setIsStairModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* 🚿 Sanitary & Plumbing Estimator Modal 🚿 */}
      <SanitaryEstimatorModal
        isOpen={isSanitaryModalOpen}
        onClose={() => setIsSanitaryModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* 🚽 Sanitary Fixtures & Bathroom Accessories Modal 🚽 */}
      <SanitaryFixtureSelectorModal
        isOpen={isSanitaryFixtureModalOpen}
        onClose={() => setIsSanitaryFixtureModalOpen(false)}
        onAddItems={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* 🎨 Paint & Steel Coating Estimator Modal 🎨 */}
      <PaintEstimatorModal
        isOpen={isPaintModalOpen}
        onClose={() => setIsPaintModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* Milestones Manager Modal */}
      <MilestonesManagerModal
        isOpen={isMilestonesModalOpen}
        onClose={() => setIsMilestonesModalOpen(false)}
        milestones={milestones}
        onSaveMilestones={handleSaveMilestones}
        grandTotal={summary.grandTotal}
      />
      {/* Official Quotation & PDF Print Modal */}
      <QuotationPrintModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        projectName={projectName}
        houseAreaSqm={houseAreaSqm}
        items={items}
        overheadPercent={overheadPercent}
        vatPercent={vatPercent}
        quotationMeta={quotationMeta}
        onUpdateMeta={setQuotationMeta}
      />
      {/* Electrical & Wire Sizing Modal */}
      <ElectricalEstimatorModal
        isOpen={isElectricalModalOpen}
        onClose={() => setIsElectricalModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* Decoration Estimator Modal */}
      <DecorationEstimatorModal
        isOpen={isDecorationModalOpen}
        onClose={() => setIsDecorationModalOpen(false)}
        onAddItems={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* External Works Modal */}
      <ExternalWorksModal
        isOpen={isExternalModalOpen}
        onClose={() => setIsExternalModalOpen(false)}
        onAddItems={handleMergeNewItems}
      />
      {/* Masonry Estimator Modal */}
      <MasonryEstimatorModal
        isOpen={isMasonryModalOpen}
        onClose={() => setIsMasonryModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* Room Door Selector Modal */}
      <RoomDoorSelectorModal
        isOpen={isRoomDoorModalOpen}
        onClose={() => setIsRoomDoorModalOpen(false)}
        onAddItems={handleMergeNewItems}
      />
      {/* Aluminum Selector Modal */}
      <AluminumSelectorModal
        isOpen={isAluminumModalOpen}
        onClose={() => setIsAluminumModalOpen(false)}
        onAddItems={handleMergeNewItems}
      />
      {/* Tile Selector Modal */}
      <TileSelectorModal
        isOpen={isTileModalOpen}
        onClose={() => setIsTileModalOpen(false)}
        onAddItems={handleMergeNewItems}
      />
      {/* Structure Estimator Modal */}
      <StructureEstimatorModal
        isOpen={isStructureModalOpen}
        onClose={() => setIsStructureModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
        currentHouseAreaSqm={houseAreaSqm}
      />
      {/* Roof Estimator Modal */}
      <RoofEstimatorModal
        isOpen={isRoofModalOpen}
        onClose={() => setIsRoofModalOpen(false)}
        onApplyToBOQ={handleMergeNewItems}
      />
      {/* AI Plan Analyzer Modal */}
      <PlanAnalyzerModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onMergeItems={handleMergeNewItems}
        onUpdateHouseArea={handleAreaChange}
      />
    </div>
  );
}
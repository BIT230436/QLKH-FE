import { useCallback, useEffect, useId, useRef, useState, type DragEvent, type ReactElement } from "react";
import {
  downloadInboundReceiptCsvTemplate,
  type ExcelImportOrderLinePayload,
} from "../../utils/csvImportLines";

export type { ExcelImportOrderLinePayload };

/** Thuộc tính chọn thư mục (Chromium / Safari) — khớp Figma « A4 - 7 ». */
const FOLDER_PICK_PROPS = { webkitdirectory: "", directory: "" } as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onApplyLines: (lines: ExcelImportOrderLinePayload[]) => void;
  parseCsvFilesToOrderLines?: (files: File[]) => Promise<ExcelImportOrderLinePayload[]>;
  csvProfile?: "order" | "receipt";
};

const ACCEPT = ".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

const DEMO_FROM_FILE: ExcelImportOrderLinePayload[] = [
  {
    name: "Hàng từ file (mẫu)",
    code: "XLS-01",
    unit: "Cái",
    unitPrice: "100000",
    quantity: "1",
    discountPct: "0",
  },
  {
    name: "Hàng từ file (mẫu 2)",
    code: "XLS-02",
    unit: "Cái",
    unitPrice: "50000",
    quantity: "2",
    discountPct: "0",
  },
];

type QueuedFile = { id: string; file: File };

function downloadOrderCsvTemplate(): void {
  const header = "Ten_hang_hoa,Ma_hang,Don_vi_tinh,Don_gia,So_luong,Chiet_khau_pct";
  const example = "Vi du hang,VD001,Cai,100000,1,0";
  const blob = new Blob([`\uFEFF${header}\n${example}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mau-nhap-dong-hang.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function extOk(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function formatSizeMB(size: number): string {
  const mb = size / (1024 * 1024);
  if (mb >= 0.1) return mb.toFixed(mb >= 10 ? 0 : 1);
  const kb = size / 1024;
  return kb < 1 ? "<0.1" : kb.toFixed(0);
}

/** Icon đám mây tải lên — khớp SVG Figma « A4 - 5 ». */
function ExcelCloudUploadIcon(): ReactElement {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg
      className="excel-import-a45-cloud"
      width={125}
      height={79}
      viewBox="0 0 125 79"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M104.986 34.9405C105.785 33.3053 106.233 31.5173 106.233 29.6528C106.233 21.5532 97.859 14.9818 87.5379 14.9818C83.7015 14.9818 80.1183 15.8988 77.1583 17.4576C71.764 10.1221 61.696 5.20117 50.148 5.20117C32.9331 5.20117 18.9898 16.1433 18.9898 29.6528C18.9898 30.0654 19.0093 30.4781 19.0288 30.8907C8.12342 33.9013 0.294922 42.062 0.294922 51.6593C0.294922 63.8087 12.8556 73.6658 28.3373 73.6658H100.001C113.769 73.6658 124.928 64.9091 124.928 54.1045C124.928 44.6447 116.359 36.7438 104.986 34.9405ZM76.9051 44.3238H64.1692V61.44C64.1692 62.7848 62.7671 63.8851 61.0534 63.8851H51.7059C49.9922 63.8851 48.5901 62.7848 48.5901 61.44V44.3238H35.8542C33.0695 44.3238 31.6868 41.6953 33.6537 40.1518L54.1791 24.0442C55.3865 23.0967 57.3728 23.0967 58.5802 24.0442L79.1057 40.1518C81.0725 41.6953 79.6704 44.3238 76.9051 44.3238Z"
          fill="#5E9BFF"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="124.633" height="78.2453" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * Modal Import file Excel — Figma / Builder « A4 - 5 » / « A4 - 6 » / « A4 - 7 » (~1040×867):
 * thanh xanh, khung xem trước + tên file, Chọn thư mục / Chọn file, hàng chờ + tiến độ, Hủy / Lưu.
 */
export function ExcelImportModal({
  open,
  onClose,
  onApplyLines,
  parseCsvFilesToOrderLines,
  csvProfile = "order",
}: Props): ReactElement | null {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [progressById, setProgressById] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);

  const clearTimers = useCallback((): void => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const scheduleProgress = useCallback((items: QueuedFile[]): void => {
    items.forEach((item, i) => {
      setProgressById((p) => ({ ...p, [item.id]: 0 }));
      const t1 = window.setTimeout(() => {
        setProgressById((p) => ({ ...p, [item.id]: 65 }));
      }, 280 + i * 100);
      const t2 = window.setTimeout(() => {
        setProgressById((p) => ({ ...p, [item.id]: 100 }));
      }, 780 + i * 180);
      timersRef.current.push(t1, t2);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setQueue([]);
      setProgressById({});
      setError("");
      setDragOver(false);
    }
  }, [open, clearTimers]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const enqueueFiles = useCallback(
    (incoming: File[]): void => {
      setError("");
      const valid: File[] = [];
      const invalid: string[] = [];
      for (const f of incoming) {
        if (extOk(f.name)) valid.push(f);
        else invalid.push(f.name);
      }
      if (invalid.length) {
        setError(`Bỏ qua file không hợp lệ: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "…" : ""}`);
      }
      if (!valid.length) return;
      const addition: QueuedFile[] = valid.map((file) => ({ id: crypto.randomUUID(), file }));
      setQueue((prev) => [...prev, ...addition]);
      scheduleProgress(addition);
    },
    [scheduleProgress]
  );

  const removeQueued = useCallback((id: string): void => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
    setProgressById((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setDragOver(false);
      const list = e.dataTransfer.files;
      if (list?.length) enqueueFiles([...list]);
    },
    [enqueueFiles]
  );

  const handleApply = (): void => {
    if (queue.length === 0) {
      setError("Vui lòng chọn ít nhất một file (.csv, .xlsx, .xls).");
      return;
    }
    if (parseCsvFilesToOrderLines) {
      const csvFiles = queue.map((q) => q.file).filter((f) => f.name.toLowerCase().endsWith(".csv"));
      if (csvFiles.length === 0) {
        setError("Cần ít nhất một file .csv (UTF-8). File .xlsx vui lòng Mở trong Excel → Lưu dưới dạng CSV.");
        return;
      }
      setApplyBusy(true);
      void (async () => {
        try {
          const lines = await parseCsvFilesToOrderLines(csvFiles);
          onApplyLines(lines);
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Không đọc được file.");
        } finally {
          setApplyBusy(false);
        }
      })();
      return;
    }
    const lines: ExcelImportOrderLinePayload[] = queue.flatMap((item, idx) =>
      DEMO_FROM_FILE.map((row, j) => ({
        ...row,
        code: `${row.code}-F${idx + 1}-${j + 1}`,
        name: `${row.name} (${item.file.name})`,
      }))
    );
    onApplyLines(lines);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel card excel-import-panel excel-import-panel-a46 excel-import-a45-shell feature-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="excel-import-a45-topbar">
          <h2 id={titleId} className="excel-import-a45-topbar-title">
            THÊM DANH SÁCH HÀNG HÓA FILE NGOÀI
          </h2>
        </div>

        <div className="excel-import-a45-body">
          <p className="excel-import-lead muted excel-import-a45-lead">
            {parseCsvFilesToOrderLines
              ? csvProfile === "receipt"
                ? "Chọn file .csv UTF-8 theo mẫu (mã sản phẩm = id trong danh mục). Bấm Lưu để thêm dòng vào phiếu."
                : "Chọn file .csv UTF-8 theo mẫu cột bên dưới. Bấm Lưu để đọc dữ liệu thật (file .xlsx cần xuất sang CSV trong Excel)."
              : "Chọn file hoặc cả thư mục (chỉ lấy .csv, .xlsx, .xls). Nếu không bật đọc CSV, bấm Lưu sẽ thêm dòng mẫu theo từng file đã chọn."}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            className="excel-import-file-input"
            accept={ACCEPT}
            multiple
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) enqueueFiles([...list]);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            className="excel-import-file-input"
            multiple
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) {
                const fromDir = [...list].filter((f) => extOk(f.name));
                if (fromDir.length) enqueueFiles(fromDir);
                else setError("Trong thư mục không có file .csv, .xlsx hoặc .xls.");
              }
              e.target.value = "";
            }}
            {...FOLDER_PICK_PROPS}
          />

          {queue.length > 0 && (
            <div className="excel-import-a47-preview-wrap">
              <div className="excel-import-a47-preview-toolbar">
                <button type="button" className="excel-import-a47-open" onClick={() => fileInputRef.current?.click()}>
                  Mở
                </button>
              </div>
              <div className="excel-import-a47-preview">
                <div className="excel-import-a47-preview-body">
                  <span className="muted">Đã chọn {queue.length} file — xem tên file bên dưới.</span>
                </div>
                <div className="excel-import-a47-preview-footer">
                  <span className="excel-import-a47-preview-name" title={queue[0]?.file.name}>
                    {queue[0]?.file.name ?? "—"}
                  </span>
                  <button type="button" className="excel-import-a47-open excel-import-a47-open-foot" onClick={() => fileInputRef.current?.click()}>
                    Mở
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className={`excel-import-a45-drop excel-import-a46-queue${dragOver ? " is-dragover" : ""}${queue.length > 0 ? " has-files" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {queue.length === 0 ? (
              <div className="excel-import-a45-empty">
                <ExcelCloudUploadIcon />
                <p className="excel-import-a45-drop-title">Kéo thả file vào đây</p>
                <p className="excel-import-a45-drop-or">hoặc</p>
                <button type="button" className="excel-import-a45-pick" onClick={() => folderInputRef.current?.click()}>
                  Chọn thư mục
                </button>
                <button type="button" className="excel-import-a47-file-link" onClick={() => fileInputRef.current?.click()}>
                  Chọn file
                </button>
              </div>
            ) : (
              <div className="excel-import-a45-filled">
                <ul className="excel-import-a46-list">
                  {queue.map(({ id, file }) => {
                    const pct = progressById[id] ?? 0;
                    return (
                      <li key={id} className="excel-import-a46-row">
                        <div className="excel-import-a46-row-top">
                          <span className="excel-import-a46-name" title={file.name}>
                            {file.name}
                          </span>
                          <span className="excel-import-a46-meta">
                            {formatSizeMB(file.size)} MB · {pct}%
                          </span>
                          <button type="button" className="btn-link excel-import-a46-remove" onClick={() => removeQueued(id)}>
                            Hủy
                          </button>
                        </div>
                        <div
                          className="excel-import-a46-bar"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                        >
                          <div className="excel-import-a46-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="excel-import-a47-add-row">
                  <button type="button" className="excel-import-a45-pick excel-import-a45-pick-add" onClick={() => fileInputRef.current?.click()}>
                    Thêm file
                  </button>
                  <button type="button" className="excel-import-a45-pick excel-import-a45-pick-add" onClick={() => folderInputRef.current?.click()}>
                    Thêm thư mục
                  </button>
                </div>
              </div>
            )}
          </div>

          <details className="excel-import-a46-details">
            <summary className="excel-import-a46-details-summary">Định dạng cột gợi ý &amp; file mẫu</summary>
            <div className="excel-import-columns card excel-import-a46-columns-inner">
              <div className="excel-import-columns-title">Cột trong file (thứ tự gợi ý)</div>
              <ol className="excel-import-columns-list">
                {csvProfile === "receipt" ? (
                  <>
                    <li>Mã sản phẩm (id)</li>
                    <li>Số lượng theo chứng từ</li>
                    <li>Số lượng thực nhập</li>
                    <li>Đơn giá</li>
                  </>
                ) : (
                  <>
                    <li>Tên hàng hóa</li>
                    <li>Mã hàng</li>
                    <li>Đơn vị tính</li>
                    <li>Đơn giá</li>
                    <li>Số lượng</li>
                    <li>Chiết khấu (%)</li>
                  </>
                )}
              </ol>
              <button
                type="button"
                className="btn-link excel-import-template-btn"
                onClick={() => {
                  if (csvProfile === "receipt") downloadInboundReceiptCsvTemplate();
                  else downloadOrderCsvTemplate();
                }}
              >
                Tải file mẫu (.csv)
              </button>
            </div>
          </details>

          {error && (
            <div className="banner banner-error subtle" role="alert">
              {error}
            </div>
          )}

          <div className="excel-import-a45-foot">
            <button type="button" className="btn-secondary confirm-dialog-btn" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary confirm-dialog-btn"
              disabled={applyBusy}
              onClick={() => {
                handleApply();
              }}
            >
              {applyBusy ? "Đang đọc…" : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

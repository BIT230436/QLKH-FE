import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  createContract,
  deleteContract,
  fetchContracts,
  updateContract,
  type ContractRow,
  type ContractStatus,
} from "../../services/contractsApi";
import { fetchSuppliers } from "../../services/catalogApi";
import { fetchOutboundReceipts } from "../../services/outboundReceiptApi";
import type { Supplier } from "../../services/types";
import type { OutboundRow } from "../../types/inventory";
import { getHttpErrorMessage } from "../../utils/errors";
import {
  CONTRACT_CODE_MAX,
  CONTRACT_COUNTERPARTY_REF_MAX,
  CONTRACT_CURRENCY_MAX,
  CONTRACT_NOTE_MAX,
  CONTRACT_TITLE_MAX,
  CONTRACT_FILE_URL_MAX,
  validateContractForm,
  type ContractFieldErrors,
} from "../../utils/catalogMasterFormValidation";
import { appAlert, appConfirm } from "../common/appDialogs";
import { IconActionDelete, IconActionEdit } from "../icons/ActionIcons";

type Props = {
  onBack: () => void;
};

const STATUSES: ContractStatus[] = ["Nháp", "Hiệu lực", "Hết hạn", "Đã đóng", "Tạm dừng"];

function scopeLabel(scope: "ncc" | "internal" | "nvbh"): string {
  if (scope === "ncc") return "NCC";
  if (scope === "internal") return "NB";
  return "NVBH";
}

function statusBadgeClass(s: ContractStatus): string {
  switch (s) {
    case "Hiệu lực":
      return "outbound-badge outbound-badge-ok";
    case "Nháp":
      return "outbound-badge outbound-badge-info";
    case "Hết hạn":
    case "Đã đóng":
      return "outbound-badge outbound-badge-warn";
    default:
      return "outbound-badge";
  }
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hiển thị ngày hiệu lực (API đôi khi trả chuỗi không-ISO → tránh in ra chuỗi Date mặc định của JS). */
function formatDayOnly(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type FormState = {
  contractCode: string;
  title: string;
  supplierId: string;
  status: ContractStatus;
  signedDate: string;
  effectiveFrom: string;
  effectiveTo: string;
  valueAmount: string;
  currency: string;
  counterpartyRef: string;
  note: string;
  fileUrl: string;
  outboundReceiptId: number | null;
};

function emptyForm(): FormState {
  return {
    contractCode: "",
    title: "",
    supplierId: "",
    status: "Nháp",
    signedDate: "",
    effectiveFrom: "",
    effectiveTo: "",
    valueAmount: "0",
    currency: "VND",
    counterpartyRef: "",
    note: "",
    fileUrl: "",
    outboundReceiptId: null,
  };
}

type OutboundOption = { id: number; label: string };

/** Quản lý hợp đồng — CRUD qua API `/api/contracts`, giao diện builder (bảng navy + form card). */
export function ContractListScreen({ onBack }: Props): ReactElement {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [outboundOptions, setOutboundOptions] = useState<OutboundOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ContractRow | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<ContractFieldErrors>({});

  const contractFormBannerText = useMemo(() => {
    const parts = Object.values(formFieldErrors).filter(Boolean);
    return [...new Set(parts)].join(" · ");
  }, [formFieldErrors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const [sups, ncc, internal, nvbh] = await Promise.all([
          fetchSuppliers(),
          fetchOutboundReceipts({ scope: "ncc" }),
          fetchOutboundReceipts({ scope: "internal" }),
          fetchOutboundReceipts({ scope: "nvbh" }),
        ]);
        if (cancelled) return;
        setSuppliers(sups);
        const opts: OutboundOption[] = [];
        const push = (list: OutboundRow[], sc: "ncc" | "internal" | "nvbh"): void => {
          for (const r of list) {
            opts.push({
              id: r.id,
              label: `${r.code} · ${scopeLabel(sc)} · ${r.source}`,
            });
          }
        };
        push(ncc, "ncc");
        push(internal, "internal");
        push(nvbh, "nvbh");
        opts.sort((a, b) => a.label.localeCompare(b.label, "vi"));
        setOutboundOptions(opts);
      } catch {
        if (!cancelled) setSuppliers([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContracts({
        status: statusFilter || undefined,
        supplierId: supplierFilter ? Number(supplierFilter) : undefined,
        search: search.trim() || undefined,
      });
      setRows(data);
      setError(null);
    } catch (e) {
      setError(getHttpErrorMessage(e, "Không tải được danh sách hợp đồng."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, supplierFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm());
    setFormFieldErrors({});
  };

  const openEdit = (r: ContractRow): void => {
    setCreating(false);
    setEditing(r);
    setFormFieldErrors({});
    setForm({
      contractCode: r.contractCode,
      title: r.title,
      supplierId: String(r.supplierId),
      status: r.status,
      signedDate: r.signedDate ?? "",
      effectiveFrom: r.effectiveFrom ?? "",
      effectiveTo: r.effectiveTo ?? "",
      valueAmount: String(r.valueAmount),
      currency: r.currency || "VND",
      counterpartyRef: r.counterpartyRef,
      note: r.note,
      fileUrl: r.fileUrl ?? "",
      outboundReceiptId: r.outboundReceiptId,
    });
  };

  const closeForm = (): void => {
    setCreating(false);
    setEditing(null);
    setFormFieldErrors({});
  };

  const submitForm = async (): Promise<void> => {
    const checked = validateContractForm({
      contractCode: form.contractCode,
      title: form.title,
      supplierId: form.supplierId,
      status: form.status,
      signedDate: form.signedDate,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo,
      valueAmount: form.valueAmount,
      currency: form.currency,
      counterpartyRef: form.counterpartyRef,
      note: form.note,
      fileUrl: form.fileUrl,
      outboundReceiptId: form.outboundReceiptId,
    });
    if (!checked.ok) {
      setFormFieldErrors(checked.errors);
      return;
    }
    setFormFieldErrors({});
    setSaving(true);
    try {
      if (editing) {
        await updateContract(editing.id, checked.payload);
      } else {
        await createContract(checked.payload);
      }
      closeForm();
      await load();
    } catch (e) {
      await appAlert(getHttpErrorMessage(e, "Không lưu được. Kiểm tra mã trùng hoặc quyền."), { title: "Không lưu được" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: ContractRow): Promise<void> => {
    if (deleteBusyId != null) return;
    setDeleteBusyId(r.id);
    try {
      if (!(await appConfirm(`Xóa hợp đồng ${r.contractCode}?`, { title: "Xác nhận xóa" }))) return;
      try {
        await deleteContract(r.id);
        await load();
      } catch (e) {
        await appAlert(getHttpErrorMessage(e, "Không xóa được."), { title: "Không xóa được" });
      }
    } finally {
      setDeleteBusyId(null);
    }
  };

  return (
    <div className="app-page outbound-page outbound-order-list-page feature-doc-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Tổng quan
          </button>
        </div>
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">Quản lý hợp đồng</h1>
            <p className="enterprise-page-meta">Danh sách, lọc và chỉnh sửa hợp đồng — đồng bộ với NCC và phiếu xuất khi cần.</p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate} disabled={catalogLoading}>
            Thêm hợp đồng
          </button>
        </div>

        {(creating || editing) && (
          <section className="outbound-filters card contract-form-card">
            {editing ? <h2 className="contract-form-title">Sửa hợp đồng</h2> : null}
            {contractFormBannerText ? (
              <div className="banner banner-error subtle" role="alert" style={{ marginBottom: 8 }}>
                {contractFormBannerText}
              </div>
            ) : null}
            <div className="outbound-filter-grid">
              <label className="field compact">
                <span>Mã hợp đồng *</span>
                <input
                  value={form.contractCode}
                  maxLength={CONTRACT_CODE_MAX}
                  aria-invalid={Boolean(formFieldErrors.contract_code)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, contractCode: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.contract_code;
                      return n;
                    });
                  }}
                  disabled={Boolean(editing)}
                  placeholder="VD: HD-2026-001"
                />
                {formFieldErrors.contract_code ? (
                  <p className="inline-error">{formFieldErrors.contract_code}</p>
                ) : null}
              </label>
              <label className="field compact span-2">
                <span>Tiêu đề *</span>
                <input
                  value={form.title}
                  maxLength={CONTRACT_TITLE_MAX}
                  aria-invalid={Boolean(formFieldErrors.title)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.title;
                      return n;
                    });
                  }}
                  placeholder="Tên / nội dung hợp đồng"
                />
                {formFieldErrors.title ? <p className="inline-error">{formFieldErrors.title}</p> : null}
              </label>
              <label className="field compact">
                <span>Nhà cung cấp *</span>
                <select
                  value={form.supplierId}
                  aria-invalid={Boolean(formFieldErrors.supplier_id)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, supplierId: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.supplier_id;
                      return n;
                    });
                  }}
                  disabled={catalogLoading}
                >
                  <option value="">— Chọn NCC —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {formFieldErrors.supplier_id ? <p className="inline-error">{formFieldErrors.supplier_id}</p> : null}
              </label>
              <label className="field compact">
                <span>Trạng thái</span>
                <select
                  value={form.status}
                  aria-invalid={Boolean(formFieldErrors.status)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, status: e.target.value as ContractStatus }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.status;
                      return n;
                    });
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {formFieldErrors.status ? <p className="inline-error">{formFieldErrors.status}</p> : null}
              </label>
              <label className="field compact">
                <span>Ngày ký</span>
                <input
                  type="date"
                  value={form.signedDate}
                  aria-invalid={Boolean(formFieldErrors.signed_date)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, signedDate: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.signed_date;
                      return n;
                    });
                  }}
                />
                {formFieldErrors.signed_date ? <p className="inline-error">{formFieldErrors.signed_date}</p> : null}
              </label>
              <label className="field compact">
                <span>Hiệu lực từ</span>
                <input
                  type="date"
                  value={form.effectiveFrom}
                  aria-invalid={Boolean(formFieldErrors.effective_from)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, effectiveFrom: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.effective_from;
                      delete n.effective_to;
                      return n;
                    });
                  }}
                />
                {formFieldErrors.effective_from ? (
                  <p className="inline-error">{formFieldErrors.effective_from}</p>
                ) : null}
              </label>
              <label className="field compact">
                <span>Hiệu lực đến</span>
                <input
                  type="date"
                  value={form.effectiveTo}
                  aria-invalid={Boolean(formFieldErrors.effective_to)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, effectiveTo: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.effective_from;
                      delete n.effective_to;
                      return n;
                    });
                  }}
                />
                {formFieldErrors.effective_to ? (
                  <p className="inline-error">{formFieldErrors.effective_to}</p>
                ) : null}
              </label>
              <label className="field compact">
                <span>Giá trị (số)</span>
                <input
                  value={form.valueAmount}
                  aria-invalid={Boolean(formFieldErrors.value_amount)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, valueAmount: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.value_amount;
                      return n;
                    });
                  }}
                  inputMode="decimal"
                />
                {formFieldErrors.value_amount ? (
                  <p className="inline-error">{formFieldErrors.value_amount}</p>
                ) : null}
              </label>
              <label className="field compact">
                <span>Loại tiền</span>
                <input
                  value={form.currency}
                  maxLength={CONTRACT_CURRENCY_MAX}
                  aria-invalid={Boolean(formFieldErrors.currency)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, currency: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.currency;
                      return n;
                    });
                  }}
                />
                {formFieldErrors.currency ? <p className="inline-error">{formFieldErrors.currency}</p> : null}
              </label>
              <label className="field compact">
                <span>Mã tham chiếu NCC</span>
                <input
                  value={form.counterpartyRef}
                  maxLength={CONTRACT_COUNTERPARTY_REF_MAX}
                  aria-invalid={Boolean(formFieldErrors.counterparty_ref)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, counterpartyRef: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.counterparty_ref;
                      return n;
                    });
                  }}
                  placeholder="Số hợp đồng phía đối tác"
                />
                {formFieldErrors.counterparty_ref ? (
                  <p className="inline-error">{formFieldErrors.counterparty_ref}</p>
                ) : null}
              </label>
              <label className="field compact span-2">
                <span>Liên kết phiếu xuất (tùy chọn)</span>
                <select
                  value={form.outboundReceiptId != null ? String(form.outboundReceiptId) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      outboundReceiptId: v === "" ? null : Number(v),
                    }));
                  }}
                >
                  <option value="">— Không chọn —</option>
                  {outboundOptions.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact span-2">
                <span>URL minh chứng (https…)</span>
                <input
                  value={form.fileUrl}
                  maxLength={CONTRACT_FILE_URL_MAX}
                  aria-invalid={Boolean(formFieldErrors.file_url)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, fileUrl: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.file_url;
                      return n;
                    });
                  }}
                  placeholder="https://…"
                />
                {formFieldErrors.file_url ? <p className="inline-error">{formFieldErrors.file_url}</p> : null}
              </label>
              <label className="field compact span-3">
                <span>Ghi chú</span>
                <textarea
                  className="textarea-field"
                  rows={2}
                  maxLength={CONTRACT_NOTE_MAX}
                  value={form.note}
                  aria-invalid={Boolean(formFieldErrors.note)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, note: e.target.value }));
                    setFormFieldErrors((p) => {
                      const n = { ...p };
                      delete n.note;
                      return n;
                    });
                  }}
                />
                {formFieldErrors.note ? <p className="inline-error">{formFieldErrors.note}</p> : null}
              </label>
            </div>
            <div className="out-create-actions contract-form-actions">
              <button type="button" className="btn-secondary" onClick={closeForm}>
                Hủy
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => void submitForm()}>
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </section>
        )}

        <section className="outbound-filters card inbound-builder-filters">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Trạng thái</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>Nhà cung cấp</span>
              <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} disabled={catalogLoading}>
                <option value="">Tất cả</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>Tìm kiếm</span>
              <input
                type="search"
                placeholder="Mã, tiêu đề, tham chiếu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
        </section>

        {error && <div className="banner banner-error">{error}</div>}
        {loading && <p className="muted">Đang tải…</p>}

        <div className="outbound-table-wrap card builder-table-card">
          <div className="table-scroll sticky-head-wrap">
            <table className="outbound-table lines-table condensed sticky-head">
              <thead>
                <tr>
                  <th className="outbound-col-stt">STT</th>
                  <th>Mã hợp đồng</th>
                  <th>Tiêu đề</th>
                  <th>NCC</th>
                  <th className="align-right">Giá trị</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                  <th>Phiếu xuất</th>
                  <th>Cập nhật</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{r.contractCode}</td>
                    <td>{r.title}</td>
                    <td>{r.supplierName}</td>
                    <td className="align-right">
                      {formatMoney(r.valueAmount)} {r.currency}
                    </td>
                    <td className="muted">
                      {formatDayOnly(r.effectiveFrom)} → {formatDayOnly(r.effectiveTo)}
                    </td>
                    <td>
                      <span className={statusBadgeClass(r.status)}>{r.status}</span>
                    </td>
                    <td className="muted">{r.outboundReceiptCode ?? "—"}</td>
                    <td className="muted">{formatDate(r.updatedAt)}</td>
                    <td>
                      <span className="table-action-group">
                        <button
                          type="button"
                          className="table-action-btn"
                          title="Sửa"
                          aria-label="Sửa"
                          onClick={() => openEdit(r)}
                        >
                          <IconActionEdit className="table-action-ico" />
                        </button>
                        <button
                          type="button"
                          className="table-action-btn danger"
                          title="Xóa"
                          aria-label="Xóa"
                          disabled={deleteBusyId != null}
                          onClick={() => void onDelete(r)}
                        >
                          <IconActionDelete className="table-action-ico" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !rows.length && <p className="outbound-empty muted">Chưa có hợp đồng phù hợp bộ lọc.</p>}
        </div>
      </main>
    </div>
  );
}

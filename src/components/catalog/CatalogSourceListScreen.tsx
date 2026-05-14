import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  createCatalogSource,
  deleteCatalogSource,
  fetchCatalogSources,
  updateCatalogSource,
} from "../../services/catalogMgmtApi";
import type { CatalogSourceRow, CatalogSourceStatus } from "../../types/inventory";
import { getHttpErrorMessage } from "../../utils/errors";
import {
  CATALOG_SOURCE_CODE_MAX,
  CATALOG_SOURCE_NAME_MAX,
  validateCatalogSourceForm,
  type CatalogSourceFieldErrors,
} from "../../utils/catalogMasterFormValidation";
import { appAlert, appConfirm } from "../common/appDialogs";
import { IconActionDelete, IconActionEdit } from "../icons/ActionIcons";

type Props = {
  onBack: () => void;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(s: CatalogSourceStatus): string {
  switch (s) {
    case "Đang dùng":
      return "outbound-badge outbound-badge-ok";
    case "Tạm ngưng":
      return "outbound-badge outbound-badge-warn";
    case "Nháp":
      return "outbound-badge outbound-badge-info";
    default:
      return "outbound-badge";
  }
}

/** Quản lý danh mục nguồn hàng xuất/nhập — dữ liệu từ API. */
export function CatalogSourceListScreen({ onBack }: Props): ReactElement {
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CatalogSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogSourceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formKind, setFormKind] = useState<CatalogSourceRow["kind"]>("Nhập");
  const [formStatus, setFormStatus] = useState<CatalogSourceStatus>("Nháp");
  const [saving, setSaving] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CatalogSourceFieldErrors>({});

  const fieldErrorBannerText = useMemo(() => {
    const parts = Object.values(fieldErrors).filter(Boolean);
    return [...new Set(parts)].join(" · ");
  }, [fieldErrors]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCatalogSources({
        kind: kindFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setRows(data);
      setError(null);
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không tải được danh sách nguồn hàng."));
    } finally {
      setLoading(false);
    }
  }, [kindFilter, statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => {
    setCreating(true);
    setEditing(null);
    setFieldErrors({});
    setFormCode("");
    setFormName("");
    setFormKind("Nhập");
    setFormStatus("Nháp");
  };

  const openEdit = (r: CatalogSourceRow): void => {
    setCreating(false);
    setEditing(r);
    setFieldErrors({});
    setFormCode(r.code);
    setFormName(r.name);
    setFormKind(r.kind);
    setFormStatus(r.status);
  };

  const closeForm = (): void => {
    setCreating(false);
    setEditing(null);
    setFieldErrors({});
  };

  const submitForm = async (): Promise<void> => {
    const checked = validateCatalogSourceForm({
      code: formCode,
      name: formName,
      kind: formKind,
      status: formStatus,
    });
    if (!checked.ok) {
      setFieldErrors(checked.errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      if (editing) {
        await updateCatalogSource(editing.id, {
          code: formCode.trim(),
          name: formName.trim(),
          kind: formKind,
          status: formStatus,
        });
      } else {
        await createCatalogSource({
          code: formCode.trim(),
          name: formName.trim(),
          kind: formKind,
          status: formStatus,
        });
      }
      closeForm();
      await load();
    } catch (err) {
      await appAlert(getHttpErrorMessage(err, "Không lưu được. Kiểm tra mã trùng hoặc quyền."), { title: "Không lưu được" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (r: CatalogSourceRow): Promise<void> => {
    if (deleteBusyId != null) return;
    setDeleteBusyId(r.id);
    try {
      if (!(await appConfirm(`Xóa nguồn ${r.code}?`, { title: "Xác nhận xóa" }))) return;
      try {
        await deleteCatalogSource(r.id);
        await load();
      } catch (err) {
        await appAlert(getHttpErrorMessage(err, "Không xóa được."), { title: "Không xóa được" });
      }
    } finally {
      setDeleteBusyId(null);
    }
  };

  return (
    <div className="app-page outbound-page outbound-order-list-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Tổng quan
          </button>
        </div>
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">Quản lý danh mục nguồn hàng xuất / nhập</h1>
            <p className="enterprise-page-meta">Master nguồn dùng chung cho phiếu xuất/nhập và báo cáo.</p>
          </div>
          <button type="button" className="outbound-btn-primary" onClick={openCreate}>
            Thêm nguồn
          </button>
        </div>

        {(creating || editing) && (
          <section className="outbound-filters card" style={{ marginBottom: 12 }}>
            {fieldErrorBannerText ? (
              <div className="banner banner-error subtle" role="alert" style={{ marginBottom: 8 }}>
                {fieldErrorBannerText}
              </div>
            ) : null}
            {editing ? (
              <h2 className="outbound-title" style={{ fontSize: "1rem", marginBottom: 8 }}>
                Sửa nguồn
              </h2>
            ) : null}
            <div className="outbound-filter-grid">
              <label className="field compact">
                <span>Mã *</span>
                <input
                  value={formCode}
                  maxLength={CATALOG_SOURCE_CODE_MAX}
                  aria-invalid={Boolean(fieldErrors.code)}
                  onChange={(e) => {
                    setFormCode(e.target.value);
                    setFieldErrors((p) => {
                      const n = { ...p };
                      delete n.code;
                      return n;
                    });
                  }}
                  disabled={Boolean(editing)}
                />
                {fieldErrors.code ? <p className="inline-error">{fieldErrors.code}</p> : null}
              </label>
              <label className="field compact">
                <span>Tên *</span>
                <input
                  value={formName}
                  maxLength={CATALOG_SOURCE_NAME_MAX}
                  aria-invalid={Boolean(fieldErrors.name)}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFieldErrors((p) => {
                      const n = { ...p };
                      delete n.name;
                      return n;
                    });
                  }}
                />
                {fieldErrors.name ? <p className="inline-error">{fieldErrors.name}</p> : null}
              </label>
              <label className="field compact">
                <span>Loại</span>
                <select
                  value={formKind}
                  aria-invalid={Boolean(fieldErrors.kind)}
                  onChange={(e) => {
                    setFormKind(e.target.value as CatalogSourceRow["kind"]);
                    setFieldErrors((p) => {
                      const n = { ...p };
                      delete n.kind;
                      return n;
                    });
                  }}
                >
                  <option>Xuất</option>
                  <option>Nhập</option>
                  <option>Xuất / Nhập</option>
                </select>
                {fieldErrors.kind ? <p className="inline-error">{fieldErrors.kind}</p> : null}
              </label>
              <label className="field compact">
                <span>Trạng thái</span>
                <select
                  value={formStatus}
                  aria-invalid={Boolean(fieldErrors.status)}
                  onChange={(e) => {
                    setFormStatus(e.target.value as CatalogSourceStatus);
                    setFieldErrors((p) => {
                      const n = { ...p };
                      delete n.status;
                      return n;
                    });
                  }}
                >
                  <option>Đang dùng</option>
                  <option>Tạm ngưng</option>
                  <option>Nháp</option>
                </select>
                {fieldErrors.status ? <p className="inline-error">{fieldErrors.status}</p> : null}
              </label>
            </div>
            <div className="out-create-actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn-secondary" onClick={closeForm}>
                Hủy
              </button>
              <button type="button" className="outbound-btn-primary" disabled={saving} onClick={() => void submitForm()}>
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </section>
        )}

        <section className="outbound-filters card">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Loại nguồn</span>
              <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option>Xuất</option>
                <option>Nhập</option>
                <option>Xuất / Nhập</option>
              </select>
            </label>
            <label className="field compact">
              <span>Trạng thái</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option>Đang dùng</option>
                <option>Tạm ngưng</option>
                <option>Nháp</option>
              </select>
            </label>
            <label className="field compact">
              <span>Tìm kiếm</span>
              <input
                type="text"
                placeholder="Mã, tên nguồn…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
        </section>

        {error && <p className="login-banner">{error}</p>}
        {loading && <p className="muted">Đang tải…</p>}

        <div className="outbound-table-wrap card builder-table-card">
          <div className="table-scroll">
            <table className="outbound-table lines-table condensed">
              <thead>
                <tr>
                  <th className="outbound-col-stt">STT</th>
                  <th>Mã nguồn</th>
                  <th>Tên nguồn</th>
                  <th>Loại</th>
                  <th>Cập nhật</th>
                  <th>Trạng thái</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td className="muted">{r.kind}</td>
                    <td className="muted">{formatDateTime(r.updatedAt)}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
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
          {!loading && !rows.length && <p className="outbound-empty muted">Không có nguồn phù hợp bộ lọc.</p>}
        </div>
      </main>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { ProductSkuFormScreen } from "./ProductSkuFormScreen";
import type { ProductGroupRow, ProductGroupStatus, ProductSkuRow } from "../../types/inventory";
import { createProductGroup, fetchProductGroups, fetchSkus } from "../../services/catalogMgmtApi";
import { getHttpErrorMessage } from "../../utils/errors";
import {
  PRODUCT_GROUP_CODE_MAX,
  PRODUCT_GROUP_NAME_MAX,
  PRODUCT_GROUP_OWNER_MAX,
  validateProductGroupCreateForm,
  type ProductGroupFieldErrors,
} from "../../utils/catalogMasterFormValidation";
import { appAlert } from "../common/appDialogs";
import { IconActionEdit, IconActionView } from "../icons/ActionIcons";

type Props = {
  onBack: () => void;
};

type Flow =
  | { step: "groups" }
  | { step: "skus"; group: ProductGroupRow }
  | { step: "form"; group: ProductGroupRow; mode: "create" | "view" | "edit"; product?: ProductSkuRow };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(s: ProductGroupStatus): string {
  switch (s) {
    case "Hoạt động":
      return "outbound-badge outbound-badge-ok";
    case "Khóa":
      return "outbound-badge outbound-badge-danger";
    default:
      return "outbound-badge";
  }
}

function skuStatusClass(s: string): string {
  if (s === "Đang bán") return "outbound-badge outbound-badge-ok";
  return "outbound-badge outbound-badge-warn";
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

type SkuListProps = {
  group: ProductGroupRow;
  onBackToGroups: () => void;
  onCreate: () => void;
  onView: (p: ProductSkuRow) => void;
  onEdit: (p: ProductSkuRow) => void;
};

function ProductSkuListView({ group, onBackToGroups, onCreate, onView, onEdit }: SkuListProps): ReactElement {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ProductSkuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchSkus({
        groupCode: group.groupCode,
        search: search.trim() || undefined,
      });
      setRows(data);
    } catch (err) {
      setRows([]);
      setListError(getHttpErrorMessage(err, "Không tải được danh sách SKU."));
    } finally {
      setLoading(false);
    }
  }, [group.groupCode, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => `${r.skuCode} ${r.name}`.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="app-page outbound-page outbound-order-list-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBackToGroups}>
            ← Danh sách nhóm hàng
          </button>
        </div>
        <p className="out-create-crumb muted">
          Danh mục <span className="out-create-crumb-sep">&gt;</span> Quản lý sản phẩm trong nhóm{" "}
          <span className="out-create-crumb-sep">&gt;</span> SKU — {group.groupName}
        </p>
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">Hàng hóa trong nhóm</h1>
            <p className="enterprise-page-meta">SKU thuộc nhóm {group.groupName} — tra cứu nhanh trước khi tạo phiếu.</p>
          </div>
          <button type="button" className="outbound-btn-primary" onClick={onCreate}>
            Thêm mới hàng hóa
          </button>
        </div>

        <section className="outbound-filters card">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Tìm kiếm SKU</span>
              <input
                type="text"
                placeholder="Mã SKU, tên hàng…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Mã nhóm</span>
              <input type="text" value={group.groupCode} readOnly disabled />
            </label>
          </div>
        </section>

        {listError && <p className="login-banner">{listError}</p>}
        {loading && <p className="muted">Đang tải SKU…</p>}

        <div className="outbound-table-wrap card builder-table-card">
          <div className="table-scroll">
            <table className="outbound-table lines-table condensed">
              <thead>
                <tr>
                  <th className="outbound-col-stt">STT</th>
                  <th>Mã SKU</th>
                  <th>Tên hàng hóa</th>
                  <th>ĐVT</th>
                  <th className="align-right">Giá bán lẻ</th>
                  <th>Trạng thái</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{r.skuCode}</td>
                    <td>{r.name}</td>
                    <td className="muted">{r.unit}</td>
                    <td className="align-right">{formatMoney(r.retailPrice)}</td>
                    <td>
                      <span className={skuStatusClass(r.status)}>{r.status}</span>
                    </td>
                    <td>
                      <span className="table-action-group">
                        <button
                          type="button"
                          className="table-action-btn"
                          title="Xem"
                          aria-label="Xem"
                          onClick={() => onView(r)}
                        >
                          <IconActionView className="table-action-ico" />
                        </button>
                        <button
                          type="button"
                          className="table-action-btn"
                          title="Sửa"
                          aria-label="Sửa"
                          onClick={() => onEdit(r)}
                        >
                          <IconActionEdit className="table-action-ico" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !filtered.length && (
            <p className="outbound-empty muted">
              {rows.length === 0 ? "Nhóm này chưa có SKU — dùng « Thêm mới hàng hóa »." : "Không có SKU phù hợp tìm kiếm."}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

/** Quản lý sản phẩm trong nhóm hàng hóa — dữ liệu API. */
export function ProductGroupListScreen({ onBack }: Props): ReactElement {
  const [flow, setFlow] = useState<Flow>({ step: "groups" });
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [groups, setGroups] = useState<ProductGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [gCode, setGCode] = useState("");
  const [gName, setGName] = useState("");
  const [gOwner, setGOwner] = useState("");
  const [gStatus, setGStatus] = useState<ProductGroupStatus>("Hoạt động");
  const [savingGroup, setSavingGroup] = useState(false);
  const [skuReload, setSkuReload] = useState(0);
  const [groupFieldErrors, setGroupFieldErrors] = useState<ProductGroupFieldErrors>({});

  const groupFormBannerText = useMemo(() => {
    const parts = Object.values(groupFieldErrors).filter(Boolean);
    return [...new Set(parts)].join(" · ");
  }, [groupFieldErrors]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProductGroups({
        status: statusFilter || undefined,
        owner: ownerFilter.trim() || undefined,
        search: search.trim() || undefined,
      });
      setGroups(data);
      setError(null);
    } catch (err) {
      setError(getHttpErrorMessage(err, "Không tải được danh sách nhóm."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, ownerFilter, search]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  if (flow.step === "form") {
    return (
      <ProductSkuFormScreen
        group={flow.group}
        mode={flow.mode}
        product={flow.product}
        onBack={() => {
          setSkuReload((x) => x + 1);
          setFlow({ step: "skus", group: flow.group });
        }}
        onMutate={() => setSkuReload((x) => x + 1)}
      />
    );
  }

  if (flow.step === "skus") {
    return (
      <ProductSkuListView
        key={`${flow.group.id}-${skuReload}`}
        group={flow.group}
        onBackToGroups={() => setFlow({ step: "groups" })}
        onCreate={() => setFlow({ step: "form", group: flow.group, mode: "create" })}
        onView={(p) => setFlow({ step: "form", group: flow.group, mode: "view", product: p })}
        onEdit={(p) => setFlow({ step: "form", group: flow.group, mode: "edit", product: p })}
      />
    );
  }

  const saveGroup = async (): Promise<void> => {
    const checked = validateProductGroupCreateForm({
      groupCode: gCode,
      groupName: gName,
      ownerLabel: gOwner,
      status: gStatus,
    });
    if (!checked.ok) {
      setGroupFieldErrors(checked.errors);
      return;
    }
    setGroupFieldErrors({});
    setSavingGroup(true);
    try {
      await createProductGroup({
        groupCode: gCode.trim(),
        groupName: gName.trim(),
        ownerLabel: gOwner.trim(),
        status: gStatus,
      });
      setShowGroupForm(false);
      setGCode("");
      setGName("");
      setGOwner("");
      setGStatus("Hoạt động");
      setGroupFieldErrors({});
      await loadGroups();
    } catch (err) {
      await appAlert(getHttpErrorMessage(err, "Không tạo được nhóm (mã trùng?)."), { title: "Không tạo được" });
    } finally {
      setSavingGroup(false);
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
            <h1 className="outbound-title">Quản lý sản phẩm trong nhóm hàng hóa</h1>
            <p className="enterprise-page-meta">Nhóm → SKU; dữ liệu dùng trên phiếu và báo cáo tồn kho.</p>
          </div>
          <button
            type="button"
            className="outbound-btn-primary"
            onClick={() => {
              setGroupFieldErrors({});
              setShowGroupForm(true);
            }}
          >
            Thêm nhóm
          </button>
        </div>

        {showGroupForm && (
          <section className="outbound-filters card" style={{ marginBottom: 12 }}>
            {groupFormBannerText ? (
              <div className="banner banner-error subtle" role="alert" style={{ marginBottom: 8 }}>
                {groupFormBannerText}
              </div>
            ) : null}
            <div className="outbound-filter-grid">
              <label className="field compact">
                <span>Mã nhóm *</span>
                <input
                  value={gCode}
                  maxLength={PRODUCT_GROUP_CODE_MAX}
                  aria-invalid={Boolean(groupFieldErrors.group_code)}
                  onChange={(e) => {
                    setGCode(e.target.value);
                    setGroupFieldErrors((p) => {
                      const n = { ...p };
                      delete n.group_code;
                      return n;
                    });
                  }}
                />
                {groupFieldErrors.group_code ? <p className="inline-error">{groupFieldErrors.group_code}</p> : null}
              </label>
              <label className="field compact">
                <span>Tên nhóm *</span>
                <input
                  value={gName}
                  maxLength={PRODUCT_GROUP_NAME_MAX}
                  aria-invalid={Boolean(groupFieldErrors.group_name)}
                  onChange={(e) => {
                    setGName(e.target.value);
                    setGroupFieldErrors((p) => {
                      const n = { ...p };
                      delete n.group_name;
                      return n;
                    });
                  }}
                />
                {groupFieldErrors.group_name ? <p className="inline-error">{groupFieldErrors.group_name}</p> : null}
              </label>
              <label className="field compact">
                <span>Bộ phận</span>
                <input
                  value={gOwner}
                  maxLength={PRODUCT_GROUP_OWNER_MAX}
                  aria-invalid={Boolean(groupFieldErrors.owner_label)}
                  onChange={(e) => {
                    setGOwner(e.target.value);
                    setGroupFieldErrors((p) => {
                      const n = { ...p };
                      delete n.owner_label;
                      return n;
                    });
                  }}
                />
                {groupFieldErrors.owner_label ? <p className="inline-error">{groupFieldErrors.owner_label}</p> : null}
              </label>
              <label className="field compact">
                <span>Trạng thái</span>
                <select
                  value={gStatus}
                  aria-invalid={Boolean(groupFieldErrors.status)}
                  onChange={(e) => {
                    setGStatus(e.target.value as ProductGroupStatus);
                    setGroupFieldErrors((p) => {
                      const n = { ...p };
                      delete n.status;
                      return n;
                    });
                  }}
                >
                  <option>Hoạt động</option>
                  <option>Khóa</option>
                </select>
                {groupFieldErrors.status ? <p className="inline-error">{groupFieldErrors.status}</p> : null}
              </label>
            </div>
            <div className="out-create-actions" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowGroupForm(false);
                  setGroupFieldErrors({});
                }}
              >
                Hủy
              </button>
              <button type="button" className="outbound-btn-primary" disabled={savingGroup} onClick={() => void saveGroup()}>
                {savingGroup ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </section>
        )}

        <section className="outbound-filters card">
          <div className="outbound-filter-grid">
            <label className="field compact">
              <span>Trạng thái</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option>Hoạt động</option>
                <option>Khóa</option>
              </select>
            </label>
            <label className="field compact">
              <span>Bộ phận phụ trách</span>
              <input
                type="text"
                placeholder="Lọc theo bộ phận"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              />
            </label>
            <label className="field compact">
              <span>Tìm kiếm</span>
              <input
                type="text"
                placeholder="Mã nhóm, tên nhóm…"
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
                  <th>Mã nhóm</th>
                  <th>Tên nhóm hàng</th>
                  <th className="align-right">Số SKU</th>
                  <th>Bộ phận phụ trách</th>
                  <th>Cập nhật</th>
                  <th>Trạng thái</th>
                  <th className="narrow">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((r, i) => (
                  <tr key={r.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{r.groupCode}</td>
                    <td>{r.groupName}</td>
                    <td className="align-right">{r.skuCount}</td>
                    <td className="muted">{r.owner}</td>
                    <td className="muted">{formatDateTime(r.updatedAt)}</td>
                    <td>
                      <span className={statusClass(r.status)}>{r.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Xem danh sách SKU"
                        aria-label="Xem danh sách SKU"
                        onClick={() => setFlow({ step: "skus", group: r })}
                      >
                        <IconActionView className="table-action-ico" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !groups.length && <p className="outbound-empty muted">Không có nhóm phù hợp bộ lọc.</p>}
        </div>
      </main>
    </div>
  );
}

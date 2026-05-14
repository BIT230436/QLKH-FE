import { useEffect, useState, type ReactElement } from "react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { appAlert } from "../common/appDialogs";
import type { ProductGroupRow, ProductSkuRow, ProductSkuStatus } from "../../types/inventory";
import { createSku, deleteSku, updateSku } from "../../services/catalogMgmtApi";

type FormMode = "create" | "view" | "edit";

type Props = {
  group: ProductGroupRow;
  mode: FormMode;
  /** Bắt buộc với view / edit */
  product?: ProductSkuRow | null;
  onBack: () => void;
  /** Gọi sau khi tạo / cập nhật / xóa thành công để làm mới danh sách SKU */
  onMutate?: () => void;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function emptyDraft(groupCode: string): Omit<ProductSkuRow, "id" | "updatedAt"> {
  return {
    skuCode: "",
    name: "",
    unit: "Cái",
    retailPrice: 0,
    wholesalePrice: 0,
    vatPct: 10,
    barcode: "",
    note: "",
    groupCode,
    status: "Đang bán",
  };
}

/**
 * Thêm mới / Xem / Cập nhật hàng hóa trong nhóm — khung Figma / Builder (chưa API).
 */
export function ProductSkuFormScreen({ group, mode, product, onBack, onMutate }: Props): ReactElement {
  const [saving, setSaving] = useState(false);
  const [skuCode, setSkuCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Cái");
  const [retail, setRetail] = useState("");
  const [wholesale, setWholesale] = useState("");
  const [vat, setVat] = useState("10");
  const [barcode, setBarcode] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ProductSkuStatus>("Đang bán");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (mode === "create") {
      const d = emptyDraft(group.groupCode);
      setSkuCode(d.skuCode);
      setName(d.name);
      setUnit(d.unit);
      setRetail("");
      setWholesale("");
      setVat(String(d.vatPct));
      setBarcode(d.barcode);
      setNote(d.note);
      setStatus(d.status);
      return;
    }
    if (product) {
      setSkuCode(product.skuCode);
      setName(product.name);
      setUnit(product.unit);
      setRetail(String(product.retailPrice));
      setWholesale(String(product.wholesalePrice));
      setVat(String(product.vatPct));
      setBarcode(product.barcode);
      setNote(product.note);
      setStatus(product.status);
    }
  }, [mode, product, group.groupCode]);

  if (mode !== "create" && !product) {
    return (
      <div className="app-page outbound-page out-create-page feature-doc-page">
        <main className="outbound-main out-create-main">
          <div className="out-detail-toolbar">
            <button type="button" className="app-inbound-back" onClick={onBack}>
              ← Quay lại
            </button>
          </div>
          <p className="muted">Thiếu dữ liệu hàng hóa.</p>
        </main>
      </div>
    );
  }

  const readOnly = mode === "view";

  const title =
    mode === "create"
      ? "Thêm mới hàng hóa"
      : mode === "view"
        ? "Xem thông tin hàng hóa"
        : "Cập nhật thông tin hàng hóa";

  const crumbAction =
    mode === "create"
      ? "Thêm mới hàng hóa"
      : mode === "view"
        ? "Xem thông tin hàng hóa"
        : "Cập nhật thông tin hàng hóa";

  return (
    <div className="app-page outbound-page out-create-page feature-doc-page">
      <main className="outbound-main out-create-main">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Danh sách SKU trong nhóm
          </button>
        </div>
        <p className="out-create-crumb muted">
          Danh mục <span className="out-create-crumb-sep">&gt;</span> Quản lý sản phẩm trong nhóm{" "}
          <span className="out-create-crumb-sep">&gt;</span> {group.groupName}{" "}
          <span className="out-create-crumb-sep">&gt;</span> {crumbAction}
        </p>
        <h1 className="out-create-doc-title">{title}</h1>
        <p className="muted product-sku-form-sub">
          Nhóm: <strong>{group.groupCode}</strong> — {group.groupName}
        </p>

        <section className="card out-create-section">
          <div className="section-head">
            <h2 className="out-create-section-title">Thông tin hàng hóa</h2>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Mã SKU</span>
              <input
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="VD: NH-DT-XXX-001"
              />
            </label>
            <label className="field">
              <span>Tên hàng hóa</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
            <label className="field">
              <span>Đơn vị tính</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} readOnly={readOnly} disabled={readOnly} />
            </label>
            <label className="field">
              <span>Giá bán lẻ (đ)</span>
              <input
                value={retail}
                onChange={(e) => setRetail(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="0"
              />
            </label>
            <label className="field">
              <span>Giá buôn / đại lý (đ)</span>
              <input
                value={wholesale}
                onChange={(e) => setWholesale(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="0"
              />
            </label>
            <label className="field">
              <span>VAT (%)</span>
              <input value={vat} onChange={(e) => setVat(e.target.value)} readOnly={readOnly} disabled={readOnly} />
            </label>
            <label className="field">
              <span>Mã vạch</span>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
            <label className="field">
              <span>Trạng thái</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductSkuStatus)}
                disabled={readOnly}
              >
                <option>Đang bán</option>
                <option>Ngưng bán</option>
              </select>
            </label>
            <label className="field span-2">
              <span>Ghi chú</span>
              <textarea
                className="textarea-field"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
          </div>
        </section>

        {mode === "view" && product && (
          <section className="card out-create-section">
            <div className="section-head">
              <h2 className="out-create-section-title">Thông tin hệ thống</h2>
            </div>
            <div className="out-detail-info-grid">
              <div className="out-detail-kv">
                <span className="muted">Mã nhóm</span>
                <span>{product.groupCode}</span>
              </div>
              <div className="out-detail-kv">
                <span className="muted">Cập nhật lần cuối</span>
                <span>
                  {new Date(product.updatedAt).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="out-detail-kv">
                <span className="muted">Giá lẻ (định dạng)</span>
                <span>{formatMoney(product.retailPrice)}</span>
              </div>
            </div>
          </section>
        )}

        {mode === "edit" && product && (
          <div className="product-sku-delete-wrap">
            <button type="button" className="btn-ghost-danger" onClick={() => setDeleteConfirmOpen(true)}>
              Xóa hàng hóa
            </button>
          </div>
        )}

        <div className="out-create-actions">
          <button type="button" className="btn-secondary" onClick={onBack}>
            {readOnly ? "Đóng" : "Hủy"}
          </button>
          {!readOnly && (
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  const rp = Number(retail.replace(/\./g, "").replace(/,/g, ""));
                  const wp = Number(wholesale.replace(/\./g, "").replace(/,/g, ""));
                  const v = Number(vat);
                  if (!skuCode.trim() || !name.trim() || !Number.isFinite(rp) || !Number.isFinite(wp)) {
                    await appAlert("Kiểm tra mã, tên và giá.", { title: "Thiếu thông tin" });
                    return;
                  }
                  setSaving(true);
                  try {
                    if (mode === "create") {
                      await createSku({
                        groupId: group.id,
                        skuCode: skuCode.trim(),
                        name: name.trim(),
                        unit,
                        retailPrice: rp,
                        wholesalePrice: wp,
                        vatPct: Number.isFinite(v) ? v : 0,
                        barcode,
                        note,
                        status,
                      });
                    } else if (mode === "edit" && product) {
                      await updateSku(product.id, {
                        skuCode: skuCode.trim(),
                        name: name.trim(),
                        unit,
                        retailPrice: rp,
                        wholesalePrice: wp,
                        vatPct: Number.isFinite(v) ? v : 0,
                        barcode,
                        note,
                        status,
                      });
                    }
                    onMutate?.();
                    onBack();
                  } catch {
                    await appAlert("Không lưu được.", { title: "Không lưu được" });
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              {saving ? "Đang lưu…" : mode === "create" ? "Lưu" : "Cập nhật"}
            </button>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Xóa hàng hóa"
        message="Bạn chắc chắn muốn xóa hàng hóa này?"
        confirmLabel="Đồng ý"
        cancelLabel="Hủy"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          void (async () => {
            setDeleteConfirmOpen(false);
            if (!product) return;
            try {
              await deleteSku(product.id);
              onMutate?.();
              onBack();
            } catch {
              await appAlert("Không xóa được.", { title: "Không xóa được" });
            }
          })();
        }}
      />
    </div>
  );
}

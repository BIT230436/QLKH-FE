import { useEffect, useRef, useState, type ReactElement } from "react";
import { fetchSuppliers, fetchWarehouses } from "../../services/catalogApi";
import type { Supplier, Warehouse } from "../../services/types";
import { getHttpErrorMessage } from "../../utils/errors";
import { ReceiptListPanel } from "../common/ReceiptListPanel";
import { InboundReceiptDetailScreen } from "./InboundReceiptDetailScreen";

type Props = {
  onBack: () => void;
  onCreate: () => void;
};

/**
 * Danh sách phiếu nhập — khung giao diện theo Figma / Builder (bộ lọc + bảng),
 * dữ liệu từ API danh sách phiếu nhập. « Xem » mở màn chi tiết full-page.
 */
export function InboundReceiptListScreen({ onBack, onCreate }: Props): ReactElement {
  const listSectionRef = useRef<HTMLElement | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [s, w] = await Promise.all([fetchSuppliers(), fetchWarehouses()]);
        if (!cancelled) {
          setSuppliers(s);
          setWarehouses(w);
        }
      } catch (e) {
        if (!cancelled) setCatalogError(getHttpErrorMessage(e, "Không tải được danh mục."));
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (detailId != null) {
    return (
      <InboundReceiptDetailScreen
        receiptId={detailId}
        onClose={() => setDetailId(null)}
        onAfterMutation={() => setListRefreshKey((k) => k + 1)}
      />
    );
  }

  return (
    <div className="app-page outbound-page inbound-list-page">
      <main className="outbound-main enterprise-ops-stack">
        <div className="out-detail-toolbar">
          <button type="button" className="app-inbound-back" onClick={onBack}>
            ← Tổng quan
          </button>
        </div>
        <div className="outbound-head">
          <div>
            <h1 className="outbound-title">Danh sách phiếu nhập</h1>
            <p className="enterprise-page-meta">
              Phiếu 01-VT — lọc theo kho, nhà cung cấp và trạng thái. Tạo mới: nút « Tạo phiếu nhập kho ».
            </p>
          </div>
          <button
            type="button"
            className="outbound-btn-primary"
            onClick={onCreate}
            disabled={catalogLoading}
          >
            Tạo phiếu nhập kho
          </button>
        </div>

        {catalogError && <div className="banner banner-error">{catalogError}</div>}

        <ReceiptListPanel
          layout="builder"
          suppliers={suppliers}
          warehouses={warehouses}
          onOpenReceiptDetail={(id) => setDetailId(id)}
          listSectionRef={listSectionRef}
          refreshKey={listRefreshKey}
          highlightReceiptId={null}
        />
      </main>
    </div>
  );
}

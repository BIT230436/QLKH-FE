import { useCallback, type ReactElement } from "react";
import { CatalogSourceListScreen } from "../../components/catalog/CatalogSourceListScreen";
import { ProductGroupListScreen } from "../../components/catalog/ProductGroupListScreen";
import { InboundOrderCreateScreen } from "../../components/inbound/InboundOrderCreateScreen";
import { InboundOrderListScreen } from "../../components/inbound/InboundOrderListScreen";
import { InboundReceiptListScreen } from "../../components/inbound/InboundReceiptListScreen";
import { InboundReceiptScreen } from "../../components/inbound/InboundReceiptScreen";
import { OutboundOrderCreateScreen } from "../../components/outbound/OutboundOrderCreateScreen";
import { OutboundOrderListScreen } from "../../components/outbound/OutboundOrderListScreen";
import { OutboundReceiptCreateScreen } from "../../components/outbound/OutboundReceiptCreateScreen";
import { OutboundReceiptListScreen } from "../../components/outbound/OutboundReceiptListScreen";
import { StockAuditCreateScreen } from "../../components/stockAudit/StockAuditCreateScreen";
import { StockAuditListScreen } from "../../components/stockAudit/StockAuditListScreen";
import { ReportInboundScreen } from "../../components/reports/ReportInboundScreen";
import { ReportIoScreen, ReportStockScreen } from "../../components/reports/ReportOperationalScreens";
import { ContractListScreen } from "../../components/contracts/ContractListScreen";
import { HomePage } from "../Home/HomePage";
import { AppShell } from "../../layout/AppShell";
import type { NavAction } from "../../layout/appNavigation";
import type { AppPage } from "../../layout/appPages";

export type { AppPage } from "../../layout/appPages";

type Props = {
  page: AppPage;
  setPage: (p: AppPage) => void;
  onLogout: () => void;
  userLabel: string;
};

/** Điều hướng nội bộ (state) sau khi đăng nhập — tương đương khu vực `pages` trong wireframe. */
export function InventoryPages({ page, setPage, onLogout, userLabel }: Props): ReactElement {
  const onNavigate = useCallback(
    (action: NavAction) => {
      switch (action) {
        case "inbound-list":
          setPage("inbound-list");
          break;
        case "inbound-create":
          setPage("inbound-create");
          break;
        case "outbound":
          setPage("outbound");
          break;
        case "outbound-nvbh":
          setPage("outbound-nvbh");
          break;
        case "outbound-orders":
          setPage("outbound-orders");
          break;
        case "inbound-orders":
          setPage("inbound-orders");
          break;
        case "stock-audit-list":
          setPage("stock-audit-list");
          break;
        case "stock-audit-create":
          setPage("stock-audit-create");
          break;
        case "outbound-internal":
          setPage("outbound-internal");
          break;
        case "catalog-sources":
          setPage("catalog-sources");
          break;
        case "catalog-product-groups":
          setPage("catalog-product-groups");
          break;
        case "report-inbound":
          setPage("report-inbound");
          break;
        case "report-stock":
          setPage("report-stock");
          break;
        case "report-io":
          setPage("report-io");
          break;
        case "contract-list":
          setPage("contract-list");
          break;
        default:
          break;
      }
    },
    [setPage]
  );

  const reportNav = {
    onBack: () => setPage("home"),
    onOpenInboundList: () => setPage("inbound-list"),
    onOpenInboundReport: () => setPage("report-inbound"),
    onOpenOutboundNcc: () => setPage("outbound"),
    onOpenOutboundInternal: () => setPage("outbound-internal"),
    onOpenOutboundNvbh: () => setPage("outbound-nvbh"),
    onOpenInboundOrders: () => setPage("inbound-orders"),
    onOpenOutboundOrders: () => setPage("outbound-orders"),
    onOpenStockAuditList: () => setPage("stock-audit-list"),
  };

  const renderContent = (): ReactElement => {
  if (page === "report-inbound") {
    return <ReportInboundScreen onBack={() => setPage("home")} />;
  }

  if (page === "report-stock") {
    return <ReportStockScreen nav={reportNav} />;
  }

  if (page === "report-io") {
    return <ReportIoScreen nav={reportNav} />;
  }

  if (page === "contract-list") {
    return <ContractListScreen onBack={() => setPage("home")} />;
  }

  if (page === "outbound-nvbh-create") {
    return (
      <OutboundReceiptCreateScreen
        onBack={() => setPage("outbound-nvbh")}
        backLabel="← Danh sách phiếu xuất kho NVBH"
        crumbSection="Xuất - nhập với NVBH"
        crumbAction="Tạo mới phiếu xuất kho"
        receiptScope="nvbh"
        userDisplayName={userLabel}
      />
    );
  }

  if (page === "outbound-nvbh") {
    return (
      <OutboundReceiptListScreen
        onCreate={() => setPage("outbound-nvbh-create")}
        title="Danh sách phiếu xuất kho với NVBH"
        sourceColumnLabel="Đối tác / NVBH"
        detailBackLabel="← Danh sách phiếu xuất kho NVBH"
        detailCrumbSection="Xuất - nhập với NVBH"
        detailCrumbAction="Xem phiếu xuất kho"
        receiptScope="nvbh"
      />
    );
  }

  if (page === "inbound-list") {
    return (
      <InboundReceiptListScreen
        onBack={() => setPage("home")}
        onCreate={() => setPage("inbound-create")}
      />
    );
  }

  if (page === "inbound-create") {
    return <InboundReceiptScreen onBack={() => setPage("inbound-list")} />;
  }

  if (page === "inbound-orders") {
    return (
      <InboundOrderListScreen
        onBack={() => setPage("home")}
        onCreate={() => setPage("inbound-order-create")}
      />
    );
  }

  if (page === "inbound-order-create") {
    return <InboundOrderCreateScreen onBack={() => setPage("inbound-orders")} userDisplayName={userLabel} />;
  }

  if (page === "outbound-orders") {
    return (
      <OutboundOrderListScreen
        onBack={() => setPage("home")}
        onCreate={() => setPage("outbound-order-create")}
      />
    );
  }

  if (page === "outbound-order-create") {
    return <OutboundOrderCreateScreen onBack={() => setPage("outbound-orders")} userDisplayName={userLabel} />;
  }

  if (page === "outbound-internal-create") {
    return (
      <OutboundReceiptCreateScreen
        onBack={() => setPage("outbound-internal")}
        backLabel="← Danh sách phiếu xuất kho nội bộ"
        crumbSection="Xuất - nhập với Nội bộ"
        crumbAction="Tạo mới phiếu xuất kho"
        receiptScope="internal"
        userDisplayName={userLabel}
      />
    );
  }

  if (page === "outbound-internal") {
    return (
      <OutboundReceiptListScreen
        onCreate={() => setPage("outbound-internal-create")}
        title="Danh sách phiếu xuất kho với Nội bộ"
        sourceColumnLabel="Bộ phận / đích nhận"
        detailBackLabel="← Danh sách phiếu xuất kho nội bộ"
        detailCrumbSection="Xuất - nhập với Nội bộ"
        detailCrumbAction="Xem phiếu xuất kho"
        receiptScope="internal"
      />
    );
  }

  if (page === "catalog-sources") {
    return <CatalogSourceListScreen onBack={() => setPage("home")} />;
  }

  if (page === "catalog-product-groups") {
    return <ProductGroupListScreen onBack={() => setPage("home")} />;
  }

  if (page === "outbound-create") {
    return <OutboundReceiptCreateScreen onBack={() => setPage("outbound")} receiptScope="ncc" userDisplayName={userLabel} />;
  }

  if (page === "stock-audit-list") {
    return (
      <StockAuditListScreen
        onBack={() => setPage("home")}
        onCreate={() => setPage("stock-audit-create")}
      />
    );
  }

  if (page === "stock-audit-create") {
    return <StockAuditCreateScreen onBack={() => setPage("stock-audit-list")} userDisplayName={userLabel} />;
  }

  if (page === "outbound") {
    return (
      <OutboundReceiptListScreen
        onCreate={() => setPage("outbound-create")}
        title="Danh sách phiếu xuất kho với NCC"
        detailCrumbSection="Xuất - nhập với NCC"
        receiptScope="ncc"
      />
    );
  }

  return (
    <HomePage
      onOpenInboundList={() => setPage("inbound-list")}
      onOpenInboundCreate={() => setPage("inbound-create")}
      onOpenOutboundList={() => setPage("outbound")}
      onOpenOutboundOrderList={() => setPage("outbound-orders")}
      onOpenInboundOrderList={() => setPage("inbound-orders")}
      onOpenStockAuditList={() => setPage("stock-audit-list")}
      onOpenStockAuditCreate={() => setPage("stock-audit-create")}
      onOpenOutboundInternalList={() => setPage("outbound-internal")}
      onOpenCatalogSources={() => setPage("catalog-sources")}
      onOpenCatalogProductGroups={() => setPage("catalog-product-groups")}
      onOpenReportInbound={() => setPage("report-inbound")}
      onOpenReportStock={() => setPage("report-stock")}
      onOpenReportIo={() => setPage("report-io")}
      onOpenContracts={() => setPage("contract-list")}
      onOpenOutboundNvbhList={() => setPage("outbound-nvbh")}
    />
  );
  };

  return (
    <AppShell
      page={page}
      userLabel={userLabel}
      onLogout={onLogout}
      onNavigate={onNavigate}
      onGoHome={() => setPage("home")}
      onNotificationNavigate={(p) => setPage(p)}
    >
      {renderContent()}
    </AppShell>
  );
}

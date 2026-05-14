export type Supplier = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
};

export type Warehouse = {
  id: number;
  code: string | null;
  name: string;
  address: string | null;
};

export type Product = {
  id: number;
  name: string;
  unit: string;
  price: string;
};

export type ReceiptAttachment = {
  id: number;
  receipt_id: number;
  label: string | null;
  file_url: string;
  sort_order: number;
};

export type ReceiptSummary = {
  id: number;
  receipt_code: string;
  supplier_id: number;
  warehouse_id: number;
  document_date: string;
  org_unit: string | null;
  department: string | null;
  debit_account: string | null;
  credit_account: string | null;
  deliverer_name: string | null;
  source_doc_no: string | null;
  source_doc_date: string | null;
  source_doc_issuer: string | null;
  source_doc_note: string | null;
  attached_original_count: number;
  status: string;
  created_at: string;
  total_amount: string;
  supplier_name: string;
  warehouse_name: string;
};

export type ReceiptDetail = {
  receipt: ReceiptSummary;
  items: Array<{
    id: number;
    receipt_id: number;
    product_id: number;
    quantity_per_doc: string;
    quantity_received: string;
    unit_price: string;
    subtotal: string;
    product_name: string;
    product_unit: string;
  }>;
  attachments: ReceiptAttachment[];
  total_amount_in_words: string;
};

export type ReceiptListResponse = {
  items: ReceiptSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateReceiptPayload = {
  receipt_code: string;
  supplier_id: number;
  warehouse_id: number;
  document_date: string;
  org_unit?: string;
  department?: string;
  debit_account?: string;
  credit_account?: string;
  deliverer_name?: string;
  source_doc_no?: string;
  source_doc_date?: string;
  source_doc_issuer?: string;
  source_doc_note?: string;
  attached_original_count?: number;
  status?: "draft" | "posted";
  attachments?: Array<{ label?: string; file_url: string }>;
  items: Array<{
    product_id: number;
    quantity_per_doc?: number;
    quantity_received?: number;
    quantity?: number;
    unit_price: number;
  }>;
};

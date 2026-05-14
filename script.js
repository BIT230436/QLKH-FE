const STORAGE_KEY = "warehouse_inventory";

const state = {
  inventory: loadInventory(),
  query: "",
};

const refs = {
  form: document.getElementById("product-form"),
  search: document.getElementById("search"),
  tbody: document.getElementById("inventory-body"),
  stats: {
    totalProducts: document.getElementById("stat-total-products"),
    totalQuantity: document.getElementById("stat-total-quantity"),
    totalValue: document.getElementById("stat-total-value"),
    lowStock: document.getElementById("stat-low-stock"),
  },
};

refs.form.addEventListener("submit", onSubmit);
refs.search.addEventListener("input", onSearch);

render();

function onSubmit(event) {
  event.preventDefault();
  const formData = new FormData(refs.form);

  const item = {
    code: String(formData.get("code")).trim(),
    name: String(formData.get("name")).trim(),
    category: String(formData.get("category")).trim(),
    location: String(formData.get("location")).trim(),
    quantity: toNonNegativeInt(formData.get("quantity")),
    price: toNonNegativeInt(formData.get("price")),
  };

  if (!item.code || !item.name || !item.category || !item.location) {
    return;
  }

  const existingIndex = state.inventory.findIndex((current) => current.code === item.code);

  if (existingIndex >= 0) {
    state.inventory[existingIndex] = item;
  } else {
    state.inventory.push(item);
  }

  refs.form.reset();
  saveInventory();
  render();
}

function onSearch(event) {
  state.query = event.target.value.trim().toLowerCase();
  renderTable();
}

function render() {
  renderStats();
  renderTable();
}

function renderStats() {
  const totalProducts = state.inventory.length;
  const totalQuantity = state.inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = state.inventory.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const lowStock = state.inventory.filter((item) => item.quantity <= 5).length;

  refs.stats.totalProducts.textContent = formatNumber(totalProducts);
  refs.stats.totalQuantity.textContent = formatNumber(totalQuantity);
  refs.stats.totalValue.textContent = `${formatNumber(totalValue)} ₫`;
  refs.stats.lowStock.textContent = formatNumber(lowStock);
}

function renderTable() {
  refs.tbody.replaceChildren();

  const rows = state.inventory.filter((item) => {
    if (!state.query) {
      return true;
    }

    const searchable = `${item.code} ${item.name}`.toLowerCase();
    return searchable.includes(state.query);
  });

  for (const item of rows) {
    const tr = document.createElement("tr");
    appendCell(tr, item.code);
    appendCell(tr, item.name);
    appendCell(tr, item.category);
    appendCell(tr, item.location);
    appendCell(tr, formatNumber(item.quantity));
    appendCell(tr, `${formatNumber(item.price)} ₫`);
    appendCell(tr, `${formatNumber(item.quantity * item.price)} ₫`);

    const actionTd = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "action-buttons";

    actions.append(createActionButton("+1", () => updateQuantity(item.code, 1)));
    actions.append(createActionButton("-1", () => updateQuantity(item.code, -1)));
    actions.append(createActionButton("Xóa", () => removeItem(item.code), "danger"));

    actionTd.append(actions);
    tr.append(actionTd);
    refs.tbody.append(tr);
  }
}

function appendCell(row, value) {
  const td = document.createElement("td");
  td.textContent = value;
  row.append(td);
}

function createActionButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

function updateQuantity(code, delta) {
  state.inventory = state.inventory.map((item) => {
    if (item.code !== code) {
      return item;
    }

    return {
      ...item,
      quantity: Math.max(0, item.quantity + delta),
    };
  });

  saveInventory();
  render();
}

function removeItem(code) {
  state.inventory = state.inventory.filter((item) => item.code !== code);
  saveInventory();
  render();
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        code: String(item.code ?? "").trim(),
        name: String(item.name ?? "").trim(),
        category: String(item.category ?? "").trim(),
        location: String(item.location ?? "").trim(),
        quantity: toNonNegativeInt(item.quantity),
        price: toNonNegativeInt(item.price),
      }))
      .filter((item) => item.code && item.name);
  } catch {
    return [];
  }
}

function saveInventory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.inventory));
}

function toNonNegativeInt(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number) || number < 0) {
    return 0;
  }
  return number;
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

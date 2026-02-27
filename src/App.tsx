/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  Camera,
  ChevronRight,
  User,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  Smartphone,
  Headphones,
  Download,
  Upload,
  Cloud,
  Database as DatabaseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface User {
  id: number;
  username: string;
  role: 'admin' | 'accountant' | 'engineer';
}

interface Product {
  id: number;
  name: string;
  category: 'phone' | 'accessory';
  brand: string;
  model: string;
  sku: string;
  price: number;
  cost: number;
  stock_quantity: number;
  opening_stock: number;
  min_stock_level: number;
  location?: string;
  unit?: string;
  notes?: string;
  warehouse_id?: number;
}

interface MaintenanceRecord {
  id: number;
  customer_name: string;
  customer_phone: string;
  device_model: string;
  imei: string;
  device_condition: string;
  fault_description: string;
  symptoms: string;
  maintenance_type: string;
  cost: number;
  status: 'received' | 'in_progress' | 'completed' | 'delivered';
  notes: string;
  next_maintenance_date?: string;
  received_at: string;
  completed_at?: string;
}

interface LedgerEntry {
  id: number;
  type: 'revenue' | 'expense';
  category: string;
  amount: number;
  description: string;
  created_at: string;
}

interface StockAdjustment {
  id: number;
  product_id: number;
  product_name?: string;
  type: 'damaged' | 'correction' | 'lost';
  quantity: number;
  reason: string;
  created_at: string;
}

interface Warehouse {
  id: number;
  name: string;
  location: string;
  notes: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  opening_balance?: number;
  notes?: string;
}

interface Sale {
  id: number;
  customer_id: number;
  customer_name: string;
  user_id: number;
  total_amount: number;
  discount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method: string;
  invoice_number?: string;
  items?: any[];
  created_at: string;
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  balance: number;
  notes?: string;
}

interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name: string;
  user_id: number;
  total_amount: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  payment_method?: string;
  invoice_number?: string;
  items?: any[];
  created_at: string;
}

interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalProducts: number;
  lowStock: number;
  totalRevenue: number;
  totalExpenses: number;
  recentSales: Sale[];
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ title, value, icon: Icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
          <TrendingUp size={14} /> {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [settings, setSettings] = useState({ currency: 'USD', rate_yer: '530', rate_sar: '3.75' });
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  
  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isSupplierPaymentOpen, setIsSupplierPaymentOpen] = useState(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [isNewLedgerOpen, setIsNewLedgerOpen] = useState(false);
  const [isAddAdjustmentOpen, setIsAddAdjustmentOpen] = useState(false);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLocalBackup = async () => {
    try {
      const res = await fetch('/api/backup/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TrendPhone_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('تم تصدير النسخة الاحتياطية بنجاح!');
    } catch (e) {
      alert('خطأ في تصدير النسخة الاحتياطية');
    }
  };

  const handleLocalRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('تحذير: سيتم مسح كافة البيانات الحالية واستبدالها ببيانات ملف النسخة الاحتياطية. هل أنت متأكد؟')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          alert('تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة.');
          window.location.reload();
        } else {
          alert('خطأ في استعادة البيانات');
        }
      } catch (err) {
        alert('ملف غير صالح');
      }
    };
    reader.readAsText(file);
  };

  const handleGoogleDriveBackup = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_backup', 'width=600,height=700');
    } catch (e) {
      alert('خطأ في الاتصال بـ Google Drive');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_BACKUP_SUCCESS') {
        alert('تم النسخ الاحتياطي إلى Google Drive بنجاح!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Form data state
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '', opening_balance: 0, notes: '' });
  const [paymentData, setPaymentData] = useState({ customer_id: 0, amount: 0, description: 'Payment received', notes: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_person: '', phone: '', email: '', notes: '' });
  const [newLedger, setNewLedger] = useState({ type: 'revenue' as 'revenue' | 'expense', category: '', amount: 0, description: '' });
  const [newAdjustment, setNewAdjustment] = useState({ product_id: 0, type: 'damaged' as 'damaged' | 'correction' | 'lost', quantity: 1, reason: '' });
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '', notes: '' });
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    category: 'phone' as 'phone' | 'accessory', 
    brand: '', 
    model: '', 
    sku: '', 
    price: 0, 
    cost: 0, 
    stock_quantity: 0, 
    opening_stock: 0,
    min_stock_level: 5,
    unit: 'قطعة',
    location: '',
    warehouse_id: 0,
    notes: ''
  });
  const [newMaintenance, setNewMaintenance] = useState({
    customer_name: '',
    customer_phone: '',
    device_model: '',
    imei: '',
    device_condition: '',
    fault_description: '',
    symptoms: '',
    maintenance_type: 'screen',
    cost: 0,
    notes: '',
    next_maintenance_date: ''
  });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'accountant' as 'admin' | 'accountant' | 'engineer' });
  const [supplierPaymentData, setSupplierPaymentData] = useState({ supplier_id: 0, amount: 0, description: 'Payment to supplier', notes: '' });
  const [newSale, setNewSale] = useState({
    customer_id: 0,
    invoice_number: '',
    items: [] as { product_id: number, name: string, quantity: number, unit_price: number, subtotal: number }[],
    payment_status: 'paid' as 'paid' | 'partial' | 'unpaid',
    payment_method: 'Cash',
    discount: 0
  });
  const [newPurchase, setNewPurchase] = useState({
    supplier_id: 0,
    invoice_number: '',
    items: [] as { product_id: number, name: string, quantity: number, unit_cost: number, subtotal: number }[],
    payment_status: 'paid' as 'paid' | 'partial' | 'unpaid',
    payment_method: 'Cash'
  });
  const [productSearch, setProductSearch] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch functions
  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(data);
  };

  const fetchSuppliers = async () => {
    const res = await fetch('/api/suppliers');
    const data = await res.json();
    setSuppliers(data);
  };

  const fetchPurchases = async () => {
    const res = await fetch('/api/purchases');
    const data = await res.json();
    setPurchases(data);
  };

  const fetchSales = async () => {
    const res = await fetch('/api/sales');
    const data = await res.json();
    setSales(data);
  };

  const fetchWarehouses = async () => {
    const res = await fetch('/api/warehouses');
    const data = await res.json();
    setWarehouses(data);
  };

  const fetchMaintenance = async () => {
    const res = await fetch('/api/maintenance');
    const data = await res.json();
    setMaintenanceRecords(data);
  };

  const fetchLedger = async () => {
    const res = await fetch('/api/ledger');
    const data = await res.json();
    setLedger(data);
  };

  const fetchStockAdjustments = async () => {
    const res = await fetch('/api/stock-adjustments');
    const data = await res.json();
    setStockAdjustments(data);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setSettings(data);
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchProducts();
      fetchCustomers();
      fetchSuppliers();
      fetchPurchases();
      fetchSales();
      fetchWarehouses();
      fetchMaintenance();
      fetchLedger();
      fetchStockAdjustments();
      fetchSettings();
    }
  }, [user]);

  // Currency conversion helper
  const formatCurrency = (amount: number) => {
    const { currency, rate_yer, rate_sar } = settings;
    let converted = amount;
    let symbol = '$';
    
    if (currency === 'YER') {
      converted = amount * Number(rate_yer);
      symbol = 'ر.ي';
    } else if (currency === 'SAR') {
      converted = amount * Number(rate_sar);
      symbol = 'ر.س';
    }
    
    return `${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  };

  // Derived state
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.model.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Handlers
  const handleRecordSupplierPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/supplier-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supplierPaymentData)
    });
    if (res.ok) {
      setIsSupplierPaymentOpen(false);
      setSupplierPaymentData({ supplier_id: 0, amount: 0, description: 'Payment to supplier', notes: '' });
      fetchSuppliers();
      fetchStats();
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSupplier)
    });
    if (res.ok) {
      setIsAddSupplierOpen(false);
      setNewSupplier({ name: '', contact_person: '', phone: '', email: '', notes: '' });
      fetchSuppliers();
    }
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWarehouse)
    });
    if (res.ok) {
      setIsAddWarehouseOpen(false);
      setNewWarehouse({ name: '', location: '', notes: '' });
      fetchWarehouses();
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    if (res.ok) {
      setIsAddProductOpen(false);
      setNewProduct({ 
        name: '', 
        category: 'phone', 
        brand: '', 
        model: '', 
        sku: '', 
        price: 0, 
        cost: 0, 
        stock_quantity: 0, 
        opening_stock: 0,
        min_stock_level: 5,
        unit: 'قطعة',
        location: '',
        warehouse_id: 0,
        notes: ''
      });
      fetchProducts();
      fetchStats();
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMaintenance, user_id: user?.id })
    });
    if (res.ok) {
      setIsAddMaintenanceOpen(false);
      setNewMaintenance({
        customer_name: '',
        customer_phone: '',
        device_model: '',
        imei: '',
        device_condition: '',
        fault_description: '',
        symptoms: '',
        maintenance_type: 'screen',
        cost: 0,
        notes: '',
        next_maintenance_date: ''
      });
      fetchMaintenance();
      fetchStats();
    }
  };

  const handleNewLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLedger)
    });
    if (res.ok) {
      setIsNewLedgerOpen(false);
      setNewLedger({ type: 'revenue', category: '', amount: 0, description: '' });
      fetchLedger();
      fetchStats();
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/stock-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAdjustment)
    });
    if (res.ok) {
      setIsAddAdjustmentOpen(false);
      setNewAdjustment({ product_id: 0, type: 'damaged', quantity: 1, reason: '' });
      fetchStockAdjustments();
      fetchProducts();
      fetchStats();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      alert('تم إنشاء الحساب بنجاح');
      setNewUser({ username: '', password: '', role: 'accountant' });
    } else {
      const data = await res.json();
      alert(data.error || 'فشل إنشاء الحساب');
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    if (res.ok) {
      fetchSettings();
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer)
    });
    if (res.ok) {
      setIsAddCustomerOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '', opening_balance: 0, notes: '' });
      fetchCustomers();
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (res.ok) {
      setIsPaymentOpen(false);
      setPaymentData({ customer_id: 0, amount: 0, description: 'Payment received', notes: '' });
      fetchCustomers();
      fetchStats();
    }
  };

  const sendStatementsToAll = () => {
    const debtors = customers.filter(c => c.balance > 0);
    if (debtors.length === 0) return alert("No customers with debt found.");
    
    if (confirm(`Are you sure you want to open WhatsApp links for ${debtors.length} customers?`)) {
      debtors.forEach((customer, index) => {
        setTimeout(() => {
          const message = `مرحباً ${customer.name}،\n\nنود تذكيركم بأن رصيدكم المتبقي لدى محل ترند فون هو: ${formatCurrency(customer.balance)}.\n\nيرجى السداد في أقرب وقت. شكراً لكم.`;
          window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        }, index * 1000); // Delay to avoid browser blocking multiple popups
      });
    }
  };

  const addToSale = (product: Product) => {
    const existing = newSale.items.find(item => item.product_id === product.id);
    if (existing) {
      setNewSale({
        ...newSale,
        items: newSale.items.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        )
      });
    } else {
      setNewSale({
        ...newSale,
        items: [...newSale.items, { 
          product_id: product.id, 
          name: product.name, 
          quantity: 1, 
          unit_price: product.price, 
          subtotal: product.price 
        }]
      });
    }
  };

  const submitSale = async () => {
    if (newSale.items.length === 0) return alert("Add items first");
    
    const total_amount = newSale.items.reduce((sum, item) => sum + item.subtotal, 0) - newSale.discount;
    
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newSale,
        user_id: user?.id,
        total_amount
      })
    });

    if (res.ok) {
      alert("تم إنشاء الفاتورة بنجاح!");
      setIsNewSaleOpen(false);
      setNewSale({ 
        customer_id: 0, 
        invoice_number: '',
        items: [], 
        payment_status: 'paid', 
        payment_method: 'Cash', 
        discount: 0 
      });
      fetchStats();
      fetchProducts();
      fetchSales();
    } else {
      alert("Error creating invoice");
    }
  };

  const addToPurchase = (product: Product) => {
    const existing = newPurchase.items.find(item => item.product_id === product.id);
    if (existing) {
      setNewPurchase({
        ...newPurchase,
        items: newPurchase.items.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_cost }
            : item
        )
      });
    } else {
      setNewPurchase({
        ...newPurchase,
        items: [...newPurchase.items, { 
          product_id: product.id, 
          name: product.name, 
          quantity: 1, 
          unit_cost: product.cost, 
          subtotal: product.cost 
        }]
      });
    }
  };

  const submitPurchase = async () => {
    if (newPurchase.items.length === 0) return alert("Add items first");
    if (newPurchase.supplier_id === 0) return alert("Select a supplier");
    
    const total_amount = newPurchase.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPurchase,
        user_id: user?.id,
        total_amount
      })
    });

    if (res.ok) {
      alert("تم تسجيل المشتريات وتحديث المخزون!");
      setIsNewPurchaseOpen(false);
      setNewPurchase({ 
        supplier_id: 0, 
        invoice_number: '',
        items: [], 
        payment_status: 'paid',
        payment_method: 'Cash'
      });
      fetchStats();
      fetchProducts();
      fetchPurchases();
      fetchSuppliers();
    } else {
      alert("Error recording purchase");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
      setIsLoginOpen(false);
      if (userData.role === 'engineer') {
        setActiveTab('maintenance');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      alert('Invalid credentials');
    }
  };

  const startOCR = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsScanning(false);
    }
  };

  const captureAndProcess = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64Image = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsScanning(false);

        // Call Gemini for OCR
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
              { text: "Extract invoice details from this image. Return a JSON object with: customerName, items (array of {name, quantity, price}), totalAmount, date." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customerName: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      price: { type: Type.NUMBER }
                    }
                  }
                },
                totalAmount: { type: Type.NUMBER },
                date: { type: Type.STRING }
              }
            }
          }
        });

        console.log("OCR Result:", response.text);
        alert("اكتمل المسح الضوئي! (تم استخراج البيانات بنجاح)");
      }
    }
  };

  if (loading && user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Loading System Data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-500 p-4 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
              <Smartphone size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ترند فون</h1>
            <p className="text-slate-400">تسجيل الدخول لنظام المحاسبة</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">اسم المستخدم</label>
              <input 
                type="text" 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="أدخل اسم المستخدم"
                value={loginData.username}
                onChange={e => setLoginData({...loginData, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">كلمة المرور</label>
              <input 
                type="password" 
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="أدخل كلمة المرور"
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              تسجيل الدخول
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 border-l border-slate-800 flex flex-col p-6 transition-transform duration-300 lg:relative lg:translate-x-0 lg:border-r lg:border-l-0
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <Smartphone size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ترند فون</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {user.role !== 'engineer' && (
            <>
              <SidebarItem icon={LayoutDashboard} label="لوحة التحكم" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={Package} label="المخزون" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={ShoppingCart} label="المبيعات" active={activeTab === 'sales'} onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={ArrowRight} label="المشتريات" active={activeTab === 'purchases'} onClick={() => { setActiveTab('purchases'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={Users} label="العملاء" active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={User} label="الموردين" active={activeTab === 'suppliers'} onClick={() => { setActiveTab('suppliers'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={TrendingUp} label="المالية" active={activeTab === 'financials'} onClick={() => { setActiveTab('financials'); setIsMobileMenuOpen(false); }} />
            </>
          )}
          <SidebarItem icon={Smartphone} label="الصيانة" active={activeTab === 'maintenance'} onClick={() => { setActiveTab('maintenance'); setIsMobileMenuOpen(false); }} />
          {user.role !== 'engineer' && (
            <>
              <SidebarItem icon={FileText} label="التقارير" active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} />
              <SidebarItem icon={Settings} label="الإعدادات" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <User size={20} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{user.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role === 'admin' ? 'مدير' : 'محاسب'}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="h-20 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
            >
              <LayoutDashboard size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-white capitalize">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'inventory' && 'المخزون'}
              {activeTab === 'sales' && 'المبيعات'}
              {activeTab === 'purchases' && 'المشتريات'}
              {activeTab === 'customers' && 'العملاء'}
              {activeTab === 'suppliers' && 'الموردين'}
              {activeTab === 'reports' && 'التقارير'}
              {activeTab === 'settings' && 'الإعدادات'}
              {activeTab === 'maintenance' && 'الصيانة'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="بحث عن أي شيء..." 
                className="bg-slate-900 border border-slate-800 rounded-full pr-10 pl-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-64 transition-all"
              />
            </div>
            <button 
              onClick={startOCR}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all"
            >
              <Camera size={18} />
              <span className="hidden sm:inline">مسح OCR</span>
            </button>
            <button 
              onClick={() => setIsNewSaleOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">فاتورة جديدة</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
                <button 
                  onClick={() => setIsNewSaleOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <ShoppingCart size={24} />
                  </div>
                  <span className="text-sm font-bold text-emerald-500">بيع جديد</span>
                </button>

                <button 
                  onClick={() => setIsNewPurchaseOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl hover:bg-blue-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                    <ArrowRight size={24} />
                  </div>
                  <span className="text-sm font-bold text-blue-500">شراء جديد</span>
                </button>

                <button 
                  onClick={() => setIsAddCustomerOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl hover:bg-purple-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <span className="text-sm font-bold text-purple-500">إضافة عميل</span>
                </button>

                <button 
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl hover:bg-orange-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                    <User size={24} />
                  </div>
                  <span className="text-sm font-bold text-orange-500">إضافة مورد</span>
                </button>

                <button 
                  onClick={() => setIsAddProductOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl hover:bg-cyan-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                    <Package size={24} />
                  </div>
                  <span className="text-sm font-bold text-cyan-500">إضافة منتج</span>
                </button>

                <button 
                  onClick={() => { setActiveTab('financials'); setIsNewLedgerOpen(true); }}
                  className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <TrendingUp size={24} />
                  </div>
                  <span className="text-sm font-bold text-emerald-500">إيراد/مصروف</span>
                </button>

                <button 
                  onClick={() => setIsAddWarehouseOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl hover:bg-amber-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                    <LayoutDashboard size={24} />
                  </div>
                  <span className="text-sm font-bold text-amber-500">إضافة مخزن</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab('maintenance');
                    setIsAddMaintenanceOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <Smartphone size={24} />
                  </div>
                  <span className="text-sm font-bold text-red-500">صيانة جديدة</span>
                </button>

                <button 
                  onClick={() => setIsPaymentOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="text-sm font-bold text-indigo-500">دفعة عميل</span>
                </button>

                <button 
                  onClick={() => setIsSupplierPaymentOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl hover:bg-pink-500/20 transition-all group"
                >
                  <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                    <LogOut size={24} className="rotate-180" />
                  </div>
                  <span className="text-sm font-bold text-pink-500">دفعة مورد</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="إجمالي المبيعات" 
                  value={formatCurrency(stats?.totalSales || 0)} 
                  icon={ShoppingCart} 
                  color="bg-emerald-500" 
                  trend="+12.5%" 
                />
                <StatCard 
                  title="إجمالي المشتريات" 
                  value={formatCurrency(stats?.totalPurchases || 0)} 
                  icon={ArrowRight} 
                  color="bg-blue-500" 
                  trend="+5.2%" 
                />
                <StatCard 
                  title="إجمالي الإيرادات" 
                  value={formatCurrency(stats?.totalRevenue || 0)} 
                  icon={TrendingUp} 
                  color="bg-purple-500" 
                  trend="+8.1%" 
                />
                <StatCard 
                  title="إجمالي المصروفات" 
                  value={formatCurrency(stats?.totalExpenses || 0)} 
                  icon={AlertTriangle} 
                  color="bg-red-500" 
                  trend="+2.4%" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="إجمالي المنتجات" 
                  value={stats?.totalProducts || 0} 
                  icon={Package} 
                  color="bg-blue-500" 
                />
                <StatCard 
                  title="إجمالي الديون" 
                  value={formatCurrency(customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0))} 
                  icon={AlertTriangle} 
                  color="bg-red-500" 
                />
                <StatCard 
                  title="العملاء النشطون" 
                  value={customers.length} 
                  icon={Users} 
                  color="bg-purple-500" 
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-6">نظرة عامة على المبيعات</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'يناير', sales: 4000 },
                        { name: 'فبراير', sales: 3000 },
                        { name: 'مارس', sales: 5000 },
                        { name: 'أبريل', sales: 4500 },
                        { name: 'مايو', sales: 6000 },
                        { name: 'يونيو', sales: 5500 },
                      ]}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-6">المبيعات الأخيرة</h3>
                  <div className="space-y-4">
                    {stats?.recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <ShoppingCart size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-white">{sale.customer_name || 'عميل نقدي'}</p>
                            <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{formatCurrency(sale.total_amount)}</p>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            sale.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {sale.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!stats?.recentSales || stats.recentSales.length === 0) && (
                      <div className="text-center py-10 text-slate-500">لا توجد مبيعات أخيرة</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    <Smartphone size={18} /> الهواتف
                  </button>
                  <button className="bg-slate-800 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-700">
                    <Headphones size={18} /> الإكسسوارات
                  </button>
                </div>
                <button 
                  onClick={() => setIsAddAdjustmentOpen(true)}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-500/20 transition-all"
                >
                  <AlertTriangle size={18} /> تسجيل تالف / مفقود
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">المنتج</th>
                      <th className="px-6 py-4 font-bold">الفئة</th>
                      <th className="px-6 py-4 font-bold">السعر</th>
                      <th className="px-6 py-4 font-bold">المخزون</th>
                      <th className="px-6 py-4 font-bold">الحد الأدنى</th>
                      <th className="px-6 py-4 font-bold">الموقع</th>
                      <th className="px-6 py-4 font-bold text-right">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {products.map((product) => (
                      <tr 
                        key={product.id} 
                        className="hover:bg-slate-800/30 transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsProductDetailsOpen(true);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.brand} {product.model}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-slate-800 px-2 py-1 rounded-md text-slate-300 capitalize">{product.category}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${product.stock_quantity <= product.min_stock_level ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            <span className="font-medium">{product.stock_quantity} قطعة</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{product.min_stock_level} قطعة</td>
                        <td className="px-6 py-4 text-slate-400">{product.location || 'غير محدد'}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToSale(product);
                            }}
                            className="text-emerald-500 hover:text-emerald-400 p-2 flex items-center gap-1 text-xs font-bold"
                          >
                            <Plus size={16} /> إضافة للبيع
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock Adjustments History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-800">
                <h4 className="font-bold flex items-center gap-2 text-white">
                  <AlertTriangle size={18} className="text-orange-500" /> سجل التوالف والتعديلات
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">التاريخ</th>
                      <th className="px-6 py-4 font-bold">المنتج</th>
                      <th className="px-6 py-4 font-bold">النوع</th>
                      <th className="px-6 py-4 font-bold">الكمية</th>
                      <th className="px-6 py-4 font-bold">السبب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {stockAdjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 text-sm">{new Date(adj.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-white">{adj.product_name}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            adj.type === 'damaged' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {adj.type === 'damaged' ? 'تالف' : adj.type === 'lost' ? 'مفقود' : 'تصحيح'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-red-400">-{adj.quantity}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm">{adj.reason}</td>
                      </tr>
                    ))}
                    {stockAdjustments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-slate-500">لا توجد تعديلات مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">فواتير المبيعات</h3>
                <button 
                  onClick={() => setIsNewSaleOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={18} /> بيع جديد
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">التاريخ</th>
                      <th className="px-6 py-4 font-bold">العميل</th>
                      <th className="px-6 py-4 font-bold">رقم الفاتورة</th>
                      <th className="px-6 py-4 font-bold">المنتجات</th>
                      <th className="px-6 py-4 font-bold">الإجمالي</th>
                      <th className="px-6 py-4 font-bold">طريقة الدفع</th>
                      <th className="px-6 py-4 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 text-sm">{new Date(sale.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold">{sale.customer_name || 'عميل نقدي'}</td>
                        <td className="px-6 py-4 text-slate-400">{sale.invoice_number || `INV-${sale.id}`}</td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-400 max-w-[200px] truncate">
                            {sale.items?.map((item: any) => `${item.name} (${item.quantity})`).join(', ') || 'تفاصيل غير متوفرة'}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">{formatCurrency(sale.total_amount)}</td>
                        <td className="px-6 py-4 text-slate-400">{sale.payment_method}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            sale.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {sale.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">لا توجد مبيعات مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">فواتير المشتريات</h3>
                <button 
                  onClick={() => setIsNewPurchaseOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={18} /> شراء جديد
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">التاريخ</th>
                      <th className="px-6 py-4 font-bold">المورد</th>
                      <th className="px-6 py-4 font-bold">رقم الفاتورة</th>
                      <th className="px-6 py-4 font-bold">المنتجات</th>
                      <th className="px-6 py-4 font-bold">الإجمالي</th>
                      <th className="px-6 py-4 font-bold">طريقة الدفع</th>
                      <th className="px-6 py-4 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 text-sm">{new Date(purchase.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold">{purchase.supplier_name}</td>
                        <td className="px-6 py-4 text-slate-400">{purchase.invoice_number || `PUR-${purchase.id}`}</td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-400 max-w-[200px] truncate">
                            {purchase.items?.map(item => `${item.name} (${item.quantity})`).join(', ') || 'تفاصيل غير متوفرة'}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">{formatCurrency(purchase.total_amount)}</td>
                        <td className="px-6 py-4 text-slate-400">{purchase.payment_method || 'نقدي'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            purchase.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {purchase.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">إدارة الموردين</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsSupplierPaymentOpen(true)}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    <ArrowRight size={18} /> تسجيل دفعة
                  </button>
                  <button 
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    <Plus size={18} /> إضافة مورد
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-blue-500 border border-slate-700">
                        <User size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-white">{supplier.name}</h4>
                        <p className="text-sm text-slate-400">{supplier.phone}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">ديوننا للمورد</p>
                      <p className={`text-xl font-bold ${supplier.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {formatCurrency(supplier.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold">إدارة العملاء</h3>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={sendStatementsToAll}
                    className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    <Smartphone size={18} /> مراسلة جميع المديونين
                  </button>
                  <button 
                    onClick={() => setIsPaymentOpen(true)}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    <ArrowRight size={18} /> تسجيل دفعة
                  </button>
                  <button 
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Plus size={18} /> إضافة عميل
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {customers.map((customer) => (
                  <div key={customer.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 border border-slate-700">
                        <User size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-white">{customer.name}</h4>
                        <p className="text-sm text-slate-400">{customer.phone}</p>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">الرصيد الحالي</p>
                      <p className={`text-xl font-bold ${customer.balance > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {formatCurrency(customer.balance)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => {
                          const message = `مرحباً ${customer.name}،\n\nنود تذكيركم بأن رصيدكم الحالي لدى محل ترند فون هو: ${formatCurrency(customer.balance)}.\n\nشكراً لتعاملكم معنا.`;
                          window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="flex-1 md:flex-none bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <Smartphone size={18} /> WhatsApp Reminder
                      </button>
                      <button 
                        onClick={async () => {
                          const res = await fetch(`/api/customers/${customer.id}/statement`);
                          const transactions = await res.json();
                          let statementText = `كشف حساب العميل: ${customer.name}\n\n`;
                          transactions.forEach((t: any) => {
                            statementText += `${new Date(t.created_at).toLocaleDateString()} - ${t.description}: ${t.type === 'sale' ? '+' : '-'}${t.amount}\n`;
                          });
                          statementText += `\nالرصيد النهائي: ${formatCurrency(customer.balance)}`;
                          
                          window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(statementText)}`, '_blank');
                        }}
                        className="flex-1 md:flex-none bg-blue-600/20 hover:bg-blue-600/30 text-blue-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                      >
                        <FileText size={18} /> Send Statement
                      </button>
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                    لم يتم العثور على عملاء. أضف عميلك الأول لبدء تتبع الديون.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">إدارة الصيانة</h3>
                <button 
                  onClick={() => setIsAddMaintenanceOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Plus size={18} /> طلب صيانة جديد
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {maintenanceRecords.map((record) => (
                  <div key={record.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-slate-700 ${
                          record.status === 'completed' ? 'text-emerald-500 bg-emerald-500/10' : 
                          record.status === 'in_progress' ? 'text-blue-500 bg-blue-500/10' : 'text-orange-500 bg-orange-500/10'
                        }`}>
                          <Settings size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-white">{record.customer_name} - {record.device_model}</h4>
                          <p className="text-sm text-slate-400">{record.customer_phone} | IMEI: {record.imei}</p>
                        </div>
                      </div>
                      <div className="flex flex-col md:items-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          record.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 
                          record.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' : 'bg-orange-500/20 text-orange-500'
                        }`}>
                          {record.status === 'received' ? 'تم الاستلام' : 
                           record.status === 'in_progress' ? 'قيد الإصلاح' : 
                           record.status === 'completed' ? 'جاهز' : 'تم التسليم'}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">تاريخ الاستلام: {new Date(record.received_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">نوع الخلل</p>
                        <p className="text-white text-sm">{record.fault_description}</p>
                        <p className="text-xs text-slate-400 mt-1 italic">الأعراض: {record.symptoms}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">نوع الصيانة</p>
                        <p className="text-white text-sm">{
                          record.maintenance_type === 'screen' ? 'تغيير شاشة' : 
                          record.maintenance_type === 'battery' ? 'إصلاح بطارية' : 
                          record.maintenance_type === 'software' ? 'تحديث سوفتوير' : 'أخرى'
                        }</p>
                        <p className="text-xs text-slate-400 mt-1">التكلفة: {formatCurrency(record.cost)}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            const statusText = record.status === 'completed' ? 'جاهز للتسليم' : 
                                             record.status === 'in_progress' ? 'قيد الإصلاح حالياً' : 'تم استلامه وبانتظار الفحص';
                            const message = `مرحباً ${record.customer_name}،\n\nنحيطكم علماً بأن حالة جهازكم (${record.device_model}) IMEI: ${record.imei} هي الآن: ${statusText}.\n\nشكراً لثقتكم بنا.`;
                            window.open(`https://wa.me/${record.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                        >
                          <Smartphone size={18} /> إرسال تحديث الحالة
                        </button>
                        {record.status !== 'delivered' && (
                          <select 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            value={record.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              await fetch(`/api/maintenance/${record.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  status: newStatus,
                                  completed_at: newStatus === 'completed' ? new Date().toISOString() : record.completed_at
                                })
                              });
                              fetchMaintenance();
                            }}
                          >
                            <option value="received">تغيير الحالة...</option>
                            <option value="in_progress">قيد الإصلاح</option>
                            <option value="completed">جاهز</option>
                            <option value="delivered">تم التسليم</option>
                          </select>
                        )}
                      </div>
                    </div>
                    {record.notes && (
                      <div className="bg-slate-800/50 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">ملاحظات الصيانة</p>
                        <p className="text-xs text-slate-300">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
                {maintenanceRecords.length === 0 && (
                  <div className="text-center py-20 text-slate-500 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                    لا توجد طلبات صيانة حالياً.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">التقارير المالية والإحصائيات</h3>
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <FileText size={18} /> طباعة التقارير
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-slate-400 font-bold uppercase text-xs mb-4">ملخص الأرباح والخسائر</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">إجمالي المبيعات</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(stats?.totalSales || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">إجمالي المشتريات</span>
                      <span className="text-red-400 font-bold">-{formatCurrency(stats?.totalPurchases || 0)}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-white font-bold">صافي الربح التقديري</span>
                      <span className={`font-bold text-xl ${(stats?.totalSales || 0) - (stats?.totalPurchases || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency((stats?.totalSales || 0) - (stats?.totalPurchases || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-slate-400 font-bold uppercase text-xs mb-4">ملخص الديون</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">ديون العملاء (لنا)</span>
                      <span className="text-orange-400 font-bold">{formatCurrency(customers.reduce((sum, c) => sum + c.balance, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">ديون الموردين (علينا)</span>
                      <span className="text-red-400 font-bold">{formatCurrency(suppliers.reduce((sum, s) => sum + s.balance, 0))}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-white font-bold">صافي المديونية</span>
                      <span className="text-white font-bold">
                        {formatCurrency(customers.reduce((sum, c) => sum + c.balance, 0) - suppliers.reduce((sum, s) => sum + s.balance, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-slate-400 font-bold uppercase text-xs mb-4">قيمة المخزون</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">القيمة بسعر التكلفة</span>
                      <span className="text-blue-400 font-bold">{formatCurrency(products.reduce((sum, p) => sum + (p.stock_quantity * p.cost), 0))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">القيمة بسعر البيع</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0))}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-white font-bold">الربح المتوقع بالمخزن</span>
                      <span className="text-emerald-500 font-bold">
                        {formatCurrency(products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0) - products.reduce((sum, p) => sum + (p.stock_quantity * p.cost), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-slate-400 font-bold uppercase text-xs mb-4">إحصائيات الصيانة</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">إجمالي طلبات الصيانة</span>
                      <span className="text-white font-bold">{maintenanceRecords.length} طلب</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">إيرادات الصيانة</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(maintenanceRecords.reduce((sum, r) => sum + r.cost, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">طلبات قيد الإصلاح</span>
                      <span className="text-blue-400 font-bold">{maintenanceRecords.filter(r => r.status === 'in_progress').length} طلب</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-orange-500" />
                    تنبيهات المخزون المنخفض
                  </h4>
                  <div className="space-y-3">
                    {products.filter(p => p.stock_quantity <= p.min_stock_level).map(product => (
                      <div key={product.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-orange-500/20">
                        <div>
                          <p className="font-bold text-white text-sm">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.brand} - {product.model}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-500 font-bold">{product.stock_quantity} قطعة</p>
                          <p className="text-[10px] text-slate-500">الحد الأدنى: {product.min_stock_level}</p>
                        </div>
                      </div>
                    ))}
                    {products.filter(p => p.stock_quantity <= p.min_stock_level).length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-sm">لا توجد منتجات منخفضة المخزون حالياً</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    أعلى المنتجات مبيعاً
                  </h4>
                  <div className="space-y-3">
                    {/* Simplified top products logic based on recent sales */}
                    {Array.from(new Set(sales.flatMap(s => s.items || []).map(i => i.product_id)))
                      .map(pid => {
                        const product = products.find(p => p.id === pid);
                        const totalQty = sales.flatMap(s => s.items || [])
                          .filter(i => i.product_id === pid)
                          .reduce((sum, i) => sum + i.quantity, 0);
                        return { product, totalQty };
                      })
                      .sort((a, b) => b.totalQty - a.totalQty)
                      .slice(0, 5)
                      .map(({ product, totalQty }) => (
                        <div key={product?.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                          <div>
                            <p className="font-bold text-white text-sm">{product?.name || 'منتج غير معروف'}</p>
                            <p className="text-xs text-slate-500">{product?.category === 'phone' ? 'هاتف' : 'إكسسوار'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-400 font-bold">{totalQty} مبيعات</p>
                          </div>
                        </div>
                      ))}
                    {sales.length === 0 && (
                      <p className="text-center py-6 text-slate-500 text-sm">لا توجد بيانات مبيعات كافية</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold">الإيرادات والمصروفات (المالية)</h3>
                <button 
                  onClick={() => setIsNewLedgerOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Plus size={18} /> إضافة حركة مالية
                </button>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {formatCurrency(ledger.filter(l => l.type === 'revenue').reduce((sum, l) => sum + l.amount, 0))}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">إجمالي المصروفات</p>
                  <p className="text-2xl font-bold text-red-500">
                    {formatCurrency(ledger.filter(l => l.type === 'expense').reduce((sum, l) => sum + l.amount, 0))}
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">صافي الرصيد المالي</p>
                  <p className={`text-2xl font-bold ${ledger.reduce((sum, l) => sum + (l.type === 'revenue' ? l.amount : -l.amount), 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(ledger.reduce((sum, l) => sum + (l.type === 'revenue' ? l.amount : -l.amount), 0))}
                  </p>
                </div>
              </div>

              {/* Debts Summary (له وعليه) */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Users size={20} className="text-orange-500" /> ملخص الحسابات (له وعليه)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-2">ديون العملاء (لنا طرف الغير)</p>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {customers.filter(c => c.balance > 0).map(customer => (
                        <div key={customer.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                          <div>
                            <p className="font-bold text-white text-sm">{customer.name}</p>
                            <p className="text-[10px] text-slate-500">{customer.phone}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-orange-500 font-bold">{formatCurrency(customer.balance)}</p>
                            <button 
                              onClick={() => {
                                setPaymentData({...paymentData, customer_id: customer.id});
                                setIsPaymentOpen(true);
                              }}
                              className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-all"
                              title="تسجيل دفعة"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {customers.filter(c => c.balance > 0).length === 0 && (
                        <p className="text-slate-500 text-sm italic">لا توجد ديون مستحقة على العملاء</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-2">ديون الموردين (علينا للغير)</p>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {suppliers.filter(s => s.balance > 0).map(supplier => (
                        <div key={supplier.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                          <div>
                            <p className="font-bold text-white text-sm">{supplier.name}</p>
                            <p className="text-[10px] text-slate-500">{supplier.phone}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-red-400 font-bold">{formatCurrency(supplier.balance)}</p>
                            <button 
                              onClick={() => {
                                setSupplierPaymentData({...supplierPaymentData, supplier_id: supplier.id});
                                setIsSupplierPaymentOpen(true);
                              }}
                              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                              title="تسجيل دفعة"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {suppliers.filter(s => s.balance > 0).length === 0 && (
                        <p className="text-slate-500 text-sm italic">لا توجد ديون مستحقة للموردين</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-bold">التاريخ</th>
                        <th className="px-6 py-4 font-bold">النوع</th>
                        <th className="px-6 py-4 font-bold">الفئة</th>
                        <th className="px-6 py-4 font-bold">المبلغ</th>
                        <th className="px-6 py-4 font-bold">الوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {ledger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-all">
                          <td className="px-6 py-4 text-sm">{new Date(entry.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              entry.type === 'revenue' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {entry.type === 'revenue' ? 'إيراد' : 'مصروف'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300">{entry.category}</td>
                          <td className={`px-6 py-4 font-bold ${entry.type === 'revenue' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.type === 'revenue' ? '+' : '-'}{formatCurrency(entry.amount)}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{entry.description}</td>
                        </tr>
                      ))}
                      {ledger.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-500">لا توجد حركات مالية مسجلة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Currency Settings */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="text-emerald-500" size={24} /> إعدادات العملة
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">العملة الافتراضية</label>
                      <div className="flex gap-2">
                        {['USD', 'YER', 'SAR'].map(curr => (
                          <button
                            key={curr}
                            onClick={() => handleUpdateSettings({ ...settings, currency: curr })}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                              settings.currency === curr 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {curr === 'USD' ? 'دولار ($)' : curr === 'YER' ? 'ريال يمني' : 'ريال سعودي'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">سعر صرف الدولار (يمني)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          value={settings.rate_yer}
                          onChange={e => handleUpdateSettings({ ...settings, rate_yer: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">سعر صرف الدولار (سعودي)</label>
                        <input 
                          type="number" 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          value={settings.rate_sar}
                          onChange={e => handleUpdateSettings({ ...settings, rate_sar: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Management (Admin Only) */}
                {user.role === 'admin' && (
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Users className="text-blue-500" size={24} /> إنشاء حساب جديد
                    </h3>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">اسم المستخدم</label>
                          <input 
                            required
                            type="text" 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">كلمة المرور</label>
                          <input 
                            required
                            type="password" 
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">الصلاحية</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                          value={newUser.role}
                          onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                        >
                          <option value="admin">مدير (صلاحيات كاملة)</option>
                          <option value="accountant">محاسب (مبيعات ومخزون)</option>
                          <option value="engineer">مهندس (صيانة فقط)</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all">
                        إنشاء الحساب
                      </button>
                    </form>
                  </div>
                )}

                {/* Backup & Restore (Admin Only) */}
                {user.role === 'admin' && (
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <DatabaseIcon className="text-purple-500" size={24} /> النسخ الاحتياطي والاستعادة
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
                        <div className="flex items-center gap-2 text-white font-bold">
                          <Download size={18} className="text-emerald-500" />
                          نسخة احتياطية محلية
                        </div>
                        <p className="text-xs text-slate-400">تصدير كافة بيانات النظام إلى ملف محلي يمكنك حفظه.</p>
                        <button 
                          onClick={handleLocalBackup}
                          className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold py-2 rounded-xl transition-all text-sm"
                        >
                          تصدير البيانات
                        </button>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
                        <div className="flex items-center gap-2 text-white font-bold">
                          <Cloud size={18} className="text-blue-500" />
                          نسخة احتياطية (Google Drive)
                        </div>
                        <p className="text-xs text-slate-400">حفظ نسخة من بياناتك بأمان على حسابك في جوجل درايف.</p>
                        <button 
                          onClick={handleGoogleDriveBackup}
                          className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold py-2 rounded-xl transition-all text-sm"
                        >
                          نسخ إلى Google Drive
                        </button>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                      <label className="block text-sm font-medium text-slate-400 mb-2">استعادة من ملف محلي</label>
                      <div className="flex gap-2">
                        <input 
                          type="file" 
                          id="restore-file" 
                          className="hidden" 
                          accept=".json"
                          onChange={handleLocalRestore}
                        />
                        <label 
                          htmlFor="restore-file"
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl cursor-pointer transition-all text-sm"
                        >
                          <Upload size={18} />
                          اختيار ملف الاستعادة
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile App & Store Info */}
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Smartphone className="text-emerald-500" size={24} /> تطبيق الجوال والمتجر
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                      <h4 className="font-bold text-emerald-500 mb-2">تثبيت التطبيق على الجوال</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        يمكنك تثبيت هذا النظام كتطبيق على هاتفك مباشرة دون الحاجة للمتجر:
                        <br />
                        1. افتح الرابط في متصفح (Chrome للاندرويد أو Safari للايفون).
                        <br />
                        2. اضغط على خيارات المتصفح (ثلاث نقاط أو زر المشاركة).
                        <br />
                        3. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).
                      </p>
                    </div>
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                      <h4 className="font-bold text-blue-500 mb-2">الرفع إلى المتاجر (Play Store / App Store)</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        لرفع التطبيق رسمياً للمتاجر، يتطلب الأمر استخدام إطار عمل مثل <b>Capacitor</b> أو <b>Cordova</b> لتحويل موقع الويب إلى تطبيق أصلي.
                        <br />
                        - يتطلب حساب مطور جوجل (25$) وحساب مطور أبل (99$ سنوياً).
                        <br />
                        - يمكننا مساعدتك في تجهيز الملفات المطلوبة لذلك.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* New Purchase Modal */}
      <AnimatePresence>
        {isNewPurchaseOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">فاتورة مشتريات جديدة (توريد مخزني)</h2>
                <button onClick={() => setIsNewPurchaseOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">اختر المورد</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newPurchase.supplier_id}
                        onChange={e => setNewPurchase({...newPurchase, supplier_id: Number(e.target.value)})}
                      >
                        <option value="0">اختر المورد...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">رقم الفاتورة</label>
                      <input 
                        type="text"
                        placeholder="مثال: INV-123"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newPurchase.invoice_number}
                        onChange={e => setNewPurchase({...newPurchase, invoice_number: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">طريقة الدفع</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newPurchase.payment_method}
                        onChange={e => setNewPurchase({...newPurchase, payment_method: e.target.value})}
                      >
                        <option value="Cash">نقدي (Cash)</option>
                        <option value="Bank Transfer">تحويل بنكي</option>
                        <option value="Credit">آجل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">حالة الدفع</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newPurchase.payment_status}
                        onChange={e => setNewPurchase({...newPurchase, payment_status: e.target.value as any})}
                      >
                        <option value="paid">مدفوع</option>
                        <option value="unpaid">غير مدفوع (دين)</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="بحث عن منتجات لإعادة التموين..." 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredProducts.slice(0, 8).map(product => (
                      <button 
                        key={product.id}
                        onClick={() => addToPurchase(product)}
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500 transition-all text-left group"
                      >
                        <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{product.name}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-slate-400">التكلفة: {formatCurrency(product.cost)}</span>
                          <span className="text-xs text-slate-500">{product.stock_quantity} في المخزن</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 flex flex-col">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Package size={18} className="text-emerald-500" />
                    أصناف المشتريات
                  </h3>
                  
                  <div className="flex-1 space-y-4 mb-6 overflow-y-auto max-h-64">
                    {newPurchase.items.map((item, idx) => (
                      <div key={idx} className="space-y-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-white text-sm">{item.name}</p>
                          <button 
                            onClick={() => setNewPurchase({...newPurchase, items: newPurchase.items.filter((_, i) => i !== idx)})}
                            className="text-red-500 hover:text-red-400 text-[10px] uppercase font-bold"
                          >
                            حذف
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase">الكمية</label>
                            <input 
                              type="number" 
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                              value={item.quantity}
                              onChange={e => {
                                const qty = Number(e.target.value);
                                setNewPurchase({
                                  ...newPurchase,
                                  items: newPurchase.items.map((it, i) => i === idx ? { ...it, quantity: qty, subtotal: qty * it.unit_cost } : it)
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase">التكلفة</label>
                            <input 
                              type="number" 
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                              value={item.unit_cost}
                              onChange={e => {
                                const cost = Number(e.target.value);
                                setNewPurchase({
                                  ...newPurchase,
                                  items: newPurchase.items.map((it, i) => i === idx ? { ...it, unit_cost: cost, subtotal: it.quantity * cost } : it)
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-white">إجمالي التكلفة</span>
                      <span className="text-emerald-400">{formatCurrency(newPurchase.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                    </div>
                  </div>

                  <button 
                    onClick={submitPurchase}
                    disabled={newPurchase.items.length === 0}
                    className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    تسجيل المشتريات
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isNewSaleOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">فاتورة مبيعات جديدة</h2>
                <button onClick={() => setIsNewSaleOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Product Selection */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">اختر العميل</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newSale.customer_id}
                        onChange={e => setNewSale({...newSale, customer_id: Number(e.target.value)})}
                      >
                        <option value="0">عميل نقدي (Walk-in)</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">رقم الفاتورة</label>
                        <input 
                          type="text"
                          placeholder="مثال: INV-123"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          value={newSale.invoice_number}
                          onChange={e => setNewSale({...newSale, invoice_number: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">طريقة الدفع</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          value={newSale.payment_method}
                          onChange={e => setNewSale({...newSale, payment_method: e.target.value})}
                        >
                          <option value="Cash">نقدي (Cash)</option>
                          <option value="Bank Transfer">تحويل بنكي</option>
                          <option value="Credit">آجل</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="بحث عن منتجات لإضافتها..." 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredProducts.slice(0, 8).map(product => (
                      <button 
                        key={product.id}
                        onClick={() => addToSale(product)}
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500 transition-all text-left group"
                      >
                        <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{product.name}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-slate-400">{formatCurrency(product.price)}</span>
                          <span className="text-xs text-slate-500">{product.stock_quantity} في المخزن</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Cart Summary */}
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 flex flex-col">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <ShoppingCart size={18} className="text-emerald-500" />
                    أصناف الفاتورة
                  </h3>
                  
                  <div className="flex-1 space-y-4 mb-6 overflow-y-auto max-h-64">
                    {newSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.quantity} x {formatCurrency(item.unit_price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{formatCurrency(item.subtotal)}</p>
                          <button 
                            onClick={() => setNewSale({...newSale, items: newSale.items.filter((_, i) => i !== idx)})}
                            className="text-red-500 hover:text-red-400 text-[10px] uppercase font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    ))}
                    {newSale.items.length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-sm italic">
                        السلة فارغة
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">الإجمالي الفرعي</span>
                      <span className="text-white font-bold">{formatCurrency(newSale.items.reduce((s, i) => s + i.subtotal, 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">الخصم</span>
                      <input 
                        type="number" 
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right text-white text-xs"
                        value={newSale.discount}
                        onChange={e => setNewSale({...newSale, discount: Number(e.target.value)})}
                      />
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700">
                      <span className="text-white">الإجمالي النهائي</span>
                      <span className="text-emerald-400">{formatCurrency(newSale.items.reduce((s, i) => s + i.subtotal, 0) - newSale.discount)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={submitSale}
                    disabled={newSale.items.length === 0}
                    className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    إتمام الفاتورة
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Adjustment Modal (Damaged Goods, etc.) */}
      <AnimatePresence>
        {isAddAdjustmentOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">تسجيل بضاعة تالفة / تعديل مخزون</h2>
                <button onClick={() => setIsAddAdjustmentOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddAdjustment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">المنتج</label>
                  <select 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newAdjustment.product_id}
                    onChange={e => setNewAdjustment({...newAdjustment, product_id: Number(e.target.value)})}
                  >
                    <option value="0">اختر المنتج...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.brand} {p.model}) - الحالي: {p.stock_quantity}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">نوع التعديل</label>
                  <select 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newAdjustment.type}
                    onChange={e => setNewAdjustment({...newAdjustment, type: e.target.value as any})}
                  >
                    <option value="damaged">بضاعة تالفة</option>
                    <option value="lost">بضاعة مفقودة</option>
                    <option value="correction">تصحيح جرد</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الكمية المستبعدة</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newAdjustment.quantity}
                    onChange={e => setNewAdjustment({...newAdjustment, quantity: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">السبب / ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                    value={newAdjustment.reason}
                    onChange={e => setNewAdjustment({...newAdjustment, reason: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all"
                >
                  تأكيد التعديل
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Ledger Entry Modal */}
      <AnimatePresence>
        {isNewLedgerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">إضافة حركة مالية جديدة</h2>
                <button onClick={() => setIsNewLedgerOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleNewLedger} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">نوع الحركة</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewLedger({...newLedger, type: 'revenue'})}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                        newLedger.type === 'revenue' 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      إيراد
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLedger({...newLedger, type: 'expense'})}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                        newLedger.type === 'expense' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      مصروف
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الفئة</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newLedger.type === 'expense' ? (
                      ['رواتب', 'إيجار', 'نثريات', 'كهرباء', 'إنترنت'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewLedger({...newLedger, category: cat})}
                          className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-700"
                        >
                          {cat}
                        </button>
                      ))
                    ) : (
                      ['مبيعات خارجية', 'خدمات صيانة', 'أخرى'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewLedger({...newLedger, category: cat})}
                          className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-700"
                        >
                          {cat}
                        </button>
                      ))
                    )}
                  </div>
                  <input 
                    required
                    type="text" 
                    placeholder="أو اكتب الفئة هنا..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newLedger.category}
                    onChange={e => setNewLedger({...newLedger, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">المبلغ</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newLedger.amount}
                    onChange={e => setNewLedger({...newLedger, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الوصف</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                    value={newLedger.description}
                    onChange={e => setNewLedger({...newLedger, description: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  حفظ الحركة
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Supplier Payment Modal */}
      <AnimatePresence>
        {isSupplierPaymentOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">تسجيل دفعة للمورد</h2>
                <button onClick={() => setIsSupplierPaymentOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleRecordSupplierPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">اختر المورد</label>
                  <select 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={supplierPaymentData.supplier_id}
                    onChange={e => setSupplierPaymentData({...supplierPaymentData, supplier_id: Number(e.target.value)})}
                  >
                    <option value="0">اختر مورداً...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (ديننا: {formatCurrency(s.balance)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">مبلغ الدفعة</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={supplierPaymentData.amount}
                    onChange={e => setSupplierPaymentData({...supplierPaymentData, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الوصف</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={supplierPaymentData.description}
                    onChange={e => setSupplierPaymentData({...supplierPaymentData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                    value={(supplierPaymentData as any).notes || ''}
                    onChange={e => setSupplierPaymentData({...supplierPaymentData, notes: e.target.value} as any)}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all">
                  تسجيل الدفعة
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isAddSupplierOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">إضافة مورد جديد</h2>
                <button onClick={() => setIsAddSupplierOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">اسم المورد</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSupplier.name}
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الشخص المسؤول</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSupplier.contact_person}
                    onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">رقم الهاتف</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                    value={newSupplier.notes}
                    onChange={e => setNewSupplier({...newSupplier, notes: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-all">
                  حفظ المورد
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isAddCustomerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">إضافة عميل جديد</h2>
                <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الاسم الكامل</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">رقم الهاتف</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">العنوان</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.address}
                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الرصيد الافتتاحي</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.opening_balance}
                    onChange={e => setNewCustomer({...newCustomer, opening_balance: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                    value={newCustomer.notes}
                    onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-all">
                  حفظ العميل
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Maintenance Modal */}
      <AnimatePresence>
        {isAddMaintenanceOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">إضافة طلب صيانة جديد</h2>
                <button onClick={() => setIsAddMaintenanceOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Customer & Device Info */}
                <section className="space-y-4">
                  <h3 className="text-emerald-500 font-bold flex items-center gap-2">
                    <User size={18} /> تفاصيل الاستلام والعميل
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">اسم العميل</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newMaintenance.customer_name}
                        onChange={e => setNewMaintenance({...newMaintenance, customer_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">رقم الهاتف</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newMaintenance.customer_phone}
                        onChange={e => setNewMaintenance({...newMaintenance, customer_phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">موديل الجهاز</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newMaintenance.device_model}
                        onChange={e => setNewMaintenance({...newMaintenance, device_model: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">الرقم التسلسلي (IMEI)</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newMaintenance.imei}
                        onChange={e => setNewMaintenance({...newMaintenance, imei: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">حالة الجهاز عند الاستلام</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        value={newMaintenance.device_condition}
                        onChange={e => setNewMaintenance({...newMaintenance, device_condition: e.target.value})}
                      >
                        <option value="">اختر الحالة...</option>
                        <option value="عادي">عادي</option>
                        <option value="تالف">تالف</option>
                        <option value="مخدوش">مخدوش</option>
                        <option value="كسر في الشاشة">كسر في الشاشة</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Fault & Symptoms */}
                <section className="space-y-4">
                  <h3 className="text-orange-500 font-bold flex items-center gap-2">
                    <AlertTriangle size={18} /> نوع الخلل والأعراض
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">وصف المشكلة أو العطل</label>
                      <textarea 
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-orange-500"
                        value={newMaintenance.fault_description}
                        onChange={e => setNewMaintenance({...newMaintenance, fault_description: e.target.value})}
                        placeholder="مثال: شاشة مكسورة، لا يشحن..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">الأعراض المرافقة</label>
                      <textarea 
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-orange-500"
                        value={newMaintenance.symptoms}
                        onChange={e => setNewMaintenance({...newMaintenance, symptoms: e.target.value})}
                        placeholder="مثال: صوت طقة، شاشة سوداء..."
                      />
                    </div>
                  </div>
                </section>

                {/* Maintenance Details */}
                <section className="space-y-4">
                  <h3 className="text-blue-500 font-bold flex items-center gap-2">
                    <Settings size={18} /> تفاصيل الصيانة والتكلفة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">نوع الصيانة</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={newMaintenance.maintenance_type}
                        onChange={e => setNewMaintenance({...newMaintenance, maintenance_type: e.target.value})}
                      >
                        <option value="screen">تغيير شاشة</option>
                        <option value="battery">إصلاح بطارية</option>
                        <option value="software">تحديث سوفتوير</option>
                        <option value="hardware">إصلاح هاردوير</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">تكلفة الصيانة</label>
                      <input 
                        type="number" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={newMaintenance.cost}
                        onChange={e => setNewMaintenance({...newMaintenance, cost: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">تاريخ الصيانة القادمة (اختياري)</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        value={newMaintenance.next_maintenance_date}
                        onChange={e => setNewMaintenance({...newMaintenance, next_maintenance_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات (القطع المستبدلة، إلخ)</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                      value={newMaintenance.notes}
                      onChange={e => setNewMaintenance({...newMaintenance, notes: e.target.value})}
                    />
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddMaintenanceOpen(false)}
                  className="px-6 py-2 rounded-xl text-slate-400 hover:text-white font-bold transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleAddMaintenance}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                >
                  حفظ طلب الصيانة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddProductOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">إضافة منتج جديد</h2>
                <button onClick={() => setIsAddProductOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">اسم المنتج</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الفئة</label>
                    <select 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
                    >
                      <option value="phone">هاتف</option>
                      <option value="accessory">إكسسوار</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الماركة</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.brand}
                      onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الموديل</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.model}
                      onChange={e => setNewProduct({...newProduct, model: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">سعر البيع</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">سعر الشراء (التكلفة)</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.cost}
                      onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الكمية الحالية</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.stock_quantity}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setNewProduct({...newProduct, stock_quantity: val, opening_stock: val});
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">مخزن أول المدة (تلقائي)</label>
                    <input 
                      disabled
                      type="number" 
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-slate-500 outline-none"
                      value={newProduct.opening_stock}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الوحدة</label>
                    <input 
                      type="text" 
                      placeholder="مثال: قطعة، كرتون"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.unit}
                      onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الحد الأدنى للمخزون</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.min_stock_level}
                      onChange={e => setNewProduct({...newProduct, min_stock_level: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">الموقع / المخزن</label>
                    <select 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newProduct.warehouse_id}
                      onChange={e => {
                        const wId = Number(e.target.value);
                        const w = warehouses.find(wh => wh.id === wId);
                        setNewProduct({...newProduct, warehouse_id: wId, location: w?.name || ''});
                      }}
                    >
                      <option value="0">اختر المخزن...</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                    value={newProduct.notes}
                    onChange={e => setNewProduct({...newProduct, notes: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3 rounded-xl transition-all">
                  حفظ المنتج
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {isProductDetailsOpen && selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                <h2 className="text-xl font-bold text-white">تفاصيل المنتج: {selectedProduct.name}</h2>
                <button onClick={() => setIsProductDetailsOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">الاسم</p>
                    <p className="text-white font-medium">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">الفئة</p>
                    <p className="text-white font-medium">{selectedProduct.category === 'phone' ? 'هاتف' : 'إكسسوار'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">الماركة</p>
                    <p className="text-white font-medium">{selectedProduct.brand}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">الموديل</p>
                    <p className="text-white font-medium">{selectedProduct.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">SKU / باركود</p>
                    <p className="text-white font-medium font-mono">{selectedProduct.sku}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">سعر البيع</p>
                    <p className="text-emerald-400 font-bold text-xl">{formatCurrency(selectedProduct.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">سعر الشراء (التكلفة)</p>
                    <p className="text-blue-400 font-bold text-xl">{formatCurrency(selectedProduct.cost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">الكمية المتاحة</p>
                    <p className={`font-bold text-xl ${selectedProduct.stock_quantity <= selectedProduct.min_stock_level ? 'text-orange-500' : 'text-white'}`}>
                      {selectedProduct.stock_quantity} {selectedProduct.unit || 'قطعة'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">مخزن أول المدة</p>
                    <p className="text-white font-medium">{selectedProduct.opening_stock} {selectedProduct.unit || 'قطعة'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">الحد الأدنى للمخزون</p>
                    <p className="text-white font-medium">{selectedProduct.min_stock_level} {selectedProduct.unit || 'قطعة'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">موقع المنتج / المخزن</p>
                    <p className="text-white font-medium">{selectedProduct.location || 'غير محدد'}</p>
                  </div>
                </div>
                {selectedProduct.notes && (
                  <div className="md:col-span-2 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">ملاحظات</p>
                    <p className="text-slate-300 text-sm italic">{selectedProduct.notes}</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={() => setIsProductDetailsOpen(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Warehouse Modal */}
      <AnimatePresence>
        {isAddWarehouseOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">إضافة مخزن جديد</h2>
                <button onClick={() => setIsAddWarehouseOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddWarehouse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">اسم المخزن</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newWarehouse.name}
                    onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الموقع</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newWarehouse.location}
                    onChange={e => setNewWarehouse({...newWarehouse, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                    value={newWarehouse.notes}
                    onChange={e => setNewWarehouse({...newWarehouse, notes: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl transition-all">
                  حفظ المخزن
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {isPaymentOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">تسجيل دفعة</h2>
                <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">اختر العميل</label>
                  <select 
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={paymentData.customer_id}
                    onChange={e => setPaymentData({...paymentData, customer_id: Number(e.target.value)})}
                  >
                    <option value="0">اختر عميلاً...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (الرصيد: {formatCurrency(c.balance)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">مبلغ الدفعة</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={paymentData.amount}
                    onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">الوصف</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    value={paymentData.description}
                    onChange={e => setPaymentData({...paymentData, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">ملاحظات</label>
                  <textarea 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                    value={paymentData.notes}
                    onChange={e => setPaymentData({...paymentData, notes: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all">
                  تسجيل الدفعة
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCR Modal */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-emerald-500/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500"></div>
                </div>
              </div>
              
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                <button 
                  onClick={() => {
                    const stream = videoRef.current?.srcObject as MediaStream;
                    stream?.getTracks().forEach(track => track.stop());
                    setIsScanning(false);
                  }}
                  className="bg-red-500 text-white p-4 rounded-full shadow-lg"
                >
                  <X size={24} />
                </button>
                <button 
                  onClick={captureAndProcess}
                  className="bg-emerald-500 text-white p-6 rounded-full shadow-lg shadow-emerald-500/40 active:scale-90 transition-all"
                >
                  <Camera size={32} />
                </button>
              </div>
            </div>
            <p className="mt-6 text-white font-medium">قم بمحاذاة الفاتورة داخل الإطار</p>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

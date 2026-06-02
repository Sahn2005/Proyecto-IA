import React, { useState, useEffect, useRef } from 'react';
import { 
  mockDatasetInfo, 
  mockModelResults, 
  mockRecords 
} from './mockData';
import { 
  BookOpen, 
  TrendingUp, 
  Database, 
  Cpu, 
  Terminal, 
  LineChart, 
  Play, 
  Copy, 
  Check, 
  Layers, 
  Settings, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  HelpCircle,
  Code
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('backend_api_url');
    if (saved) return saved;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};
const API_BASE = getApiBase();

export default function App() {
  // Navigation State
  const [activeSection, setActiveSection] = useState('introduccion');
  const [showDocModal, setShowDocModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(getApiBase());
  
  // System State (Online / Offline Fallback)
  const [apiState, setApiState] = useState({
    isOnline: false,
    checking: true,
    error: null
  });

  // Dataset State
  const [datasetInfo, setDatasetInfo] = useState(mockDatasetInfo);
  const [records, setRecords] = useState(mockRecords.slice(0, 10));
  const [tableState, setTableState] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'order_value_eur',
    sortOrder: 'desc',
    totalRecords: mockRecords.length,
    totalPages: Math.ceil(mockRecords.length / 10)
  });

  // Training & Model State
  const [modelResults, setModelResults] = useState(mockModelResults);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [hasTrained, setHasTrained] = useState(false);

  // Prediction State
  const [predictionInput, setPredictionInput] = useState({
    quantity: 3,
    discount_rate: 0.15,
    avg_order_value_eur: 50.0,
    previous_orders: 5,
    customer_age_days: 365,
    shipping_distance_km: 150.0
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Copy State for code editor
  const [copiedCode, setCopiedCode] = useState(false);

  // References for scrolling
  const sectionRefs = {
    introduccion: useRef(null),
    contexto: useRef(null),
    variables: useRef(null),
    dataset: useRef(null),
    preprocesamiento: useRef(null),
    implementacion: useRef(null),
    terminal: useRef(null),
    visualizaciones: useRef(null),
    prediccion: useRef(null),
    conclusiones: useRef(null)
  };

  // Check API Connection on mount
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    setApiState(prev => ({ ...prev, checking: true }));
    try {
      const response = await fetch(`${API_BASE}/dataset?page=1&limit=5`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApiState({ isOnline: true, checking: false, error: null });
          // Load metadata from API
          setDatasetInfo(data);
          setRecords(data.records);
          setTableState(prev => ({
            ...prev,
            totalRecords: data.pagination.total_records,
            totalPages: data.pagination.total_pages
          }));
          return;
        }
      }
      throw new Error("API returned success: false");
    } catch (err) {
      console.log("Unable to connect to local Flask server, switching to offline fallback mode.");
      setApiState({ isOnline: false, checking: false, error: err.message });
      // Offline fallback: Use precomputed mock stats
      setDatasetInfo(mockDatasetInfo);
      setRecords(mockRecords.slice(0, 10));
      setTableState(prev => ({
        ...prev,
        totalRecords: mockRecords.length,
        totalPages: Math.ceil(mockRecords.length / 10)
      }));
    }
  };

  // Handle Dataset Search & Pagination
  const fetchDatasetPage = async (page = 1, search = '', sortBy = '', sortOrder = 'asc') => {
    if (apiState.isOnline) {
      try {
        const url = `${API_BASE}/dataset?page=${page}&limit=${tableState.limit}&search=${encodeURIComponent(search)}&sort_by=${sortBy}&sort_order=${sortOrder}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setRecords(data.records);
          setTableState(prev => ({
            ...prev,
            page,
            search,
            sortBy,
            sortOrder,
            totalRecords: data.pagination.total_records,
            totalPages: data.pagination.total_pages
          }));
        }
      } catch (err) {
        console.error("Error fetching paginated data:", err);
      }
    } else {
      // Offline implementation of filtering, sorting, and pagination
      let filtered = [...mockRecords];
      
      // Search
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r => 
          (r.order_id && r.order_id.toLowerCase().includes(q)) ||
          (r.country && r.country.toLowerCase().includes(q)) ||
          (r.product_category && r.product_category.toLowerCase().includes(q)) ||
          (r.payment_method && r.payment_method.toLowerCase().includes(q))
        );
      }

      // Sort
      if (sortBy) {
        filtered.sort((a, b) => {
          let valA = a[sortBy];
          let valB = b[sortBy];
          
          if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
          }
          
          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      const paginated = filtered.slice((page - 1) * tableState.limit, page * tableState.limit);
      setRecords(paginated);
      setTableState(prev => ({
        ...prev,
        page,
        search,
        sortBy,
        sortOrder,
        totalRecords: filtered.length,
        totalPages: Math.ceil(filtered.length / tableState.limit)
      }));
    }
  };

  // Run training simulation on the visual terminal
  const runTraining = async () => {
    if (isTraining) return;
    setIsTraining(true);
    setHasTrained(false);
    setTerminalLogs([]);

    const steps = [
      { msg: 'Cargando dataset...', delay: 600 },
      { msg: 'Dataset cargado correctamente. Registros detectados: ' + (apiState.isOnline ? datasetInfo.shape[0] : 12000), delay: 500 },
      { msg: 'Analizando registros...', delay: 700 },
      { msg: 'Buscando valores nulos...', delay: 500 },
      { msg: 'Valores nulos encontrados: 0.', delay: 400 },
      { msg: 'Buscando valores duplicados...', delay: 500 },
      { msg: 'Duplicados eliminados: 0.', delay: 400 },
      { msg: 'Proceso completado.', delay: 500 },
      { msg: 'Dividiendo datos en entrenamiento (80%) y prueba (20%)...', delay: 700 },
      { msg: 'Entrenando modelo (Ordinary Least Squares Linear Regression)...', delay: 900 },
      { msg: 'Modelo entrenado correctamente.', delay: 500 },
      { msg: 'Calculando métricas de evaluación...', delay: 800 }
    ];

    // Print logs step by step
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      setTerminalLogs(prev => [...prev, { text: step.msg, type: 'info' }]);
    }

    // Call API or mock training results
    let results = mockModelResults;
    if (apiState.isOnline) {
      try {
        const response = await fetch(`${API_BASE}/train`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          results = data;
          setModelResults(data);
        }
      } catch (err) {
        console.error("API training failed, using static values:", err);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 400));
    setTerminalLogs(prev => [
      ...prev,
      { text: `\nMétricas del Modelo:`, type: 'header' },
      { text: `MAE: ${results.metrics.mae.toFixed(4)}`, type: 'metric' },
      { text: `MSE: ${results.metrics.mse.toFixed(4)}`, type: 'metric' },
      { text: `R²:  ${results.metrics.r2.toFixed(4)}`, type: 'metric' },
      { text: `\nPredicción final completada. Modelo guardado en 'model.joblib'.`, type: 'success' }
    ]);
    
    setHasTrained(true);
    setIsTraining(false);
  };

  // Perform Prediction
  const runPrediction = async () => {
    setIsPredicting(true);
    const dataToSend = {
      quantity: Number(predictionInput.quantity),
      discount_rate: Number(predictionInput.discount_rate),
      avg_order_value_eur: Number(predictionInput.avg_order_value_eur),
      previous_orders: Number(predictionInput.previous_orders),
      customer_age_days: Number(predictionInput.customer_age_days),
      shipping_distance_km: Number(predictionInput.shipping_distance_km)
    };

    if (apiState.isOnline) {
      try {
        const response = await fetch(`${API_BASE}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });
        const data = await response.json();
        if (data.success) {
          setPredictionResult(data.prediction);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error("API prediction error:", err);
        calculateLocalPrediction(dataToSend);
      }
    } else {
      calculateLocalPrediction(dataToSend);
    }
    
    setTimeout(() => {
      setIsPredicting(false);
    }, 400);
  };

  const calculateLocalPrediction = (inputs) => {
    // Prediction formula using mock coefficients:
    // prediction = intercept + sum(coef * val)
    const coef = modelResults.coefficients;
    const intercept = modelResults.intercept;
    
    let pred = intercept + 
      (coef.quantity * inputs.quantity) + 
      (coef.discount_rate * inputs.discount_rate) + 
      (coef.avg_order_value_eur * inputs.avg_order_value_eur) + 
      (coef.previous_orders * inputs.previous_orders) + 
      (coef.customer_age_days * inputs.customer_age_days) + 
      (coef.shipping_distance_km * inputs.shipping_distance_km);
      
    // Clamp to 0
    pred = Math.max(0.0, pred);
    setPredictionResult(Math.round(pred * 100) / 100);
  };

  // Download Dataset
  const handleDownloadDataset = () => {
    if (apiState.isOnline) {
      window.open(`${API_BASE}/download`);
    } else {
      // Fallback CSV download Client-side
      const headers = Object.keys(mockRecords[0]).join(',');
      const rows = mockRecords.map(rec => 
        Object.values(rec).map(val => typeof val === 'string' ? `"${val}"` : val).join(',')
      );
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "synthetic_ecommerce_order_risk_dataset.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonCodeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Smooth Scroll Navigation
  const scrollToSection = (id) => {
    setActiveSection(id);
    sectionRefs[id].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Chart configs
  // 1. Histogram of target variable (order_value_eur)
  const histData = modelResults.visualizations.histogram;
  const histogramChartData = {
    labels: histData.bins.slice(0, -1).map((b, i) => `€${Math.round(b)}-${Math.round(histData.bins[i+1])}`),
    datasets: [{
      label: 'Frecuencia de Órdenes',
      data: histData.counts,
      backgroundColor: 'rgba(99, 102, 241, 0.4)',
      borderColor: 'rgba(99, 102, 241, 0.85)',
      borderWidth: 1.5,
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    }]
  };

  // 2. Real vs Predicted Scatter
  const scatterPoints = modelResults.visualizations.real_vs_pred.map(pt => ({
    x: pt.Real,
    y: pt.Pred
  }));
  const maxVal = Math.max(...scatterPoints.map(p => Math.max(p.x, p.y))) * 1.05;
  const scatterChartData = {
    datasets: [
      {
        label: 'Predicciones del Modelo',
        data: scatterPoints,
        backgroundColor: 'rgba(34, 211, 238, 0.65)',
        borderColor: 'rgba(34, 211, 238, 0.95)',
        pointRadius: 4.5,
        pointHoverRadius: 6,
      },
      {
        label: 'Ajuste Perfecto (Ideal)',
        data: [{ x: 0, y: 0 }, { x: maxVal, y: maxVal }],
        type: 'line',
        borderColor: 'rgba(239, 68, 68, 0.65)',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  // 3. Variable Importance (coefficients)
  const importanceEntries = Object.entries(modelResults.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const importanceChartData = {
    labels: importanceEntries.map(e => {
      const names = {
        quantity: 'Cantidad (quantity)',
        discount_rate: 'Descuento (discount_rate)',
        avg_order_value_eur: 'Promedio Histórico (avg_order_value_eur)',
        previous_orders: 'Pedidos Previos (previous_orders)',
        customer_age_days: 'Antigüedad Cliente (customer_age_days)',
        shipping_distance_km: 'Distancia Envío (shipping_distance_km)'
      };
      return names[e[0]] || e[0];
    }),
    datasets: [{
      label: 'Coeficiente del Modelo (Impacto)',
      data: importanceEntries.map(e => e[1]),
      backgroundColor: importanceEntries.map(e => e[1] >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'),
      borderColor: importanceEntries.map(e => e[1] >= 0 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'),
      borderWidth: 1.5,
    }]
  };

  // Correlation heatmap rendering helper (returns inline styles based on value)
  const getCorrelationColor = (val) => {
    const absVal = Math.abs(val);
    if (val > 0) {
      return `rgba(99, 102, 241, ${absVal})`; // Indigo for positive correlation
    } else {
      return `rgba(239, 68, 68, ${absVal})`; // Red for negative correlation
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white font-sans overflow-x-hidden">
      
      {/* Background Pulse Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none bg-pulse-glow" />
      <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-cyan-900/10 blur-[150px] pointer-events-none bg-pulse-glow" />

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-80 border-r border-slate-800 bg-slate-950/85 backdrop-blur-md fixed top-0 left-0 h-screen flex flex-col justify-between hidden lg:flex z-40">
        <div>
          {/* Logo Brand */}
          <div className="p-6 border-b border-slate-900">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-indigo-500 to-cyan-400 p-2 rounded-xl text-slate-950 font-bold shadow-lg shadow-indigo-500/15">
                <Cpu className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 leading-tight">Regresión Lineal</h1>
                <span className="text-xs text-indigo-400/90 font-medium tracking-wide">LABORATORIO ACADÉMICO</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[70vh] custom-scroll scrollbar-thin">
            {[
              { id: 'introduccion', label: '1. Introducción', icon: BookOpen },
              { id: 'contexto', label: '2. Contexto del Problema', icon: TrendingUp },
              { id: 'variables', label: '3. Variables del Modelo', icon: Layers },
              { id: 'dataset', label: '4. Dataset del Proyecto', icon: Database },
              { id: 'preprocesamiento', label: '5. Preprocesamiento', icon: Settings },
              { id: 'implementacion', label: '6. Código del Modelo', icon: Code },
              { id: 'terminal', label: '7. Terminal Interactiva', icon: Terminal },
              { id: 'visualizaciones', label: '8. Visualizaciones', icon: LineChart },
              { id: 'prediccion', label: '9. Predicción en Vivo', icon: Play },
              { id: 'conclusiones', label: '10. Conclusiones', icon: Check }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-900/40 to-slate-900/10 text-indigo-200 border-l-4 border-indigo-500 font-semibold shadow-inner shadow-indigo-500/5' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System API Status */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40">
          <div className="glass-panel-light p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${apiState.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold tracking-wide uppercase">
                {apiState.isOnline ? 'Servidor Flask Activo' : 'Modo Simulación'}
              </span>
            </div>
            <button 
              onClick={checkApiConnection}
              disabled={apiState.checking}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Recargar conexión con Backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${apiState.checking ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-500">Regresión Lineal E-Commerce v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-80">
        
        {/* HEADER BAR */}
        <header className="h-20 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 flex items-center justify-between px-6 md:px-10 z-30">
          <div className="flex items-center space-x-4 lg:hidden">
            <Cpu className="w-6 h-6 text-indigo-400" />
            <h1 className="font-bold text-lg">Laboratorio Regresión Lineal</h1>
          </div>
          <div className="hidden lg:block">
            <h2 className="text-slate-400 text-sm font-medium">Proyecto Universitario Integrado</h2>
            <h3 className="text-xs text-slate-500">Basado en el Synthetic Ecommerce Order Risk Dataset</h3>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Status Display Mobile */}
            <div className="lg:hidden flex items-center space-x-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${apiState.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                {apiState.isOnline ? 'Flask' : 'Simulado'}
              </span>
            </div>
            
            <button 
              onClick={() => setShowDocModal(true)}
              className="text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4.5 py-2 rounded-lg font-medium transition-colors"
            >
              Documentación
            </button>
            
            <button 
              onClick={() => {
                setTempApiUrl(getApiBase());
                setShowSettings(true);
              }}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
              title="Configurar Backend URL"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* CONTAINER SCROLLABLE */}
        <main className="flex-grow p-6 md:p-10 max-w-6xl w-full mx-auto space-y-12">

          {/* DASHBOARD HEADER */}
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
              <span>Laboratorio Académico</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 leading-tight">
              Laboratorio de Regresión Lineal
            </h1>
            <p className="text-lg text-slate-400 max-w-3xl">
              Predicción del Valor de Compras en E-commerce a través de técnicas de aprendizaje automático lineal.
            </p>
          </div>

          <hr className="border-slate-900" />

          {/* SECCIÓN 1: INTRODUCCIÓN */}
          <section ref={sectionRefs.introduccion} id="introduccion" className="space-y-6 scroll-mt-24">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">1. Introducción</h2>
            </div>
            
            <div className="glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
              <p className="text-slate-300 leading-relaxed text-base">
                Para este laboratorio se seleccionó el dataset <strong className="text-indigo-300">Synthetic Ecommerce Order Risk Dataset</strong>. 
                Este conjunto de datos contiene información sobre pedidos realizados en una tienda de comercio electrónico, 
                incluyendo características del cliente, detalles de la compra, descuentos aplicados, distancia de envío y 
                comportamiento histórico de los compradores.
              </p>
              <p className="text-slate-300 leading-relaxed text-base mt-4">
                El objetivo principal es analizar qué factores influyen en el valor final de una compra y utilizar un modelo de regresión lineal para realizar predicciones.
              </p>
            </div>
          </section>

          {/* SECCIÓN 2: CONTEXTO DEL PROBLEMA */}
          <section ref={sectionRefs.contexto} id="contexto" className="space-y-6 scroll-mt-24">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">2. Contexto del Problema</h2>
            </div>
            
            <div className="glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
              <p className="text-slate-300 leading-relaxed text-base">
                Las empresas de comercio electrónico necesitan comprender qué factores influyen en el valor de las compras realizadas por los clientes. Poder estimar el valor de una orden permite optimizar estrategias comerciales, promociones y procesos de venta.
              </p>
              <p className="text-slate-300 leading-relaxed text-base mt-4">
                Por esta razón se implementará un modelo de regresión lineal para predecir el valor de una orden de compra a partir de diferentes características del cliente y del pedido.
              </p>
            </div>
          </section>

          {/* SECCIÓN 3: VARIABLES DEL MODELO */}
          <section ref={sectionRefs.variables} id="variables" className="space-y-6 scroll-mt-24">
            <div className="flex items-center space-x-3">
              <Layers className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">3. Variables del Modelo</h2>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900/85 text-slate-300 font-semibold border-b border-slate-800">
                      <th className="p-4 pl-6 w-1/4">Rol</th>
                      <th className="p-4 w-1/4">Variable</th>
                      <th className="p-4 w-1/4">Descripción</th>
                      <th className="p-4 pr-6 w-1/4">Justificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    <tr className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 pl-6 font-semibold">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                          Dependiente
                        </span>
                      </td>
                      <td className="p-4 font-mono text-indigo-300 font-bold text-base">order_value_eur</td>
                      <td className="p-4">Valor total de la compra en euros.</td>
                      <td className="p-4 text-xs text-slate-400 leading-relaxed">
                        Se seleccionó como variable dependiente porque es el valor que se desea predecir mediante el modelo de regresión lineal. Al ser una variable numérica continua, es adecuada para este tipo de problema.
                      </td>
                    </tr>
                    {[
                      { name: 'quantity', desc: 'Cantidad de productos comprados.', just: 'Cuando un cliente compra más productos, normalmente aumenta el valor total de la orden. Por esta razón se espera una relación directa con la variable objetivo.' },
                      { name: 'discount_rate', desc: 'Porcentaje de descuento aplicado.', just: 'Los descuentos afectan directamente el precio final pagado por el cliente, por lo que pueden influir significativamente en el valor total de la compra.' },
                      { name: 'avg_order_value_eur', desc: 'Promedio histórico de compras del cliente.', just: 'Los clientes suelen mantener patrones de compra similares a lo largo del tiempo. Esta variable puede ayudar a estimar cuánto gastará un cliente en futuras compras.' },
                      { name: 'previous_orders', desc: 'Número de compras realizadas anteriormente.', just: 'Los clientes frecuentes suelen presentar comportamientos de compra distintos a los clientes nuevos y pueden realizar pedidos de mayor valor.' },
                      { name: 'customer_age_days', desc: 'Antigüedad del cliente en la plataforma.', just: 'Los clientes con más tiempo utilizando la plataforma pueden tener mayor confianza en el servicio y realizar compras de mayor valor.' },
                      { name: 'shipping_distance_km', desc: 'Distancia de envío en kilómetros.', just: 'Puede existir relación entre el alcance geográfico de la compra y el valor total del pedido.' }
                    ].map((v, i) => (
                      <tr key={v.name} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                            Independiente {i + 1}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-cyan-300 font-bold text-base">{v.name}</td>
                        <td className="p-4">{v.desc}</td>
                        <td className="p-4 text-xs text-slate-400 leading-relaxed">{v.just}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: DATASET */}
          <section ref={sectionRefs.dataset} id="dataset" className="space-y-6 scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Database className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold font-display">4. Dataset del Proyecto</h2>
              </div>
              <button 
                onClick={handleDownloadDataset}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-600/15 hover:shadow-indigo-500/20 active:scale-95 transition-all self-start md:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Dataset CSV</span>
              </button>
            </div>

            {/* General Shape Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cantidad de Registros</span>
                  <h3 className="text-3xl font-extrabold font-display text-indigo-400 mt-1">{datasetInfo.shape[0].toLocaleString()}</h3>
                </div>
                <div className="bg-indigo-500/10 p-3.5 rounded-xl">
                  <Layers className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cantidad de Columnas</span>
                  <h3 className="text-3xl font-extrabold font-display text-cyan-400 mt-1">{datasetInfo.shape[1]}</h3>
                </div>
                <div className="bg-cyan-500/10 p-3.5 rounded-xl">
                  <Database className="w-6 h-6 text-cyan-400" />
                </div>
              </div>
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fuente de Datos</span>
                  <h3 className="text-base font-bold text-slate-200 mt-2 truncate">Synthetic Order Risk</h3>
                </div>
                <div className="bg-emerald-500/10 p-3.5 rounded-xl">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Interactive Dataset Table */}
            <div className="glass-panel rounded-2xl overflow-hidden space-y-4 p-4">
              
              {/* Search Bar / Table Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar registros (ID, País, Cat...)"
                    value={tableState.search}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTableState(prev => ({ ...prev, search: val }));
                      fetchDatasetPage(1, val, tableState.sortBy, tableState.sortOrder);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                </div>
                <div className="text-xs text-slate-400 font-semibold">
                  Mostrando del {((tableState.page - 1) * tableState.limit) + 1} al {Math.min(tableState.page * tableState.limit, tableState.totalRecords)} de {tableState.totalRecords.toLocaleString()}
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto rounded-xl border border-slate-900">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-900">
                      <th className="p-3 pl-4">Order ID</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">País</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3 text-right">Cant (quantity)</th>
                      <th className="p-3 text-right">Desc (discount_rate)</th>
                      <th className="p-3 text-right">Histórico (avg_order_value)</th>
                      <th className="p-3 text-right">Valor Orden (order_value)</th>
                      <th className="p-3 text-right pr-4">Dist (shipping_distance)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300">
                    {records.length > 0 ? (
                      records.map(rec => (
                        <tr key={rec.order_id} className="hover:bg-slate-900/20 transition-all">
                          <td className="p-3 pl-4 font-mono font-bold text-indigo-400">{rec.order_id}</td>
                          <td className="p-3">{rec.order_date}</td>
                          <td className="p-3">{rec.country}</td>
                          <td className="p-3">{rec.product_category}</td>
                          <td className="p-3 text-right font-mono">{rec.quantity}</td>
                          <td className="p-3 text-right font-mono">{(rec.discount_rate * 100).toFixed(0)}%</td>
                          <td className="p-3 text-right font-mono">€{rec.avg_order_value_eur.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-200">€{rec.order_value_eur.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono pr-4">{rec.shipping_distance_km.toFixed(1)} km</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="p-6 text-center text-slate-500 font-semibold">
                          No se encontraron registros que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-slate-900 pt-4">
                <button
                  onClick={() => fetchDatasetPage(tableState.page - 1, tableState.search, tableState.sortBy, tableState.sortOrder)}
                  disabled={tableState.page === 1}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-xs px-3.5 py-2 rounded-xl text-slate-300 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                
                <span className="text-xs text-slate-500 font-medium">
                  Página <strong className="text-slate-300 font-bold">{tableState.page}</strong> de {tableState.totalPages}
                </span>

                <button
                  onClick={() => fetchDatasetPage(tableState.page + 1, tableState.search, tableState.sortBy, tableState.sortOrder)}
                  disabled={tableState.page >= tableState.totalPages}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-xs px-3.5 py-2 rounded-xl text-slate-300 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </section>

          {/* SECCIÓN 5: PREPROCESAMIENTO */}
          <section ref={sectionRefs.preprocesamiento} id="preprocesamiento" className="space-y-6 scroll-mt-24">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">5. Preprocesamiento de Datos</h2>
            </div>

            {/* Cleaning Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-emerald-500">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registros Duplicados</span>
                  <h4 className="text-xl font-bold text-slate-100 mt-1">
                    {datasetInfo.duplicate_count === 0 ? '0 Eliminados' : `${datasetInfo.duplicate_count} Eliminados`}
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-medium mt-1 block">✔ Limpieza automática realizada</span>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
              </div>
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-emerald-500">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Verificación de Valores Nulos</span>
                  <h4 className="text-xl font-bold text-slate-100 mt-1">0 detectados</h4>
                  <span className="text-[10px] text-emerald-400 font-medium mt-1 block">✔ 100% de datos completos</span>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
              </div>
              <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-l-4 border-indigo-500">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Detección de Valores Atípicos (IQR)</span>
                  <h4 className="text-xl font-bold text-slate-100 mt-1">{datasetInfo.outliers_count} atípicos</h4>
                  <span className="text-[10px] text-indigo-400 font-medium mt-1 block">Analizados en order_value_eur</span>
                </div>
                <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Target Value Stats Cards */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-300 font-display flex items-center space-x-2">
                <span>Indicadores Clave del Valor de Compra (</span>
                <span className="font-mono text-indigo-400 text-sm">order_value_eur</span>
                <span>)</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-b-md" />
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Media</span>
                  <h4 className="text-2xl font-black font-display text-indigo-400 mt-2">€{datasetInfo.target_stats.mean.toFixed(2)}</h4>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-500 to-cyan-500 rounded-b-md" />
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mediana</span>
                  <h4 className="text-2xl font-black font-display text-cyan-400 mt-2">€{datasetInfo.target_stats.median.toFixed(2)}</h4>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-b-md" />
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Máximo</span>
                  <h4 className="text-2xl font-black font-display text-emerald-400 mt-2">€{datasetInfo.target_stats.max.toFixed(2)}</h4>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl shadow-sm text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-rose-500 to-rose-500 rounded-b-md" />
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mínimo</span>
                  <h4 className="text-2xl font-black font-display text-rose-400 mt-2">€{datasetInfo.target_stats.min.toFixed(2)}</h4>
                </div>
              </div>
            </div>

            {/* Descriptive Statistics Table */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-300 font-display">Tabla Estadística Descriptiva (Variables Numéricas Limpias)</h3>
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/85 text-slate-400 font-semibold border-b border-slate-900">
                        <th className="p-3 pl-5">Variable</th>
                        <th className="p-3 text-right">Cantidad (count)</th>
                        <th className="p-3 text-right">Media (mean)</th>
                        <th className="p-3 text-right">Desv. Est. (std)</th>
                        <th className="p-3 text-right">Min</th>
                        <th className="p-3 text-right">25% (Q1)</th>
                        <th className="p-3 text-right">50% (Mediana)</th>
                        <th className="p-3 text-right">75% (Q3)</th>
                        <th className="p-3 text-right pr-5">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {Object.entries(datasetInfo.descriptive_stats).map(([name, stats]) => (
                        <tr key={name} className="hover:bg-slate-900/20 transition-all font-mono">
                          <td className="p-3 pl-5 font-sans font-bold text-slate-200 text-sm">{name}</td>
                          <td className="p-3 text-right">{stats.count.toLocaleString()}</td>
                          <td className="p-3 text-right">{stats.mean.toFixed(3)}</td>
                          <td className="p-3 text-right">{stats.std.toFixed(3)}</td>
                          <td className="p-3 text-right">{stats.min.toFixed(2)}</td>
                          <td className="p-3 text-right">{stats.q1.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold text-cyan-400">{stats.median.toFixed(2)}</td>
                          <td className="p-3 text-right">{stats.q3.toFixed(2)}</td>
                          <td className="p-3 text-right pr-5 font-semibold text-slate-100">{stats.max.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 6: IMPLEMENTACIÓN DEL MODELO */}
          <section ref={sectionRefs.implementacion} id="implementacion" className="space-y-6 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <Code className="w-6 h-6 text-indigo-400" />
                <h2 className="text-2xl font-bold font-display">6. Implementación del Modelo (Python)</h2>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-4.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 self-start sm:self-auto"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>

            {/* VS Code Syntax Highlighting Block */}
            <div className="rounded-2xl border border-slate-900 overflow-hidden shadow-2xl bg-[#1e1e1e] font-mono text-sm leading-relaxed">
              
              {/* VS Code Window Header */}
              <div className="bg-[#2d2d2d] px-4 py-3 flex items-center justify-between border-b border-[#252526]">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  <span className="text-xs text-slate-400 ml-4 font-sans select-none flex items-center space-x-1.5">
                    <span className="text-indigo-400 font-bold">Py</span>
                    <span>linear_regression.py</span>
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans tracking-wide uppercase select-none">Python 3.x - scikit-learn</div>
              </div>

              {/* Editor Code Lines */}
              <div className="p-4 md:p-6 overflow-x-auto text-[#d4d4d4] custom-scroll select-text">
                <pre className="whitespace-pre">
{highlightPythonCode(pythonCodeText)}
                </pre>
              </div>
            </div>
          </section>

          {/* SECCIÓN 7: TERMINAL INTERACTIVA */}
          <section ref={sectionRefs.terminal} id="terminal" className="space-y-6 scroll-mt-24">
            <div className="flex items-center space-x-3">
              <Terminal className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">7. Terminal Interactiva de Simulación</h2>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-5 relative overflow-hidden">
              <p className="text-slate-300 text-sm leading-relaxed">
                Ejecuta el pipeline de aprendizaje automático lineal simulado sobre la terminal interactiva. Se procesará el preprocesamiento, la separación de entrenamiento y prueba, el ajuste por mínimos cuadrados (OLS) y se imprimirán las métricas de rendimiento estimadas del modelo.
              </p>

              {/* Terminal Frame */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-96">
                
                {/* Terminal Header */}
                <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-900/60 flex items-center justify-between text-xs text-slate-500 select-none">
                  <span className="font-mono">zsh - bash - python linear_regression.py</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                </div>
                
                {/* Terminal Screen Output */}
                <div className="p-4 flex-1 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 custom-scroll text-slate-300">
                  {terminalLogs.length === 0 ? (
                    <div className="text-slate-600 flex flex-col items-center justify-center h-full space-y-2 select-none">
                      <Terminal className="w-8 h-8 text-slate-700 animate-pulse" />
                      <span className="text-xs">Consola vacía. Haz clic en "Ejecutar Modelo" para iniciar la ejecución.</span>
                    </div>
                  ) : (
                    terminalLogs.map((log, index) => {
                      let colorClass = 'text-slate-300';
                      if (log.type === 'success') colorClass = 'text-emerald-400 font-semibold';
                      if (log.type === 'metric') colorClass = 'text-cyan-400 font-bold pl-4';
                      if (log.type === 'header') colorClass = 'text-indigo-400 font-extrabold uppercase mt-2';
                      if (log.type === 'error') colorClass = 'text-rose-500 font-bold';
                      return (
                        <div key={index} className={`${colorClass} whitespace-pre-wrap transition-opacity duration-300`}>
                          {log.text}
                        </div>
                      );
                    })
                  )}
                  {isTraining && (
                    <div className="text-indigo-400 animate-pulse flex items-center space-x-1.5 mt-1 select-none">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      <span>Ejecutando ajuste lineal...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={runTraining}
                  disabled={isTraining}
                  className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-40 text-slate-950 px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/10 hover:shadow-emerald-500/20 active:scale-95 disabled:pointer-events-none transition-all duration-300 text-sm"
                >
                  <Play className="w-4 h-4 text-slate-950 fill-current" />
                  <span>{isTraining ? 'Entrenando...' : 'Ejecutar Modelo'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* SECCIÓN 8: VISUALIZACIONES */}
          <section ref={sectionRefs.visualizaciones} id="visualizaciones" className="space-y-6 scroll-mt-24">
            <div className="flex items-center space-x-3">
              <LineChart className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">8. Visualizaciones Dinámicas (Chart.js)</h2>
            </div>

            {/* Dashboard grid charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Chart 1: Histogram */}
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-display">Distribución del Valor de Órdenes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Histograma del total de compras (order_value_eur)</p>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <Bar
                    data={histogramChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: 'rgba(255, 255, 255, 0.45)', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: 'rgba(255, 255, 255, 0.45)', font: { size: 10 } } }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Chart 2: Scatter real vs pred */}
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-display">Valores Reales vs Predichos</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Comparación de predicciones frente a datos reales en conjunto de prueba</p>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <Scatter
                    data={scatterChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
                      scales: {
                        x: { 
                          title: { display: true, text: 'Valor Real (€)', color: '#64748b', font: { size: 10 } },
                          grid: { color: 'rgba(255, 255, 255, 0.03)' }, 
                          ticks: { color: 'rgba(255, 255, 255, 0.45)', font: { size: 10 } } 
                        },
                        y: { 
                          title: { display: true, text: 'Valor Predicho (€)', color: '#64748b', font: { size: 10 } },
                          grid: { color: 'rgba(255, 255, 255, 0.03)' }, 
                          ticks: { color: 'rgba(255, 255, 255, 0.45)', font: { size: 10 } } 
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Chart 3: Correlation Matrix (Heatmap) */}
              <div className="glass-panel p-5 rounded-2xl space-y-4 lg:col-span-2">
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-display">Matriz de Correlación de Pearson</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Grado de correlación lineal entre la variable dependiente y las independientes</p>
                </div>
                
                {/* Heatmap Matrix Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px] p-2">
                    {/* Matrix Column Headers */}
                    <div className="flex">
                      <div className="w-44 shrink-0" />
                      {modelResults.visualizations.correlation.columns.map(col => (
                        <div key={col} className="flex-1 text-center font-mono text-[10px] text-slate-400 font-bold truncate p-1.5 uppercase tracking-wide">
                          {col}
                        </div>
                      ))}
                    </div>

                    {/* Matrix Rows */}
                    {modelResults.visualizations.correlation.columns.map((rowCol, rowIndex) => (
                      <div key={rowCol} className="flex items-center">
                        {/* Row Header */}
                        <div className="w-44 shrink-0 font-mono text-[11px] font-semibold text-slate-300 pr-3 truncate text-right uppercase tracking-wide">
                          {rowCol}
                        </div>
                        {/* Heatmap cells */}
                        {modelResults.visualizations.correlation.columns.map((colCol, colIndex) => {
                          const val = modelResults.visualizations.correlation.matrix[rowIndex][colIndex];
                          const bgColor = getCorrelationColor(val);
                          return (
                            <div 
                              key={colCol} 
                              className="flex-1 h-14 m-0.5 rounded-lg flex flex-col items-center justify-center relative group transition-all duration-300 border border-slate-900 hover:border-slate-300/30"
                              style={{ backgroundColor: bgColor }}
                            >
                              <span className="text-[12px] font-black text-slate-950 mix-blend-difference">
                                {val.toFixed(2)}
                              </span>
                              {/* Hover card */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-sans px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-36 text-center mb-1.5 z-20">
                                <strong className="block text-indigo-400 font-mono text-[9px] truncate mb-0.5">{rowCol} × {colCol}</strong>
                                <span>Correlación: {val}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-6 text-xs text-slate-400 pt-2 border-t border-slate-900/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-indigo-500/80 border border-indigo-400/25" />
                    <span>Correlación Positiva Alta</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800" />
                    <span>Sin Correlación (Cercano a 0)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-rose-500/80 border border-rose-400/25" />
                    <span>Correlación Negativa</span>
                  </div>
                </div>
              </div>

              {/* Chart 4: Feature Importance */}
              <div className="glass-panel p-5 rounded-2xl space-y-4 lg:col-span-2">
                <div>
                  <h3 className="text-base font-bold text-slate-200 font-display">Pesos de las Variables (Coeficientes β)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Magnitud e impacto positivo/negativo de cada característica en la predicción final</p>
                </div>
                <div className="h-72 flex items-center justify-center">
                  <Bar
                    data={importanceChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { legend: { display: false } },
                      scales: {
                        x: { 
                          grid: { color: 'rgba(255, 255, 255, 0.03)' }, 
                          ticks: { color: 'rgba(255, 255, 255, 0.45)', font: { size: 10 } } 
                        },
                        y: { 
                          grid: { display: false }, 
                          ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 11, family: 'Outfit' } } 
                        }
                      }
                    }}
                  />
                </div>
              </div>

            </div>
          </section>

          {/* SECCIÓN 9: PREDICCIÓN EN TIEMPO REAL */}
          <section ref={sectionRefs.prediccion} id="prediccion" className="scroll-mt-24 space-y-6">
            <div className="flex items-center space-x-3">
              <Play className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">9. Predicción en Tiempo Real</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Form Input Fields */}
              <div className="lg:col-span-3 glass-panel p-6 rounded-2xl space-y-5">
                <h3 className="text-base font-bold text-slate-200 border-b border-slate-900 pb-3 flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <span>Parámetros de Entrada del Cliente</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Parameter: Quantity */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>Cantidad (quantity)</span>
                      <span className="font-mono text-cyan-400 font-bold">{predictionInput.quantity} u</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={predictionInput.quantity}
                      onChange={(e) => setPredictionInput(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Parameter: Discount Rate */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>Descuento (discount_rate)</span>
                      <span className="font-mono text-cyan-400 font-bold">{(predictionInput.discount_rate * 100).toFixed(0)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="0.8"
                      step="0.05"
                      value={predictionInput.discount_rate}
                      onChange={(e) => setPredictionInput(prev => ({ ...prev, discount_rate: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Parameter: Average Order Value */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>Promedio Histórico (avg_order_value_eur)</span>
                      <span className="font-mono text-cyan-400 font-bold">€{predictionInput.avg_order_value_eur}</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={predictionInput.avg_order_value_eur}
                      onChange={(e) => setPredictionInput(prev => ({ ...prev, avg_order_value_eur: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Parameter: Previous Orders */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>Pedidos Previos (previous_orders)</span>
                      <span className="font-mono text-cyan-400 font-bold">{predictionInput.previous_orders} pedidos</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={predictionInput.previous_orders}
                      onChange={(e) => setPredictionInput(prev => ({ ...prev, previous_orders: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Parameter: Customer Age Days */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>Antigüedad (customer_age_days)</span>
                      <span className="font-mono text-cyan-400 font-bold">{predictionInput.customer_age_days} días</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="1800"
                      step="30"
                      value={predictionInput.customer_age_days}
                      onChange={(e) => setPredictionInput(prev => ({ ...prev, customer_age_days: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Parameter: Shipping Distance */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex justify-between">
                      <span>Distancia Envío (shipping_distance_km)</span>
                      <span className="font-mono text-cyan-400 font-bold">{predictionInput.shipping_distance_km} km</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="2000"
                      step="25"
                      value={predictionInput.shipping_distance_km}
                      onChange={(e) => setPredictionInput(prev => ({ ...prev, shipping_distance_km: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={runPrediction}
                    disabled={isPredicting}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-95 transition-all text-sm w-full sm:w-auto"
                  >
                    <span>Predecir valor de compra</span>
                  </button>
                </div>
              </div>

              {/* Display Prediction Result Card */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col justify-between items-center text-center relative overflow-hidden bg-gradient-to-b from-slate-900/80 to-slate-950">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
                
                <div className="space-y-2 z-10">
                  <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Resultado de Inferencia</span>
                  <h4 className="text-base text-slate-300 font-display font-medium">Valor Estimado de la Orden</h4>
                </div>

                <div className="my-8 z-10 flex flex-col items-center">
                  {isPredicting ? (
                    <div className="flex flex-col items-center justify-center space-y-3 h-28">
                      <div className="w-10 h-10 border-4 border-indigo-400/20 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">Calculando...</span>
                    </div>
                  ) : predictionResult !== null ? (
                    <div className="h-28 flex flex-col items-center justify-center space-y-1">
                      <span className="text-5xl md:text-6xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 leading-none">
                        €{predictionResult}
                      </span>
                      <span className="text-xs font-semibold text-emerald-400 tracking-wider">EUR EST.</span>
                    </div>
                  ) : (
                    <div className="h-28 flex flex-col items-center justify-center text-slate-500 space-y-2">
                      <HelpCircle className="w-10 h-10 text-slate-700" />
                      <span className="text-xs max-w-[150px] leading-relaxed">Configura los sliders y presiona predecir.</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 leading-relaxed max-w-[200px] z-10 select-none">
                  El cálculo se realiza mediante el modelo de regresión lineal entrenado utilizando el método de mínimos cuadrados ordinarios.
                </div>
              </div>

            </div>
          </section>

          {/* SECCIÓN 10: CONCLUSIONES */}
          <section ref={sectionRefs.conclusiones} id="conclusiones" className="scroll-mt-24 space-y-6">
            <div className="flex items-center space-x-3">
              <Check className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold font-display">10. Conclusiones del Laboratorio</h2>
            </div>

            <div className="glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden space-y-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
              <p className="text-slate-300 leading-relaxed text-base">
                El modelo de regresión lineal permitió analizar cómo diferentes variables influyen en el valor de una compra. 
                Entre los factores más relevantes se encuentran la cantidad de productos adquiridos, el historial de compras del cliente y los descuentos aplicados.
              </p>
              <p className="text-slate-300 leading-relaxed text-base">
                Este tipo de modelos puede ayudar a las empresas a comprender mejor el comportamiento de sus clientes y tomar decisiones basadas en datos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-slate-900/60">
                <div className="p-4 bg-slate-950/45 rounded-xl border border-slate-900 text-center">
                  <h4 className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">R-cuadrado (R²)</h4>
                  <span className="text-lg font-bold text-slate-200">~{modelResults.metrics.r2.toFixed(2)}</span>
                  <p className="text-[10px] text-slate-500 mt-1">Varianza de order_value explicada por las variables</p>
                </div>
                <div className="p-4 bg-slate-950/45 rounded-xl border border-slate-900 text-center">
                  <h4 className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Impacto Promedio</h4>
                  <span className="text-lg font-bold text-slate-200">avg_order_value</span>
                  <p className="text-[10px] text-slate-500 mt-1">El valor histórico del cliente es el predictor dominante</p>
                </div>
                <div className="p-4 bg-slate-950/45 rounded-xl border border-slate-900 text-center">
                  <h4 className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Optimización</h4>
                  <span className="text-lg font-bold text-slate-200">Comercial</span>
                  <p className="text-[10px] text-slate-500 mt-1">Permite estimar el ROI y ajustar precios en tiempo real</p>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="pt-8 border-t border-slate-900 text-center text-xs text-slate-500 space-y-1">
            <p>© 2026 Laboratorio de Regresión Lineal. Proyecto Universitario Integrado.</p>
            <p>Construido con React, Flask, Scikit-Learn y Tailwind CSS.</p>
          </footer>

        </main>
      </div>

      {/* DOCUMENTATION MODAL */}
      {showDocModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xl font-bold font-display text-white">Manual Metodológico e Interpretación del Modelo</h3>
              </div>
              <button 
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-8 text-sm text-slate-300 leading-relaxed custom-scroll">
              
              {/* Section 1: Regression Concept */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-indigo-300 font-display flex items-center space-x-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded" />
                  <span>1. ¿Cómo funciona la Regresión Lineal?</span>
                </h4>
                <p>
                  La regresión lineal es un método estadístico que modela la relación entre una variable dependiente (Y, en este caso <code>order_value_eur</code>) y una o más variables independientes (X_i, como la cantidad, descuento y el promedio histórico). 
                  El modelo asume una relación lineal y calcula una ecuación predictiva de la forma:
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center font-mono text-xs text-cyan-400 overflow-x-auto">
                  order_value_eur = β₀ + β₁·quantity + β₂·discount_rate + β₃·avg_order_value_eur + ... + ε
                </div>
                <p>
                  Donde <code className="text-indigo-400">β₀</code> es la intersección (el valor estimado de la orden si todas las variables fueran 0), cada <code className="text-cyan-400">β_i</code> representa el coeficiente o peso que cuantifica el impacto marginal de esa variable, y <code className="text-slate-500">ε</code> es el término de error. 
                  El modelo de regresión lineal en la terminal interactiva utiliza el estimador de <strong>Mínimos Cuadrados Ordinarios (OLS)</strong>, que encuentra los coeficientes minimizando la suma de las diferencias al cuadrado entre los valores reales y las predicciones.
                </p>
              </div>

              {/* Section 2: Metrics */}
              <div className="space-y-3">
                <h4 className="text-base font-bold text-indigo-300 font-display flex items-center space-x-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded" />
                  <span>2. Interpretación de las Métricas de Evaluación</span>
                </h4>
                <p>
                  Para medir qué tan bien se adapta nuestro modelo a los datos y su capacidad de generalización en compras futuras, calculamos tres métricas clave sobre el conjunto de datos de prueba:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                    <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">MAE (Error Absoluto Medio)</span>
                    <p className="text-xs text-slate-300">
                      Calcula el promedio de las diferencias absolutas entre las predicciones del modelo y los valores reales. 
                      Un <strong>MAE de ~26.77 EUR</strong> significa que, en promedio, las estimaciones del modelo se desvían aproximadamente 26.77 euros del valor real de compra.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                    <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">MSE (Error Cuadrático Medio)</span>
                    <p className="text-xs text-slate-300">
                      Calcula el promedio de los errores elevados al cuadrado. Al elevar los errores, esta métrica penaliza de manera desproporcionada los errores grandes (desviaciones extremas u outliers), lo que ayuda a identificar si el modelo comete fallos catastróficos.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                    <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">R² (Coeficiente de Determinación)</span>
                    <p className="text-xs text-slate-300">
                      Mide la proporción de la varianza de la variable objetivo que es explicada por las variables del modelo. 
                      Un <strong>R² de 0.4059 (40.6%)</strong> indica que el 40.6% de la variabilidad del valor de compra se explica por las variables analizadas, un resultado robusto para datos transaccionales sintéticos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Visualizations Explanation */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-indigo-300 font-display flex items-center space-x-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded" />
                  <span>3. Guía de Interpretación de Gráficos Dinámicos</span>
                </h4>
                
                <div className="space-y-3.5">
                  <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-850/60 space-y-1">
                    <h5 className="font-bold text-slate-200">A. Distribución del Valor de Órdenes (Histograma)</h5>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Este gráfico divide el rango de <code>order_value_eur</code> en 20 intervalos ("bins") y cuenta cuántas órdenes caen en cada uno. 
                      Permite identificar la forma de los datos. Notamos una <strong>asimetría positiva (sesgo a la derecha)</strong> muy pronunciada, lo que demuestra estadísticamente que la gran mayoría de las transacciones son de valores menores (entre 5 y 100 EUR), mientras que hay una minoría de transacciones con montos altos (hasta 800 EUR) que forman la cola del histograma.
                    </p>
                  </div>

                  <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-850/60 space-y-1">
                    <h5 className="font-bold text-slate-200">B. Gráfico de Dispersión (Reales vs Predichos)</h5>
                    <p className="text-xs text-slate-455 leading-relaxed">
                      Dibuja un punto para cada compra en el set de prueba usando su valor real en el eje X y el valor estimado en el eje Y. 
                      La <strong>línea roja discontinua representa el "Ajuste Perfecto" (Y = X)</strong>. 
                      Si el modelo tuviera una predicción exacta del 100%, todos los puntos caerían sobre esta línea. 
                      La dispersión vertical de los puntos alrededor de la línea nos permite visualizar el error residual del modelo. Notamos una buena agrupación lineal para montos de compra bajos y medianos.
                    </p>
                  </div>

                  <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-850/60 space-y-1">
                    <h5 className="font-bold text-slate-200">C. Mapa de Calor de Correlación (Heatmap)</h5>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Presenta los coeficientes de correlación de Pearson entre todas las variables en un rango de -1 a 1. 
                      Un valor cercano a 1 indica una relación lineal directa fuerte (al subir X, sube Y), mientras que un valor cercano a -1 indica una relación inversa. 
                      Observamos que la correlación más fuerte con el valor de la orden es <strong>avg_order_value_eur (0.64)</strong>, confirmando que el historial de compras del cliente es el factor que más se relaciona linealmente con lo que gastará en su orden actual.
                    </p>
                  </div>

                  <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-850/60 space-y-1">
                    <h5 className="font-bold text-slate-200">D. Pesos de las Variables (Coeficientes β)</h5>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Muestra la importancia y el sentido del impacto de cada variable independiente. 
                      El coeficiente del promedio histórico (<code>avg_order_value_eur</code>) es aproximadamente <strong>1.26 (positivo, barra verde)</strong>, lo que indica que por cada incremento de 1 EUR en el promedio histórico del cliente, el valor estimado de la orden aumenta en 1.26 EUR (manteniendo los demás parámetros constantes). 
                      Los coeficientes con valores cercanos a 0 o negativos (como <code>shipping_distance_km</code> y <code>customer_age_days</code>) muestran que estas características tienen un impacto muy bajo o inverso en la determinación final del valor del pedido.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowDocModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2 rounded-xl text-xs active:scale-95 transition-all font-sans"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-display text-white flex items-center space-x-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <span>Configurar Backend API</span>
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Especifica la dirección URL de tu servidor API Flask en producción (por ejemplo, en Render) para que el frontend realice consultas reales en la nube.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold uppercase tracking-wider block">URL base de la API</label>
                <input 
                  type="text" 
                  value={tempApiUrl} 
                  onChange={(e) => setTempApiUrl(e.target.value)}
                  placeholder="https://tu-backend.onrender.com/api" 
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none font-mono"
                />
              </div>
              
              <div className="text-[10px] text-slate-500 leading-relaxed">
                Nota: Guardar estos cambios recargará la aplicación para restablecer la conexión. Si dejas el campo vacío o apuntas a localhost, puedes usar el servidor local.
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (tempApiUrl.trim()) {
                    localStorage.setItem('backend_api_url', tempApiUrl.trim());
                  } else {
                    localStorage.removeItem('backend_api_url');
                  }
                  window.location.reload();
                }}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-indigo-600/10"
              >
                Guardar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom highlighter helper to make code look stunning like VS Code
function highlightPythonCode(code) {
  const keywords = /\b(import|from|print|def|return|if|elif|else|for|in|while|as|with|class)\b/g;
  const strings = /('(.*?)')|("(.*?)")/g;
  const functions = /\b(read_csv|drop_duplicates|dropna|train_test_split|LinearRegression|fit|predict|mean_absolute_error|mean_squared_error|r2_score|dump|round|len)\b/g;
  const comments = /(#.*?)$/gm;
  const numbers = /\b(\d+(\.\d+)?)\b/g;

  let parts = [code];

  // Helper function to safely render styled text elements inside React code blocks
  // Since we are returning a raw pre string, we can convert it into markup using dangerouslySetInnerHTML,
  // which is extremely standard and safe for static pre-formatted code.
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Style Comments
  html = html.replace(comments, '<span class="text-green-500 font-medium">$1</span>');
  
  // Style Keywords
  // Match keywords but ensure we don't match inside tags
  html = html.replace(/\b(import|from|print|def|return|if|elif|else|for|in|while|as|with|class)\b/g, '<span class="text-pink-500 font-bold">$1</span>');
  
  // Style Strings
  html = html.replace(/('(.*?)')|("(.*?)")/g, '<span class="text-yellow-200 font-normal">$0</span>');

  // Style Functions
  html = html.replace(/\b(read_csv|drop_duplicates|dropna|train_test_split|LinearRegression|fit|predict|mean_absolute_error|mean_squared_error|r2_score|dump|round|len)\b/g, '<span class="text-cyan-400 font-medium">$1</span>');

  // Style numbers
  html = html.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="text-amber-400">$1</span>');

  return <code dangerouslySetInnerHTML={{ __html: html }} />;
}

const pythonCodeText = `import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn import metrics
import joblib

# 1. Cargar el dataset
print("Cargando dataset...")
df = pd.read_csv('synthetic_ecommerce_order_risk_dataset.csv')

# 2. Preprocesamiento
# Eliminación de duplicados
df = df.drop_duplicates()

# Selección de variables para el modelo
features = [
    'quantity', 
    'discount_rate', 
    'avg_order_value_eur', 
    'previous_orders', 
    'customer_age_days', 
    'shipping_distance_km'
]
target = 'order_value_eur'

# Eliminar registros con valores nulos en variables clave
df_model = df[features + [target]].dropna()

X = df_model[features]
y = df_model[target]

# 3. División de datos en entrenamiento y prueba (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Entrenar el modelo de regresión lineal
print("Entrenando modelo...")
model = LinearRegression()
model.fit(X_train, y_train)

# 5. Guardar el modelo entrenado
joblib.dump(model, 'model.joblib')
print("Modelo entrenado correctamente.")

# 6. Realizar predicciones y evaluar el modelo
y_pred = model.predict(X_test)

# Calcular métricas de rendimiento
mae = metrics.mean_absolute_error(y_test, y_pred)
mse = metrics.mean_squared_error(y_test, y_pred)
r2 = metrics.r2_score(y_test, y_pred)

print("\\nMétricas de Evaluación:")
print(f"MAE  (Error Absoluto Medio): {mae:.4f}")
print(f"MSE  (Error Cuadrático Medio): {mse:.4f}")
print(f"R²   (Coeficiente de Determinación): {r2:.4f}")
`;

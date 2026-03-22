import React, { useState, useMemo } from 'react';
import MapSelector from './components/MapSelector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, MapPin, Sun, DollarSign, Zap } from 'lucide-react';

export default function App() {
  // State for parameters
  const [position, setPosition] = useState<[number, number]>([10.7626, 106.6602]); // Default HCMC
  const [capacity, setCapacity] = useState<number>(5); // kWp
  const [costPerKWp, setCostPerKWp] = useState<number>(12000000); // VND
  const [elecPrice, setElecPrice] = useState<number>(2000); // VND/kWh
  const [discountRate, setDiscountRate] = useState<number>(8); // %
  const [lifespan, setLifespan] = useState<number>(20); // Years
  const [degradation, setDegradation] = useState<number>(0.5); // % per year
  const [omCostPercent, setOmCostPercent] = useState<number>(1); // % of Capex per year

  // Estimate yield based on latitude (simple heuristic for Vietnam)
  // South (lat < 12): ~1500 kWh/kWp
  // Central (12 <= lat <= 16): ~1350 kWh/kWp
  // North (lat > 16): ~1150 kWh/kWp
  const estimatedYield = useMemo(() => {
    const lat = position[0];
    if (lat < 12) return 1500;
    if (lat <= 16) return 1350;
    return 1150;
  }, [position]);

  const [customYield, setCustomYield] = useState<number | string>('');
  const finalYield = customYield !== '' ? Number(customYield) : estimatedYield;

  const handlePositionChange = (pos: [number, number]) => {
    setPosition(pos);
    setCustomYield('');
  };

  // Calculations
  const results = useMemo(() => {
    const capex = capacity * costPerKWp;
    let cumulativeCashFlow = -capex;
    let npv = -capex;
    const cashFlows = [{ year: 0, cashFlow: -capex, cumulative: cumulativeCashFlow }];
    let paybackYear = -1;

    for (let year = 1; year <= lifespan; year++) {
      const generation = capacity * finalYield * Math.pow(1 - degradation / 100, year - 1);
      const revenue = generation * elecPrice;
      const omCost = capex * (omCostPercent / 100);
      const netCashFlow = revenue - omCost;

      cumulativeCashFlow += netCashFlow;
      npv += netCashFlow / Math.pow(1 + discountRate / 100, year);

      if (cumulativeCashFlow >= 0 && paybackYear === -1) {
        // Linear interpolation for more accurate payback period
        const prevCumulative = cashFlows[year - 1].cumulative;
        paybackYear = (year - 1) + Math.abs(prevCumulative) / netCashFlow;
      }

      cashFlows.push({
        year,
        cashFlow: Math.round(netCashFlow),
        cumulative: Math.round(cumulativeCashFlow),
      });
    }

    const totalRevenue = cashFlows.reduce((sum, cf) => cf.year > 0 ? sum + cf.cashFlow : sum, 0);
    const roi = (totalRevenue / capex) * 100;

    return {
      capex,
      npv,
      paybackYear: paybackYear > 0 ? paybackYear : null,
      roi,
      cashFlows,
      firstYearGen: capacity * finalYield
    };
  }, [capacity, costPerKWp, elecPrice, discountRate, lifespan, degradation, omCostPercent, finalYield]);

  // Format currency
  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-sm">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vietnam Rooftop Solar NPV Calculator</h1>
            <p className="text-sm text-gray-500">Estimate the financial viability of solar installations based on location.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            {/* Map Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">1. Select Location</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">Click anywhere on the map to set the installation site.</p>
              <MapSelector position={position} onPositionChange={handlePositionChange} />
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-800 font-medium">Est. Annual Yield (based on location):</span>
                  <span className="text-emerald-900 font-bold">{estimatedYield} kWh/kWp</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <label className="text-sm text-emerald-800 font-medium">Custom Yield (optional):</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={customYield} 
                      onChange={e => setCustomYield(e.target.value)} 
                      placeholder={estimatedYield.toString()}
                      className="w-24 p-1.5 text-right border border-emerald-200 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-emerald-900 font-medium"
                    />
                    <span className="text-sm text-emerald-800 font-medium">kWh/kWp</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameters Card */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">2. System Parameters</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System Capacity (kWp)</label>
                  <input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installation Cost (VND/kWp)</label>
                  <input type="number" value={costPerKWp} onChange={e => setCostPerKWp(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Electricity Price (VND/kWh)</label>
                  <input type="number" value={elecPrice} onChange={e => setElecPrice(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Rate (%)</label>
                    <input type="number" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lifespan (Years)</label>
                    <input type="number" value={lifespan} onChange={e => setLifespan(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Degradation (%/yr)</label>
                    <input type="number" step="0.1" value={degradation} onChange={e => setDegradation(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">O&M Cost (% Capex/yr)</label>
                    <input type="number" step="0.1" value={omCostPercent} onChange={e => setOmCostPercent(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-medium text-gray-500 mb-1">Net Present Value (NPV)</span>
                <span className={`text-2xl font-bold ${results.npv >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatVND(results.npv)}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-medium text-gray-500 mb-1">Payback Period</span>
                <span className="text-2xl font-bold text-gray-900">
                  {results.paybackYear ? `${results.paybackYear.toFixed(1)} Years` : 'Never'}
                </span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-medium text-gray-500 mb-1">Initial Investment (Capex)</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatVND(results.capex)}
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-6">Cumulative Cash Flow Over Time</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.cashFlows} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatVND(value)}
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="cumulative" name="Cumulative Cash Flow" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    {/* Zero Line */}
                    <Line type="monotone" dataKey={() => 0} stroke="#9CA3AF" strokeWidth={1} strokeDasharray="5 5" dot={false} activeDot={false} legendType="none" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Extra Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                 <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                   <Zap className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm text-gray-500 font-medium">1st Year Generation</p>
                   <p className="text-xl font-bold text-gray-900">{Math.round(results.firstYearGen).toLocaleString()} kWh</p>
                 </div>
               </div>
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                   <DollarSign className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm text-gray-500 font-medium">Total ROI</p>
                   <p className="text-xl font-bold text-gray-900">{results.roi.toFixed(1)}%</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

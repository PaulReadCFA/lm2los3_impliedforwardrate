import React, { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Scatter,
  LabelList,
  ReferenceLine,
} from "recharts";

// Accessibility-first color palette (colorblind-safe)
const COLORS = {
  primary: "#4476FF",        
  dark: "#1e40af",          
  positive: "#2563eb",      // Blue (colorblind safe)
  negative: "#ea580c",      // Orange (colorblind safe)  
  purple: "#7c3aed",        
  orange: "#ea580c",        
  lightBlue: "#3b82f6",     
  darkOrange: "#c2410c",    
};

// Shared Card Component
function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-5 border border-gray-100 ${className}`}>
      <h2 className="font-serif text-xl text-slate-800 mb-3">{title}</h2>
      <div className="font-sans text-sm text-black/80">{children}</div>
    </div>
  );
}

// Accessible info icon with tooltip
function InfoIcon({ children, id }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-400 text-white text-xs font-bold hover:bg-gray-500 focus:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-describedby={`${id}-tooltip`}
        aria-label="More information"
      >
        ?
      </button>
      
      {showTooltip && (
        <div
          id={`${id}-tooltip`}
          role="tooltip"
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10 max-w-xs"
          style={{ fontSize: '11px' }}
        >
          {children}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}

// Enhanced form field with accessible info icons
function FormField({ id, label, children, error, helpText, required = false }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="font-medium text-gray-700 mb-1 flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        {helpText && <InfoIcon id={id}>{helpText}</InfoIcon>}
      </label>
      {children}
      {error && (
        <div className="text-red-600 text-xs mt-1" role="alert" id={`${id}-error`}>
          {error}
        </div>
      )}
    </div>
  );
}

// Validation message component
function ValidationMessage({ errors }) {
  if (!errors || Object.keys(errors).length === 0) return null;
  
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <h3 className="text-red-800 font-semibold text-sm mb-2">Please correct the following:</h3>
      <ul className="text-red-800 text-sm space-y-1">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>• {error}</li>
        ))}
      </ul>
    </div>
  );
}

// Result display card
function ResultCard({ title, value, subtitle, description, isValid = true }) {
  if (!isValid) return null;
  
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="text-3xl font-serif text-blue-600 mb-2">{value}</div>
      <div className="text-sm text-gray-700">
        <div><strong>{title}</strong> - {subtitle}</div>
        <div className="mt-2">{description}</div>
      </div>
    </div>
  );
}

// Clean bar labels for cash flows
const CleanBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  
  if (!value || Math.abs(value) < 0.01) return null;
  
  const isNegative = value < 0;
  const labelY = isNegative ? y + height + 20 : y - 10;
  const displayValue = isNegative ? `($${Math.abs(value).toFixed(2)})` : `$${value.toFixed(2)}`;
  
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill="#111827"
      fontSize="12"
      fontWeight="normal"
    >
      {displayValue}
    </text>
  );
};

// Calculate forward rates and cash flows
function calculateForwardRates({ s1, s2 }) {
  const r1 = s1 / 100;
  const r2 = s2 / 100;
  
  const forwardRate = (Math.pow(1 + r2, 2) / (1 + r1)) - 1;
  const forwardRatePct = forwardRate * 100;
  
  const strategy1Year1 = 100 * (1 + r1);
  const strategy1Year2 = strategy1Year1 * (1 + forwardRate);
  const strategy2Year2 = 100 * Math.pow(1 + r2, 2);
  
  const cashFlowData = [
    {
      period: 0,
      periodLabel: "0",
      strategy1Cash: -100,
      strategy2Cash: -100,
      twoYearLine: r2 * 100,
    },
    {
      period: 1,
      periodLabel: "1",
      strategy1Maturity: strategy1Year1,
      strategy1Reinvest: -strategy1Year1,
      strategy2Cash: 0,
      oneYearRate: r1 * 100,
      twoYearLine: r2 * 100,
    },
    {
      period: 2,
      periodLabel: "2", 
      strategy1Cash: strategy1Year2,
      strategy2Cash: strategy2Year2,
      forwardRate: forwardRatePct,
      twoYearLine: r2 * 100,
    }
  ];
  
  return {
    forwardRate: forwardRatePct,
    strategy1Final: strategy1Year2,
    strategy2Final: strategy2Year2,
    strategy1Year1Value: strategy1Year1,
    cashFlowData,
    isValid: r1 > 0 && r2 > 0 && r1 < 0.5 && r2 < 0.5
  };
}

function App() {
  // Default values for realistic example (6.3% and 8.0%)
  const [inputs, setInputs] = useState({
    s1: 6.3,
    s2: 8.0,
  });

  // Input validation
  const validateInputs = useCallback((inputs) => {
    const errors = {};
    
    if (!inputs.s1 || inputs.s1 < 0) {
      errors.s1 = "1-Year Spot Rate must be positive";
    } else if (inputs.s1 > 50) {
      errors.s1 = "1-Year Spot Rate cannot exceed 50%";
    }
    
    if (!inputs.s2 || inputs.s2 < 0) {
      errors.s2 = "2-Year Spot Rate must be positive";
    } else if (inputs.s2 > 50) {
      errors.s2 = "2-Year Spot Rate cannot exceed 50%";
    }
    
    if (inputs.s2 > 0 && inputs.s1 > 0 && inputs.s2 <= inputs.s1) {
      errors.yieldCurve = "2-Year rate should typically be higher than 1-year rate for normal yield curve";
    }
    
    return errors;
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  }, []);

  const inputErrors = validateInputs(inputs);
  const model = useMemo(() => {
    if (Object.keys(inputErrors).length > 0) return null;
    return calculateForwardRates(inputs);
  }, [inputs, inputErrors]);

  const formatPercentage = (v) => {
    if (v == null) return "-";
    return (v).toFixed(2) + "%";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <main className="max-w-7xl mx-auto space-y-6">
        
        {/* INPUTS CARD - Full Width at Top */}
        <Card title="Implied Forward Rate Calculator">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField 
              id="s1-input" 
              label="1-Year Spot Rate (%)" 
              helpText="Enter as percentage (e.g., 6.3 for 6.3%)"
              error={inputErrors.s1}
              required
            >
              <input
                id="s1-input"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={inputs.s1}
                onChange={(e) => handleInputChange('s1', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 ${
                  inputErrors.s1 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                aria-invalid={inputErrors.s1 ? 'true' : 'false'}
              />
            </FormField>

            <FormField 
              id="s2-input" 
              label="2-Year Spot Rate (%)" 
              helpText="Enter as percentage (e.g., 8.0 for 8.0%)"
              error={inputErrors.s2}
              required
            >
              <input
                id="s2-input"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={inputs.s2}
                onChange={(e) => handleInputChange('s2', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm px-3 py-2 ${
                  inputErrors.s2 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                aria-invalid={inputErrors.s2 ? 'true' : 'false'}
              />
            </FormField>
          </div>
          
          <ValidationMessage errors={inputErrors} />
        </Card>

        {/* RESULTS AND CHART - Two Column Layout */}
        {model && model.isValid && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* LEFT COLUMN - Results & Strategy Boxes */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Forward Rate Result */}
              <ResultCard
                title="Implied Forward Rate f(1,1)"
                value={`${model.forwardRate.toFixed(2)}%`}
                subtitle="the 1-year rate starting in year 1"
                description={
                  <div>
                    <div className="mb-2 text-xs">Formula: f(1,1) = [(1 + s₂)² ÷ (1 + s₁)] - 1</div>
                    <div className="font-mono text-xs bg-white px-2 py-1 rounded border">
                      f(1,1) = [(1 + {(inputs.s2/100).toFixed(3)})² ÷ (1 + {(inputs.s1/100).toFixed(3)})] - 1
                    </div>
                    <div className="text-xs mt-2 text-blue-600">✓ No arbitrage: both strategies yield ${model.strategy1Final.toFixed(2)}</div>
                  </div>
                }
                isValid={model.isValid}
              />

              {/* Strategy Comparison Boxes - Stacked */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-2 text-sm">One-Year Strategy</div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>Year 0 → 1: $100 @ {inputs.s1}% = ${model.strategy1Year1Value.toFixed(2)}</div>
                    <div>Year 1 → 2: ${model.strategy1Year1Value.toFixed(2)} @ {model.forwardRate.toFixed(2)}% = ${model.strategy1Final.toFixed(2)}</div>
                    <div className="font-semibold pt-1 border-t border-blue-300">Final: ${model.strategy1Final.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="font-semibold text-orange-800 mb-2 text-sm">Two-Year Strategy</div>
                  <div className="text-xs text-orange-700 space-y-1">
                    <div>Year 0 → 2: $100 @ {inputs.s2}% annually</div>
                    <div>Compound: (1 + {(inputs.s2/100).toFixed(3)})² = {Math.pow(1 + inputs.s2/100, 2).toFixed(4)}</div>
                    <div className="font-semibold pt-1 border-t border-orange-300">Final: ${model.strategy2Final.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
            </div>

            {/* RIGHT COLUMN - Large Chart */}
            <div className="lg:col-span-3">
              <Card title="Forward Rate Analysis: Cash Flows & Interest Rates" className="h-full">
                
                {/* Chart Legends */}
                <div className="mb-4 space-y-2">
                  <div className="text-sm text-gray-600 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center">
                      <span className="w-3 h-3 mr-2 rounded opacity-40" style={{backgroundColor: COLORS.positive}}></span>
                      One-Year: Initial/Final
                    </span>
                    <span className="inline-flex items-center">
                      <span className="w-3 h-3 mr-2 rounded opacity-40" style={{backgroundColor: COLORS.lightBlue}}></span>
                      One-Year: Maturity (+)
                    </span>
                    <span className="inline-flex items-center">
                      <span className="w-3 h-3 mr-2 rounded opacity-40" style={{backgroundColor: COLORS.dark}}></span>
                      One-Year: Reinvest (-)
                    </span>
                    <span className="inline-flex items-center">
                      <span className="w-3 h-3 mr-2 rounded opacity-40" style={{backgroundColor: COLORS.negative}}></span>
                      Two-Year Strategy
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 mr-2 rounded-full" style={{backgroundColor: COLORS.dark}}></span>
                      1Y Rate: {inputs.s1}%
                    </span>
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 mr-2 rounded-full" style={{backgroundColor: COLORS.purple}}></span>
                      Forward: {model.forwardRate.toFixed(2)}%
                    </span>
                    <span className="inline-flex items-center">
                      <span className="w-2 h-1 mr-2" style={{backgroundColor: COLORS.orange}}></span>
                      2Y Rate: {inputs.s2}%
                    </span>
                  </div>
                </div>

                {/* Large Chart */}
                <div className="h-[550px] relative" 
                     role="img" 
                     aria-labelledby="chart-title" 
                     aria-describedby="chart-description">
                  
                  <div className="sr-only">
                    <h3 id="chart-title">Forward Rate Analysis Chart</h3>
                    <p id="chart-description">
                      This chart compares two investment strategies. The One-Year Strategy invests for 1 year then reinvests at the forward rate of {model.forwardRate.toFixed(2)}%. The Two-Year Strategy invests for the full 2 years at {inputs.s2}%. Both yield ${model.strategy1Final.toFixed(2)}.
                    </p>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={model.cashFlowData}
                      margin={{ top: 60, right: 80, left: 40, bottom: 40 }}
                    >
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="2 2" />
                      
                      <ReferenceLine yAxisId="right" y={0} stroke="#374151" strokeWidth={2} />
                      
                      <XAxis 
                        dataKey="periodLabel" 
                        label={{ value: 'Year', position: 'insideBottom', offset: -10 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        label={{ value: "Interest Rates (%)", angle: -90, position: "insideLeft" }}
                        tickFormatter={(v) => `${v.toFixed(1)}%`}
                        domain={[0, Math.max(inputs.s1, inputs.s2, model.forwardRate) + 2]}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: "Cash Flows ($)", angle: -90, position: "insideRight" }}
                        tickFormatter={(v) => v === 0 ? "$0" : `$${v.toFixed(0)}`}
                        domain={[-120, Math.max(120, model.strategy2Final * 1.1)]}
                        ticks={[-100, -50, 0, 50, 100, Math.max(120, Math.ceil(model.strategy2Final / 10) * 10)]}
                      />
                      
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'periodLabel' || name === 'period') return [null, null];
                          if (name.includes('Rate') || name.includes('Line')) {
                            return [`${Number(value).toFixed(2)}%`, name];
                          }
                          return [`$${Number(value).toFixed(2)}`, name];
                        }}
                        labelFormatter={(label) => `Year: ${label}`}
                        contentStyle={{ fontSize: '12px' }}
                      />

                      {/* Cash Flow Bars */}
                      <Bar 
                        yAxisId="right" 
                        dataKey="strategy1Cash" 
                        fill={COLORS.positive}
                        fillOpacity={0.4}
                        name="One-Year: Initial/Final"
                        label={<CleanBarLabel />}
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="strategy1Maturity" 
                        fill={COLORS.lightBlue}
                        fillOpacity={0.4}
                        name="One-Year: Maturity (+)"
                        label={<CleanBarLabel />}
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="strategy1Reinvest" 
                        fill={COLORS.dark}
                        fillOpacity={0.4}
                        name="One-Year: Reinvest (-)"
                        label={<CleanBarLabel />}
                      />
                      <Bar 
                        yAxisId="right" 
                        dataKey="strategy2Cash" 
                        fill={COLORS.negative}
                        fillOpacity={0.4}
                        name="Two-Year Strategy"
                        label={<CleanBarLabel />}
                      />

                      {/* Interest Rate Visualization */}
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="twoYearLine" 
                        stroke={COLORS.orange} 
                        strokeWidth={3}
                        dot={false}
                        name={`2Y Rate (${inputs.s2}%)`}
                      />
                      
                      <Scatter yAxisId="left" dataKey="oneYearRate" fill={COLORS.dark} name="1Y Spot Rate" r={8}>
                        <LabelList 
                          dataKey="oneYearRate" 
                          position="top" 
                          formatter={(value) => value ? `${formatPercentage(value)}` : ''} 
                          fill="#111827" 
                          fontSize={12}
                        />
                      </Scatter>
                      
                      <Scatter yAxisId="left" dataKey="forwardRate" fill={COLORS.purple} name="Forward Rate" r={8}>
                        <LabelList 
                          dataKey="forwardRate" 
                          position="bottom" 
                          formatter={(value) => value ? `${formatPercentage(value)}` : ''} 
                          fill="#111827" 
                          fontSize={12}
                        />
                      </Scatter>
                    </ComposedChart>
                  </ResponsiveContainer>
                  
                  {/* 2Y Rate Label - Positioned in Chart */}
                  <div 
                    className="absolute top-16 left-40 bg-white px-2 py-1 rounded border shadow-sm"
                    style={{ 
                      borderColor: COLORS.orange,
                      color: COLORS.orange,
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-0.5"
                        style={{ backgroundColor: COLORS.orange }}
                      ></div>
                      2Y Rate: {inputs.s2}%
                    </div>
                  </div>
                </div>

                {/* Screen Reader Data Table */}
                <div className="sr-only">
                  <table>
                    <caption>Forward rate analysis data showing cash flows and rates for both strategies</caption>
                    <thead>
                      <tr>
                        <th scope="col">Year</th>
                        <th scope="col">One-Year Strategy</th>
                        <th scope="col">Two-Year Strategy</th>
                        <th scope="col">Interest Rates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.cashFlowData.map(row => (
                        <tr key={row.period}>
                          <th scope="row">{row.periodLabel}</th>
                          <td>
                            {row.strategy1Cash && `$${row.strategy1Cash.toFixed(2)}`}
                            {row.strategy1Maturity && ` Maturity: $${row.strategy1Maturity.toFixed(2)}`}
                            {row.strategy1Reinvest && ` Reinvest: $${row.strategy1Reinvest.toFixed(2)}`}
                          </td>
                          <td>{row.strategy2Cash ? `$${row.strategy2Cash.toFixed(2)}` : "No cash flow"}</td>
                          <td>
                            {row.oneYearRate && `1Y: ${row.oneYearRate.toFixed(2)}%`}
                            {row.forwardRate && `Forward: ${row.forwardRate.toFixed(2)}%`}
                            {row.twoYearLine && `2Y: ${row.twoYearLine.toFixed(2)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </Card>
            </div>
          </div>
        )}


      </main>
    </div>
  );
}

export default App;
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
  Legend,
  Scatter,
  LabelList,
  ReferenceLine,
} from "recharts";

// Accessibility-focused color tokens (WCAG compliant + colorblind friendly)
const COLORS = {
  primary: "#4476FF",        // Blue - safe for all colorblind types
  dark: "#1e40af",          // Dark blue - high contrast
  positive: "#2563eb",      // Blue instead of green - colorblind safe
  negative: "#ea580c",      // Orange instead of red - colorblind safe  
  purple: "#7c3aed",        // Purple - distinct from other colors
  orange: "#ea580c",        // Orange - pairs well with blue
  lightBlue: "#3b82f6",     // Light blue for variety
  darkOrange: "#c2410c",    // Dark orange for contrast
};

// Shared Components
function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-5 border border-gray-100 ${className}`}>
      <h2 className="font-serif text-xl text-slate-800 mb-3">{title}</h2>
      <div className="font-sans text-sm text-black/80">{children}</div>
    </div>
  );
}

function FormField({ id, label, children, error, helpText, required = false }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        {helpText && <span className="text-gray-500 text-xs font-normal ml-2">({helpText})</span>}
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

function ResultCard({ title, value, subtitle, description, isValid = true }) {
  if (!isValid) return null;
  
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <div className="text-4xl font-serif text-blue-600 mb-2">{value}</div>
      <div className="text-sm text-gray-700">
        <div><strong>{title}</strong> - {subtitle}</div>
        <div className="mt-1">{description}</div>
      </div>
    </div>
  );
}

// Clean label component for cash flows
const CleanBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  
  if (!value || Math.abs(value) < 0.01) return null;
  
  const isNegative = value < 0;
  const labelY = isNegative ? y + height + 20 : y - 10;
  
  // Format with dollar sign and parentheses for negatives
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

function calculateForwardRates({ s1, s2 }) {
  const r1 = s1 / 100; // Convert percentage to decimal
  const r2 = s2 / 100;
  
  // Calculate implied forward rate: f(1,1) = [(1 + s2)^2 / (1 + s1)] - 1
  const forwardRate = (Math.pow(1 + r2, 2) / (1 + r1)) - 1;
  const forwardRatePct = forwardRate * 100;
  
  // Strategy 1: Sequential one-year investments
  const strategy1Year1 = 100 * (1 + r1); // First year investment
  const strategy1Year2 = strategy1Year1 * (1 + forwardRate); // Reinvest at forward rate
  
  // Strategy 2: Direct two-year investment  
  const strategy2Year2 = 100 * Math.pow(1 + r2, 2);
  
  // Generate cash flow data for visualization
  const cashFlowData = [
    {
      period: 0,
      periodLabel: "0",
      strategy1Cash: -100,        // Initial investment
      strategy2Cash: -100,        // Initial investment
      twoYearLine: r2 * 100,
      // Add a special data point for 2Y Rate label
      labelPoint: { x: 1.2, y: r2 * 100, label: `2Y Rate: ${s2}%` }
    },
    {
      period: 1,
      periodLabel: "1",
      strategy1Maturity: strategy1Year1,    // First bond matures
      strategy1Reinvest: -strategy1Year1,   // Reinvest proceeds  
      strategy2Cash: 0,                     // No cash flow
      oneYearRate: r1 * 100,
      twoYearLine: r2 * 100,
    },
    {
      period: 2,
      periodLabel: "2", 
      strategy1Cash: strategy1Year2,  // Second bond matures
      strategy2Cash: strategy2Year2,  // Two-Year bond matures  
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

// Custom component to add the 2Y Rate label - this will definitely show
const TwoYearRateLabel = ({ chartWidth, chartHeight, s2, color }) => {
  const labelX = chartWidth * 0.75; // 75% across the chart
  const labelY = chartHeight * 0.2;  // 20% down from top
  
  return (
    <g>
      {/* Small dot */}
      <circle 
        cx={chartWidth * 0.65} 
        cy={chartHeight * 0.25} 
        r="4" 
        fill={color} 
        stroke="white" 
        strokeWidth="2"
      />
      {/* Leader line */}
      <line 
        x1={chartWidth * 0.65} 
        y1={chartHeight * 0.25}
        x2={labelX - 10} 
        y2={labelY}
        stroke={color} 
        strokeWidth="2" 
        strokeDasharray="3 3"
      />
      {/* Label text */}
      <text 
        x={labelX} 
        y={labelY} 
        fill={color} 
        fontSize="12" 
        fontWeight="bold"
      >
        2Y Rate: {s2}%
      </text>
    </g>
  );
};

function App() {
  const [inputs, setInputs] = useState({
    s1: 6.3, // 1-year spot rate percentage
    s2: 8.0, // 2-year spot rate percentage
  });

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
      <main className="max-w-7xl mx-auto">
        
        <Card title="Implied Forward Rate Calculator">
          
          {/* Enhanced Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <FormField 
              id="s1-input" 
              label="1-Year Spot Rate (%)" 
              helpText="0-50"
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
                aria-describedby={inputErrors.s1 ? "s1-input-error" : "s1-help"}
                aria-invalid={inputErrors.s1 ? 'true' : 'false'}
              />
              <p id="s1-help" className="text-xs text-gray-600 mt-1">
                Enter as percentage (e.g., 5 for 5%)
              </p>
            </FormField>

            <FormField 
              id="s2-input" 
              label="2-Year Spot Rate (%)" 
              helpText="0-50"
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
                aria-describedby={inputErrors.s2 ? "s2-input-error" : "s2-help"}
                aria-invalid={inputErrors.s2 ? 'true' : 'false'}
              />
              <p id="s2-help" className="text-xs text-gray-600 mt-1">
                Enter as percentage (e.g., 6 for 6%)
              </p>
            </FormField>
          </div>

          <ValidationMessage errors={inputErrors} />

          {/* Enhanced Results Section */}
          {model && model.isValid && (
            <>
              <ResultCard
                title="Implied Forward Rate f(1,1)"
                value={`${model.forwardRate.toFixed(2)}%`}
                subtitle="the 1-year rate starting in year 1"
                description={
                  <div>
                    <div className="mb-2">Formula: f(1,1) = [(1 + s₂)² ÷ (1 + s₁)] - 1</div>
                    <div className="font-mono text-base bg-white px-2 py-1 rounded border">
                      f(1,1) = [(1 + {(inputs.s2/100).toFixed(3)})² ÷ (1 + {(inputs.s1/100).toFixed(3)})] - 1
                    </div>
                    <div className="text-xs mt-1 text-green-600">✓ No arbitrage: both strategies yield ${model.strategy1Final.toFixed(2)}</div>
                  </div>
                }
                isValid={model.isValid}
              />

              {/* Strategy Comparison Boxes with Colorblind-Friendly Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-2">One-Year Strategy</div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Year 0 → 1: $100 @ {inputs.s1}% = ${model.strategy1Year1Value.toFixed(2)}</div>
                    <div>Year 1 → 2: ${model.strategy1Year1Value.toFixed(2)} @ {model.forwardRate.toFixed(2)}% = ${model.strategy1Final.toFixed(2)}</div>
                    <div className="font-semibold pt-1 border-t border-blue-300">Final Value: ${model.strategy1Final.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="font-semibold text-orange-800 mb-2">Two-Year Strategy</div>
                  <div className="text-sm text-orange-700 space-y-1">
                    <div>Year 0 → 2: $100 @ {inputs.s2}% annually</div>
                    <div>Compound return: (1 + {(inputs.s2/100).toFixed(3)})² = {Math.pow(1 + inputs.s2/100, 2).toFixed(4)}</div>
                    <div className="font-semibold pt-1 border-t border-orange-300">Final Value: ${model.strategy2Final.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Enhanced Chart */}
              <div className="mb-6">
                <h3 className="font-serif text-lg text-slate-700 mb-4" id="chart-title">
                  Forward Rate Analysis: Cash Flows & Interest Rates
                </h3>
                
                {/* Chart Legend with Colorblind-Friendly Colors */}
                <div className="mb-4 text-sm text-gray-600 flex items-center gap-4 flex-wrap">
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
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-blue-700 mr-2 rounded-full"></span>
                    1Y Rate: {inputs.s1}%
                  </span>
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-purple-700 mr-2 rounded-full"></span>
                    Forward: {model.forwardRate.toFixed(2)}%
                  </span>
                  <span className="inline-flex items-center">
                    <span className="w-2 h-1 bg-orange-600 mr-2"></span>
                    2Y Rate: {inputs.s2}%
                  </span>
                </div>

                <div className="h-[500px] relative" 
                     role="img" 
                     aria-labelledby="chart-title" 
                     aria-describedby="chart-description">
                  
                  <div className="sr-only">
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
                      
                      {/* Zero reference line */}
                      <ReferenceLine 
                        yAxisId="right" 
                        y={0} 
                        stroke="#374151" 
                        strokeWidth={2} 
                      />
                      
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
                          if (name.includes('Rate') || name.includes('Line')) {
                            return [`${Number(value).toFixed(2)}%`, name];
                          }
                          return [`$${Number(value).toFixed(2)}`, name];
                        }}
                        labelFormatter={(label) => `Year: ${label}`}
                        contentStyle={{ fontSize: '12px' }}
                      />

                      {/* Cash Flow Bars with Colorblind-Friendly Blue/Orange Palette */}
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

                      {/* Interest Rate Lines and Points */}
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="twoYearLine" 
                        stroke={COLORS.orange} 
                        strokeWidth={3}
                        dot={false}
                        name={`2Y Rate (${inputs.s2}%)`}
                      />
                      
                      <Scatter yAxisId="left" dataKey="oneYearRate" fill="#1d4ed8" name="1Y Spot Rate" r={8}>
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
                  
                  {/* Absolute positioned 2Y Rate label in top-left - this WILL be visible */}
                  <div 
                    className="absolute top-11 left-40 bg-white px-2 py-1 rounded border shadow-sm"
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
              </div>

              {/* Screen Reader Data Table */}
              <div className="sr-only">
                <table>
                  <caption>Forward rate analysis showing cash flows and rates for both investment strategies</caption>
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      <th scope="col">One-Year Strategy Cash Flow</th>
                      <th scope="col">Two-Year Strategy Cash Flow</th>
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

            </>
          )}
        </Card>

        {/* Educational Context */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold text-blue-800 mb-2">Understanding Forward Rates</h2>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>No-Arbitrage Principle:</strong> Both investment strategies must yield identical returns to prevent risk-free profit opportunities.</p>
            <p><strong>Forward Rate Formula:</strong> f(1,1) = [(1 + s₂)² ÷ (1 + s₁)] - 1</p>
            <p><strong>Market Interpretation:</strong> The forward rate represents the market's expectation for the 1-year rate starting in year 1.</p>
            <p className="text-xs mt-2 text-blue-600">This model assumes no transaction costs, perfect liquidity, and no default risk.</p>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
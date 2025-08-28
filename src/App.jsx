import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-5 border border-gray-100 ${className}`}>
      <h2 className="font-serif text-xl text-slate-800 mb-3">{title}</h2>
      <div className="font-sans text-sm text-black/80">{children}</div>
    </div>
  );
}

function calculateForwardRates({ oneYearRate, twoYearRate }) {
  const r1 = oneYearRate / 100; // Convert percentage to decimal
  const r2 = twoYearRate / 100;
  
  // Calculate implied forward rate: (1 + r2)^2 = (1 + r1) × (1 + f1,1)
  // Therefore: f1,1 = [(1 + r2)^2 / (1 + r1)] - 1
  const forwardRate = (Math.pow(1 + r2, 2) / (1 + r1)) - 1;
  const forwardRatePct = forwardRate * 100;
  
  // Strategy 1: Sequential one-year investments
  const strategy1Year1 = 100 * (1 + r1); // First year investment
  const strategy1Year2 = strategy1Year1 * (1 + forwardRate); // Reinvest at forward rate
  
  // Strategy 2: Direct two-year investment  
  const strategy2Year2 = 100 * Math.pow(1 + r2, 2);
  
  // Verify no arbitrage (should be equal)
  const arbitrageDiff = Math.abs(strategy1Year2 - strategy2Year2);
  const noArbitrage = arbitrageDiff < 0.001;
  
  // Generate cash flow data for visualization - fixed structure
  const cashFlowData = [
    // t=0: Initial investments
    {
      period: 0,
      periodLabel: "0",
      subsequentInvestment: -100,        // Green: Initial investment
      twoYearInvestment: -100,           // Blue: Initial investment
      oneYearBondYield: null,
      impliedForwardRate: null,
      twoYearLine: r2 * 100,
    },
    // t=1: First bond matures and reinvestment
    {
      period: 1, 
      periodLabel: "1",
      subsequentMaturity: strategy1Year1,    // Green: +106.30 First bond matures
      subsequentReinvestment: -strategy1Year1, // Green: -106.30 Reinvest proceeds  
      twoYearInvestment: 0,                  // Blue: No cash flow (0, not null)
      oneYearBondYield: r1 * 100,
      impliedForwardRate: null,
      twoYearLine: r2 * 100,
    },
    // t=2: Final maturity
    {
      period: 2,
      periodLabel: "2", 
      subsequentInvestment: strategy1Year2,  // Green: Second bond matures
      twoYearInvestment: strategy2Year2,     // Blue: Two-year bond matures  
      oneYearBondYield: null,
      impliedForwardRate: forwardRatePct,
      twoYearLine: r2 * 100,
    }
  ];
  
  return {
    forwardRate: forwardRatePct,
    strategy1Final: strategy1Year2,
    strategy2Final: strategy2Year2,
    strategy1Year1Value: strategy1Year1,
    arbitrageDiff,
    noArbitrage,
    cashFlowData,
    isValid: r1 > 0 && r2 > 0 && r1 < 0.5 && r2 < 0.5 // Reasonable rate bounds
  };
}

// Custom label component that shows values above/below bars
const CustomLabel = (props) => {
  const { x, y, width, height, value } = props;
  
  if (!value || Math.abs(value) < 0.01) return null;
  
  const isNegative = value < 0;
  const labelY = isNegative ? y + height + 15 : y - 8;
  
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill="#000"
      fontSize="11"
      fontWeight="bold"
    >
      {isNegative ? '-' : ''}${Math.abs(value).toFixed(2)}
    </text>
  );
};

export default function App() {
  const [inputs, setInputs] = useState({ 
    oneYearRate: 6.30,
    twoYearRate: 8.00
  });
  
  // Input validation
  const validateInputs = (inputs) => {
    const errors = [];
    if (inputs.oneYearRate < 0 || inputs.oneYearRate > 50) errors.push("One-Year Rate must be between 0% and 50%");
    if (inputs.twoYearRate < 0 || inputs.twoYearRate > 50) errors.push("Two-Year Rate must be between 0% and 50%");
    if (inputs.twoYearRate <= inputs.oneYearRate) errors.push("Two-Year Rate should typically be higher than One-Year Rate for normal yield curve");
    return errors;
  };
  
  const inputErrors = validateInputs(inputs);
  const model = useMemo(() => {
    if (inputErrors.length > 0) return null;
    return calculateForwardRates(inputs);
  }, [inputs, inputErrors]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-slate-800 mb-2">Implied Forward Interest Rates</h1>
          <p className="text-gray-600">CFA Level 1 • Quantitative Methods • Learning Module 2</p>
        </div>

        {/* Forward Rate Model Inputs & Results */}
        <Card title="Implied Forward Interest Rates" className="w-full">
          
          {/* Input Validation Errors */}
          {inputErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">Please correct the following:</p>
              <ul className="text-red-600 text-sm mt-1 list-disc list-inside">
                {inputErrors.map((error, i) => <li key={i}>{error}</li>)}
              </ul>
            </div>
          )}
          
          {/* Inputs Section */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <label className="flex flex-col">
              One-Year Bond Yield (%) <span className="text-gray-500 text-xs">(0 - 50)</span>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                max="50"
                value={inputs.oneYearRate}
                onChange={(e) => setInputs(v => ({ ...v, oneYearRate: +e.target.value }))}
                className="mt-1 rounded-lg border px-3 py-2" 
              />
            </label>
            <label className="flex flex-col">
              Two-Year Bond Yield (%) <span className="text-gray-500 text-xs">(0 - 50)</span>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                max="50"
                value={inputs.twoYearRate}
                onChange={(e) => setInputs(v => ({ ...v, twoYearRate: +e.target.value }))}
                className="mt-1 rounded-lg border px-3 py-2" 
              />
            </label>
          </div>

          {/* Forward Rate Results */}
          {model && model.isValid && (
            <>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-4xl font-serif text-blue-600 mb-2">{model.forwardRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-700">
                  <div><strong>One-Year Forward Rate (f₁,₁)</strong> - the one-year rate starting in year 1</div>
                  <div className="mt-1">Formula: f₁,₁ = [(1 + r₂)² ÷ (1 + r₁)] - 1</div>
                  <div className="text-xs mt-2 text-green-600">
                    ✓ No-arbitrage condition satisfied (both strategies yield ${model.strategy1Final.toFixed(2)})
                  </div>
                </div>
              </div>

              {/* Strategy Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">Subsequent One-Year Investments</div>
                  <div className="text-sm text-green-700 mt-1">
                    Year 1: $100 → ${model.strategy1Year1Value.toFixed(2)}<br/>
                    Year 2: ${model.strategy1Year1Value.toFixed(2)} → ${model.strategy1Final.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="font-medium text-purple-800">Two-Year Investment</div>
                  <div className="text-sm text-purple-700 mt-1">
                    $100 → ${model.strategy2Final.toFixed(2)}<br/>
                    @ {inputs.twoYearRate}% annually
                  </div>
                </div>
              </div>

              {/* Chart Legend - updated colors */}
              <div className="mb-4 text-sm text-gray-600 flex items-center gap-6 flex-wrap">
                <span className="inline-flex items-center">
                  <span className="w-4 h-4 bg-emerald-600 mr-2 rounded"></span>
                  Subsequent One-Year Investments
                </span>
                <span className="inline-flex items-center">
                  <span className="w-4 h-4 bg-blue-600 mr-2 rounded"></span>
                  Two-Year Investment
                </span>
                <span className="inline-flex items-center">
                  <span className="w-3 h-3 bg-blue-700 mr-2 rounded-full"></span>
                  One-Year Bond Yield: {inputs.oneYearRate.toFixed(2)}%
                </span>
                <span className="inline-flex items-center">
                  <span className="w-3 h-3 bg-purple-700 mr-2 rounded-full"></span>
                  Implied Forward Rate: {model.forwardRate.toFixed(2)}%
                </span>
                <span className="inline-flex items-center">
                  <span className="w-3 h-1 bg-orange-600 mr-2"></span>
                  Two-Year Bond Yield: {inputs.twoYearRate.toFixed(2)}%
                </span>
              </div>

              {/* Cash Flow Chart */}
              <div className="h-96 relative">
                <div className="text-center text-sm text-gray-600 mb-2 font-medium">
                  Implied Forward Rate & Investment Cash Flows (in USD)
                </div>
                
                {/* Rate Labels positioned next to dots - dynamically calculated */}
                {(() => {
                  const maxRate = Math.max(15, model.forwardRate * 1.2);
                  const chartHeight = 384 - 40; // Total height minus top/bottom margins
                  const chartWidth = "100%";
                  
                  // Calculate vertical positions based on rate values (inverted because chart 0 is at bottom)
                  const oneYearPos = (1 - inputs.oneYearRate / maxRate) * 100;
                  const forwardPos = (1 - model.forwardRate / maxRate) * 100;  
                  const twoYearPos = (1 - inputs.twoYearRate / maxRate) * 100;
                  
                  return (
                    <>
                      {/* One-Year Bond Yield label at year 1 - perfectly positioned */}
                      <div 
                        className="absolute bg-blue-100 text-blue-600 px-1 py-0.5 rounded text-xs font-semibold z-10"
                        style={{
                          left: '42%', // Perfect alignment with the blue dot
                          top: `${Math.max(8, Math.min(85, oneYearPos))}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {inputs.oneYearRate.toFixed(2)}%
                      </div>
                      
                      {/* Implied Forward Rate label at year 2 - improved contrast */}
                      <div 
                        className="absolute bg-purple-50 text-purple-800 px-1 py-0.5 rounded text-xs font-semibold z-10"
                        style={{
                          left: '71%', // Year 2 position  
                          top: `${Math.max(8, Math.min(85, forwardPos))}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {model.forwardRate.toFixed(2)}%
                      </div>
                      
                      {/* Two-Year Bond Yield label on line - improved contrast */}
                      <div 
                        className="absolute bg-orange-50 text-orange-800 px-1 py-0.5 rounded text-xs font-semibold z-10"
                        style={{
                          left: '18%', // Moved from 12% to 18% - more inside the chart
                          top: `${Math.max(3, Math.min(80, twoYearPos - 5))}%`, // Just above the line
                          transform: 'translate(0, -50%)'
                        }}
                      >
                        {inputs.twoYearRate.toFixed(2)}%
                      </div>
                    </>
                  );
                })()}
                
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={model.cashFlowData}
                    margin={{ top: 20, right: 100, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="periodLabel" 
                      label={{ value: 'Years', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Rates (%)', angle: -90, position: 'insideLeft', style: { fill: '#7c3aed', textAnchor: 'middle' } }}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                      domain={[0, Math.max(15, model.forwardRate * 1.2)]}
                      tick={{ fill: '#7c3aed' }}
                      axisLine={{ stroke: '#7c3aed' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Cash Flows ($)', angle: 90, position: 'insideRight' }}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'forwardRateLine' || name === 'twoYearLine') return [`${Number(value).toFixed(2)}%`, name];
                        return [`${Number(value).toFixed(2)}`, name];
                      }}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    
                    {/* Subsequent One-Year Investment Cash Flows - improved contrast */}
                    <Bar 
                      yAxisId="right" 
                      dataKey="subsequentInvestment" 
                      fill="#059669" 
                      name="Subsequent One-Year Investments"
                      label={CustomLabel}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="subsequentMaturity" 
                      fill="#059669" 
                      name="Bond Maturity"
                      label={CustomLabel}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="subsequentReinvestment" 
                      fill="#059669" 
                      name="Reinvestment"
                      label={CustomLabel}
                    />
                    
                    {/* Two-Year Investment Cash Flows - improved contrast */}
                    <Bar 
                      yAxisId="right" 
                      dataKey="twoYearInvestment" 
                      fill="#2563eb" 
                      name="Two-Year Investment"
                      label={CustomLabel}
                    />
                    
                    {/* Two-Year Bond Yield Line - improved contrast */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="twoYearLine" 
                      stroke="#ea580c" 
                      strokeWidth={2}
                      dot={false}
                      name="Two-Year Bond Yield"
                    />
                    
                    {/* One-Year Bond Yield Dot (year 1 only) - already good contrast */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="oneYearBondYield" 
                      stroke="#1d4ed8" 
                      strokeWidth={0}
                      dot={{ fill: '#1d4ed8', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                      name="One-Year Bond Yield"
                    />
                    
                    {/* Implied Forward Rate Dot (year 2 only) - improved contrast */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="impliedForwardRate" 
                      stroke="#6d28d9" 
                      strokeWidth={0}
                      dot={{ fill: '#6d28d9', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                      name="Implied Forward Rate"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Educational Note */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <strong>Cash Flow Additivity Principle:</strong> Under no-arbitrage conditions, both investment 
                strategies must yield identical returns of ${model.strategy1Final.toFixed(2)}. At year 1, the subsequent 
                one-year strategy shows two simultaneous cash flows: +${model.strategy1Year1Value.toFixed(2)} 
                (first bond matures) and -${model.strategy1Year1Value.toFixed(2)} (immediate reinvestment at the 
                forward rate). This ensures no risk-free arbitrage opportunities exist in bond markets.
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
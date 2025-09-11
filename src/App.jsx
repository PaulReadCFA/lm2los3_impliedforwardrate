import { useMemo, useState, useCallback } from "react";
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

export default function ForwardRatesCalculator() {
  const [inputs, setInputs] = useState({ 
    oneYearRate: 6.30,
    twoYearRate: 8.00
  });
  
  const validateInputs = useCallback((inputs) => {
    const errors = {};
    
    if (!inputs.oneYearRate || inputs.oneYearRate < 0) {
      errors.oneYearRate = "One-year rate must be positive";
    } else if (inputs.oneYearRate > 50) {
      errors.oneYearRate = "One-year rate cannot exceed 50%";
    }
    
    if (!inputs.twoYearRate || inputs.twoYearRate < 0) {
      errors.twoYearRate = "Two-year rate must be positive";
    } else if (inputs.twoYearRate > 50) {
      errors.twoYearRate = "Two-year rate cannot exceed 50%";
    }
    
    if (inputs.twoYearRate > 0 && inputs.oneYearRate > 0 && inputs.twoYearRate <= inputs.oneYearRate) {
      errors.yieldCurve = "Two-year rate should typically be higher than one-year rate for normal yield curve";
    }
    
    return errors;
  }, []);
  
  const handleInputChange = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: +value }));
  }, []);
  
  const inputErrors = validateInputs(inputs);
  const model = useMemo(() => {
    if (Object.keys(inputErrors).length > 0) return null;
    return calculateForwardRates(inputs);
  }, [inputs, inputErrors]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-6">


        {/* Forward Rate Model Inputs & Results */}
        <Card title="Implied Forward Interest Rates Analysis">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <FormField 
              id="one-year-rate" 
              label="One-Year Bond Yield (%)" 
              helpText="0 - 50%"
              error={inputErrors.oneYearRate}
              required
            >
              <input
                id="one-year-rate"
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={inputs.oneYearRate}
                onChange={(e) => handleInputChange('oneYearRate', e.target.value)}
                className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={inputErrors.oneYearRate ? "one-year-rate-error" : undefined}
                aria-invalid={inputErrors.oneYearRate ? 'true' : 'false'}
              />
            </FormField>

            <FormField 
              id="two-year-rate" 
              label="Two-Year Bond Yield (%)" 
              helpText="0 - 50%"
              error={inputErrors.twoYearRate}
              required
            >
              <input
                id="two-year-rate"
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={inputs.twoYearRate}
                onChange={(e) => handleInputChange('twoYearRate', e.target.value)}
                className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={inputErrors.twoYearRate ? "two-year-rate-error" : undefined}
                aria-invalid={inputErrors.twoYearRate ? 'true' : 'false'}
              />
            </FormField>
          </div>

          <ValidationMessage errors={inputErrors} />

          {/* Forward Rate Results */}
          {model && model.isValid && (
            <>
              <ResultCard
                title="One-Year Forward Rate (f₁,₁)"
                value={`${model.forwardRate.toFixed(2)}%`}
                subtitle="the one-year rate starting in year 1"
                description={`Formula: f₁,₁ = [(1 + r₂)² ÷ (1 + r₁)] - 1 | ✓ No-arbitrage condition satisfied (both strategies yield $${model.strategy1Final.toFixed(2)})`}
                isValid={model.isValid}
              />

              {/* Strategy Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

              {/* Screen Reader Data Table */}
              <div className="sr-only">
                <table>
                  <caption>Forward rates investment strategy cash flows showing both investment approaches over 3 years</caption>
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      <th scope="col">Subsequent Strategy</th>
                      <th scope="col">Two-Year Strategy</th>
                      <th scope="col">Interest Rates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.cashFlowData.map(row => (
                      <tr key={row.period}>
                        <th scope="row">{row.periodLabel}</th>
                        <td>
                          {row.period === 0 && "Initial investment: ($100.00)"}
                          {row.period === 1 && `Maturity: $${row.subsequentMaturity.toFixed(2)}, Reinvestment: ($${Math.abs(row.subsequentReinvestment).toFixed(2)})`}
                          {row.period === 2 && `Final maturity: $${row.subsequentInvestment.toFixed(2)}`}
                        </td>
                        <td>
                          {row.period === 0 && "Initial investment: ($100.00)"}
                          {row.period === 1 && "No cash flow"}
                          {row.period === 2 && `Final maturity: $${row.twoYearInvestment.toFixed(2)}`}
                        </td>
                        <td>
                          {row.period === 0 && `Two-year rate: ${inputs.twoYearRate.toFixed(2)}%`}
                          {row.period === 1 && `One-year rate: ${inputs.oneYearRate.toFixed(2)}%`}
                          {row.period === 2 && `Forward rate: ${model.forwardRate.toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chart Legend */}
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

              {/* Cash Flow Chart - Simplified */}
              <div className="h-96 relative" 
                   role="img" 
                   aria-labelledby="forward-rates-chart-title" 
                   aria-describedby="forward-rates-chart-description">
                
                <div className="sr-only">
                  <h3 id="forward-rates-chart-title">Forward Rates Investment Strategy Chart</h3>
                  <p id="forward-rates-chart-description">
                    Combined bar and line chart showing cash flows for two investment strategies: 
                    sequential one-year investments vs direct two-year investment, with implied forward rate of {model.forwardRate.toFixed(2)}%
                  </p>
                </div>

                <div className="text-center text-sm text-gray-600 mb-2 font-medium">
                  Forward Rate Strategy Comparison - Cash Flows & Key Rates
                </div>
                
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={model.cashFlowData}
                    margin={{ top: 20, right: 50, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="periodLabel" 
                      label={{ value: 'Years', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Rates', angle: -90, position: 'insideLeft', style: { fill: '#7c3aed', textAnchor: 'middle' } }}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                      domain={[0, Math.max(15, model.forwardRate * 1.2)]}
                      tick={{ fill: '#7c3aed' }}
                      axisLine={{ stroke: '#7c3aed' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Cash Flows', angle: 90, position: 'insideRight' }}
                      tickFormatter={(value) => `$${Math.round(value)}`}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        if (name.includes('Rate') || name.includes('Line')) {
                          return [`${Number(value).toFixed(2)}%`, name];
                        }
                        return [`${Number(value).toFixed(2)}`, name];
                      }}
                      labelFormatter={(label) => `Year ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    
                    {/* Sequential Strategy Cash Flows */}
                    <Bar 
                      yAxisId="right" 
                      dataKey="subsequentInvestment" 
                      fill="#059669" 
                      name="Sequential Strategy"
                      label={CustomLabel}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="subsequentMaturity" 
                      fill="#059669" 
                      name="Maturity Payment"
                      label={CustomLabel}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="subsequentReinvestment" 
                      fill="#047857" 
                      name="Reinvestment"
                      label={CustomLabel}
                    />
                    
                    {/* Two-Year Strategy Cash Flows */}
                    <Bar 
                      yAxisId="right" 
                      dataKey="twoYearInvestment" 
                      fill="#2563eb" 
                      name="Two-Year Strategy"
                      label={CustomLabel}
                    />
                    
                    {/* Key Rate Line - Two-year rate baseline */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="twoYearLine" 
                      stroke="#ea580c" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={false}
                      name={`Two-Year Rate (${inputs.twoYearRate.toFixed(2)}%)`}
                    />
                    
                    {/* One-Year Rate Indicator - At year 1 */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="oneYearBondYield" 
                      stroke="#1d4ed8" 
                      strokeWidth={0}
                      dot={{ fill: '#1d4ed8', strokeWidth: 3, r: 6 }}
                      connectNulls={false}
                      name={`One-Year Rate (${inputs.oneYearRate.toFixed(2)}%)`}
                    />
                    
                    {/* Forward Rate Indicator - Only at year 2 */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="impliedForwardRate" 
                      stroke="#7c3aed" 
                      strokeWidth={0}
                      dot={{ fill: '#7c3aed', strokeWidth: 3, r: 6 }}
                      connectNulls={false}
                      name={`Forward Rate (${model.forwardRate.toFixed(2)}%)`}
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

        {/* Educational Footer */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold text-blue-800 mb-2">Educational Context</h2>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Forward Rate Theory:</strong> The market-implied rate for future borrowing/lending periods</p>
            <p><strong>No-Arbitrage Principle:</strong> Both investment strategies must yield identical returns</p>
            <p><strong>Yield Curve Analysis:</strong> Forward rates reveal market expectations about future interest rates</p>
            <p className="text-xs mt-2">This model assumes no transaction costs, perfect liquidity, and no default risk. Real markets may show slight deviations due to these factors.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
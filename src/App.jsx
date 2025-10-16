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
  Cell
} from "recharts";

// CFA-branded color palette
const COLORS = {
  primary: "#4476ff",
  dark: "#06005a",
  darkAlt: "#38337b",
  positive: "#6991ff",
  negative: "#ea792d",
  purple: "#7a46ff",
  purpleAlt: "#50037f",
  lightBlue: "#4476ff",
  orange: "#ea792d",
  darkText: "#06005a",
};

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-5 border border-gray-100 ${className}`}>
      <h2 className="font-serif text-xl text-slate-800 mb-3">{title}</h2>
      <div className="font-sans text-sm text-black/80">{children}</div>
    </div>
  );
}

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
        >
          {children}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}

function ValidationMessage({ errors }) {
  if (!errors || Object.keys(errors).length === 0) return null;
  
  return (
    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <h3 className="text-red-800 font-semibold text-sm mb-2">Please correct the following:</h3>
      <ul className="text-red-800 text-sm space-y-1">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>• {error}</li>
        ))}
      </ul>
    </div>
  );
}

function CustomBarLabel(props) {
  const { x, y, width, height, value } = props;
  
  if (!value || Math.abs(value) < 0.0001) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 30}
      textAnchor="middle"
      fill={COLORS.darkText}
      fontSize="11"
      fontWeight="bold"
    >
      {value.toFixed(4)}
    </text>
  );
}

function calculateForwardExchangeRate({ spotRate, domesticRate, foreignRate }) {
  const r_d = domesticRate / 100;
  const r_f = foreignRate / 100;
  const initialInvestment = 1000;
  
  const forwardRate = spotRate * Math.exp(r_f - r_d);
  
  const domesticEndingValue = initialInvestment * (1 + r_d);
  const foreignCurrencyAmount = initialInvestment * spotRate;
  const foreignEndingValue = foreignCurrencyAmount * (1 + r_f);
  const domesticEquivalent = foreignEndingValue / forwardRate;
  
  const arbitrageDiff = Math.abs(domesticEndingValue - domesticEquivalent);
  const noArbitrage = arbitrageDiff < 0.01;
  
  const chartData = [
    {
      name: "t = 0",
      exchangeRate: spotRate,
      domesticRate: domesticRate,
      foreignRate: foreignRate,
      type: "Spot Rate"
    },
    {
      name: "t = 1", 
      exchangeRate: forwardRate,
      domesticRate: domesticRate,
      foreignRate: foreignRate,
      type: "Forward Rate"
    }
  ];
  
  return {
    forwardRate,
    domesticEndingValue,
    foreignEndingValue,
    domesticEquivalent,
    arbitrageDiff,
    noArbitrage,
    chartData,
    isValid: spotRate > 0 && r_d > -1 && r_f > -1
  };
}

function ResultsSection({ model, inputs }) {
  return (
    <div className="space-y-6">
      {/* Forward Rate Result */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-3xl font-serif text-blue-600 mb-2">{model.forwardRate.toFixed(4)}</div>
        <div className="text-sm text-gray-700">
          <div><strong>Implied Forward Exchange Rate</strong> - the no-arbitrage forward rate</div>
          <div className="mt-2">
            <div className="mb-2 text-xs">Using Covered Interest Rate Parity:</div>
            <div className="font-mono text-xs bg-white px-2 py-1 rounded border">
              F = S × e<sup>(r<sub>f</sub> - r<sub>d</sub>)</sup>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Comparison */}
      <div className="space-y-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="font-semibold text-green-800 mb-2 text-sm">Domestic Investment</div>
          <div className="text-xs text-green-700 space-y-1">
            <div>Invest $1,000 at {inputs.domesticRate.toFixed(3)}%</div>
            <div className="font-semibold pt-1 border-t border-green-300">Final: ${model.domesticEndingValue.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="font-semibold text-purple-800 mb-2 text-sm">Foreign Investment</div>
          <div className="text-xs text-purple-700 space-y-1">
            <div>Convert → invest at {inputs.foreignRate.toFixed(3)}% → convert back</div>
            <div className="font-semibold pt-1 border-t border-purple-300">Final: ${model.domesticEquivalent.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForwardExchangeChart({ model, inputs }) {
  // Calculate Y-axis range for interest rates
  const minRate = Math.min(inputs.domesticRate, inputs.foreignRate);
  const maxRate = Math.max(inputs.domesticRate, inputs.foreignRate);
  const ratePadding = Math.max((maxRate - minRate) * 0.5, 0.5);
  const rateMin = Math.max(0, minRate - ratePadding);
  const rateMax = maxRate + ratePadding;

  // Calculate Y-axis range for exchange rates
  const minExRate = Math.min(inputs.spotRate, model.forwardRate);
  const maxExRate = Math.max(inputs.spotRate, model.forwardRate);
  const exRatePadding = Math.max((maxExRate - minExRate) * 0.3, 0.2);
  const exRateMin = Math.max(0, minExRate - exRatePadding);
  const exRateMax = maxExRate + exRatePadding;

  // Custom label component for domestic rate (renders below the line)
  const DomesticLabel = (props) => {
    const { x, y, value, index } = props;
    if (!value || index !== 0) return null; // Only show label on first point
    
    const centerX = x + 100;
    const labelY = y + 35; // Below the point
    
    return (
      <g>
        {/* Leader line */}
        <line
          x1={centerX}
          y1={labelY - 8}
          x2={x}
          y2={y}
          stroke={COLORS.purple}
          strokeWidth={1}
          opacity={0.7}
          strokeDasharray="2,2"
        />
        {/* Label text */}
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          fill={COLORS.darkText}
          fontSize="11"
          fontWeight="bold"
        >
          Domestic: {value.toFixed(3)}%
        </text>
      </g>
    );
  };

  // Custom label component for foreign rate (renders above the line)
  const ForeignLabel = (props) => {
    const { x, y, value, index } = props;
    if (!value || index !== 0) return null; // Only show label on first point
    
    const centerX = x + 100;
    const labelY = y - 25; // Above the point
    
    return (
      <g>
        {/* Leader line */}
        <line
          x1={centerX}
          y1={labelY + 8}
          x2={x}
          y2={y}
          stroke={COLORS.orange}
          strokeWidth={1}
          opacity={0.7}
          strokeDasharray="2,2"
        />
        {/* Label text */}
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          fill={COLORS.darkText}
          fontSize="11"
          fontWeight="bold"
        >
          Foreign: {value.toFixed(3)}%
        </text>
      </g>
    );
  };

  return (
    <>
      {/* Legends */}
      <div className="mb-4 space-y-2">
        <div className="text-sm text-gray-600 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center">
            <span className="w-4 h-4 mr-2 rounded border-2" style={{backgroundColor: '#00bbff', borderColor: '#06005a'}}></span>
            Spot Rate: {inputs.spotRate.toFixed(4)} (t=0)
          </span>
          <span className="inline-flex items-center">
            <span className="w-4 h-4 mr-2 rounded border-2" style={{backgroundColor: '#50037f', borderColor: '#06005a'}}></span>
            Forward Rate: {model.forwardRate.toFixed(4)} (t=1)
          </span>
        </div>
        <div className="text-xs text-gray-600 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center">
            <span className="w-2 h-2 mr-2 rounded-full" style={{backgroundColor: COLORS.purple}}></span>
            Domestic: {inputs.domesticRate.toFixed(3)}%
          </span>
          <span className="inline-flex items-center">
            <span className="w-2 h-2 mr-2 rounded-full" style={{backgroundColor: COLORS.orange}}></span>
            Foreign: {inputs.foreignRate.toFixed(3)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[450px]" role="img" aria-labelledby="chart-title" aria-describedby="chart-description">
        <div className="sr-only">
          <h3 id="chart-title">Exchange Rate and Interest Rate Data</h3>
          <p id="chart-description">
            Bar chart comparing spot exchange rate (cyan bar with dark blue border at t=0, value {inputs.spotRate.toFixed(4)}) 
            versus forward exchange rate (purple bar with dark blue border at t=1, value {model.forwardRate.toFixed(4)}), 
            alongside domestic interest rate (purple line, {inputs.domesticRate.toFixed(3)}%) and 
            foreign interest rate (orange line, {inputs.foreignRate.toFixed(3)}%).
            {model.forwardRate > inputs.spotRate 
              ? ' The forward rate is higher, indicating the foreign currency is expected to strengthen.'
              : ' The forward rate is lower, indicating the foreign currency is expected to weaken.'}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart data={model.chartData} margin={{ top: 60, right: 120, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" label={{ value: 'Time Periods', position: 'insideBottom', offset: -10 }} />
            <YAxis 
              yAxisId="left"
              label={{ value: 'Exchange Rate', angle: -90, position: 'insideLeft' }}
              domain={[exRateMin, exRateMax]}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              label={{ value: 'Interest Rate', angle: 90, position: 'insideRight',dx: 25 }}
              domain={[rateMin, rateMax]}
              tickFormatter={(value) => `${value.toFixed(2)}%`}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Exchange Rate') return [value.toFixed(4), name];
                if (name.includes('Rate')) return [`${value.toFixed(3)}%`, name];
                return [value, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            
            <Bar yAxisId="left" dataKey="exchangeRate" barSize={60} label={<CustomBarLabel />}>
              <Cell fill="#00bbff" stroke="#06005a" strokeWidth={2} />
              <Cell fill="#50037f" stroke="#06005a" strokeWidth={2} />
            </Bar>
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="domesticRate" 
              stroke={COLORS.purple} 
              strokeWidth={3}
              dot={{ fill: COLORS.purple, strokeWidth: 2, r: 5 }}
              name="Domestic Rate"
              label={<DomesticLabel />}
            />
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="foreignRate" 
              stroke={COLORS.orange} 
              strokeWidth={3}
              dot={{ fill: COLORS.orange, strokeWidth: 2, r: 5 }}
              name="Foreign Rate"
              label={<ForeignLabel />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Educational note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
        <strong>Covered Interest Rate Parity:</strong> The forward rate prevents arbitrage by ensuring both strategies yield identical returns when currency risk is hedged.
      </div>
    </>
  );
}

export default function App() {
  const [inputs, setInputs] = useState({ 
    spotRate: 1.2602,
    domesticRate: 2.360,
    foreignRate: 2.430
  });
  
  const validateInputs = useCallback((inputs) => {
    const errors = {};
    
    if (!inputs.spotRate || inputs.spotRate <= 0) {
      errors.spotRate = "Spot exchange rate must be positive";
    } else if (inputs.spotRate > 10) {
      errors.spotRate = "Spot exchange rate seems unrealistically high";
    }
    
    if (inputs.domesticRate <= -100) {
      errors.domesticRate = "Domestic interest rate must be greater than -100%";
    } else if (inputs.domesticRate > 50) {
      errors.domesticRate = "Domestic interest rate cannot exceed 50%";
    }
    
    if (inputs.foreignRate <= -100) {
      errors.foreignRate = "Foreign interest rate must be greater than -100%";
    } else if (inputs.foreignRate > 50) {
      errors.foreignRate = "Foreign interest rate cannot exceed 50%";
    }
    
    return errors;
  }, []);
  
  const handleInputChange = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: +value }));
  }, []);
  
  const inputErrors = validateInputs(inputs);
  const model = useMemo(() => {
    if (Object.keys(inputErrors).length > 0) return null;
    return calculateForwardExchangeRate(inputs);
  }, [inputs, inputErrors]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <main className="max-w-7xl mx-auto space-y-6">

        {/* RESULTS AND CHART */}
        {model && model.isValid && (
          <>
            {/* MOBILE */}
            <div className="lg:hidden space-y-6">
              <Card title="Results">
                <ResultsSection model={model} inputs={inputs} />
              </Card>
              <Card title="Forward Exchange Rate Analysis">
                <ForwardExchangeChart model={model} inputs={inputs} />
              </Card>
            </div>

            {/* DESKTOP */}
            <div className="hidden lg:grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-1">
                <Card title="Results">
                  <ResultsSection model={model} inputs={inputs} />
                </Card>
              </div>
              <div className="lg:col-span-4">
                <Card title="Forward Exchange Rate Analysis">
                  <ForwardExchangeChart model={model} inputs={inputs} />
                </Card>
              </div>
            </div>
          </>
        )}

        {/* INPUTS */}
        <Card title="Forward Exchange Rate Calculator">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            
            <div className="flex items-center gap-2">
              <label htmlFor="spot-rate" className="font-medium text-gray-700 whitespace-nowrap flex items-center text-sm">
                Spot Exchange Rate
                <span className="text-red-500 ml-1" aria-label="required">*</span>
                <InfoIcon id="spot-rate">Foreign currency per 1 domestic</InfoIcon>
              </label>
              <div className="w-24">
                <input
                  id="spot-rate"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="10"
                  value={inputs.spotRate}
                  onChange={(e) => handleInputChange('spotRate', e.target.value)}
                  className={`block w-full rounded-md shadow-sm px-2 py-2 text-sm ${
                    inputErrors.spotRate ? 'border-red-300' : 'border-gray-300'
                  } focus:border-blue-500 focus:ring-blue-500`}
                  aria-invalid={inputErrors.spotRate ? 'true' : 'false'}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="domestic-rate" className="font-medium text-gray-700 whitespace-nowrap flex items-center text-sm">
                Domestic Rate (%)
                <span className="text-red-500 ml-1" aria-label="required">*</span>
                <InfoIcon id="domestic-rate">Annual rate for domestic currency</InfoIcon>
              </label>
              <div className="w-24">
                <input
                  id="domestic-rate"
                  type="number"
                  step="0.001"
                  min="-99"
                  max="50"
                  value={inputs.domesticRate}
                  onChange={(e) => handleInputChange('domesticRate', e.target.value)}
                  className={`block w-full rounded-md shadow-sm px-2 py-2 text-sm ${
                    inputErrors.domesticRate ? 'border-red-300' : 'border-gray-300'
                  } focus:border-blue-500 focus:ring-blue-500`}
                  aria-invalid={inputErrors.domesticRate ? 'true' : 'false'}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="foreign-rate" className="font-medium text-gray-700 whitespace-nowrap flex items-center text-sm">
                Foreign Rate (%)
                <span className="text-red-500 ml-1" aria-label="required">*</span>
                <InfoIcon id="foreign-rate">Annual rate for foreign currency</InfoIcon>
              </label>
              <div className="w-24">
                <input
                  id="foreign-rate"
                  type="number"
                  step="0.001"
                  min="-99"
                  max="50"
                  value={inputs.foreignRate}
                  onChange={(e) => handleInputChange('foreignRate', e.target.value)}
                  className={`block w-full rounded-md shadow-sm px-2 py-2 text-sm ${
                    inputErrors.foreignRate ? 'border-red-300' : 'border-gray-300'
                  } focus:border-blue-500 focus:ring-blue-500`}
                  aria-invalid={inputErrors.foreignRate ? 'true' : 'false'}
                />
              </div>
            </div>

          </div>
          
          <ValidationMessage errors={inputErrors} />
        </Card>

      </main>
    </div>
  );
}
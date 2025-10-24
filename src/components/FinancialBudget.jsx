import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import {
  BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FaBoxOpen } from 'react-icons/fa';
import './FinancialBudget.css';
import './FinancialBudgetFilter.css';

// --- Filter Data ---
const financialYears = ["2024-2025", "2023-2024", "2022-2023"];
const states = ["RAJASTHAN"];
const districtsByState = {
  RAJASTHAN: [
    "ALWAR", "AJMER", "BANSWARA", "BARAN", "BARMER", "BHARATPUR", "BHILWARA",
    "BIKANER", "BUNDI", "CHITTORGARH", "CHURU", "DAUSA", "DHOLPUR", "DUNGARPUR",
    "HANUMANGARH", "JAIPUR", "JAISALMER", "JALORE", "JHALAWAR", "JHUNJHUNU",
    "JODHPUR", "KARAULI", "KOTA", "NAGAUR", "PALI", "PRATAPGARH", "RAJSAMAND",
    "SAWAI MADHOPUR", "SIKAR", "SIROHI", "SRI GANGANAGAR", "TONK", "UDAIPUR"
  ]
};

// --- Helpers ---
const formatOptions = (items) => items.map(item => ({ value: item, label: item }));

const monthOrder = {
  "April": 1, "May": 2, "June": 3, "July": 4, "Aug": 5, "Sep": 6,
  "Oct": 7, "Nov": 8, "Dec": 9, "Jan": 10, "Feb": 11, "March": 12
};

// --- Main Component ---
const FinancialBudgetPage = () => {
  const [selectedYear, setSelectedYear] = useState(formatOptions(financialYears)[0]);
  const [selectedState, setSelectedState] = useState(formatOptions(states)[0]);
  const [selectedDistrict, setSelectedDistrict] = useState(formatOptions(districtsByState.RAJASTHAN)[0]);

  const [budgetData, setBudgetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- API Fetch ---
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (!selectedYear || !selectedState || !selectedDistrict) return;

      setLoading(true);
      setError(null);
      setBudgetData([]);

      try {
        const url = new URL('http://localhost:5000/api/budget');
        url.searchParams.append('financial_year', selectedYear.value);
        url.searchParams.append('state_name', selectedState.value);
        url.searchParams.append('district_name', selectedDistrict.value);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
          throw new Error("No data found for the selected filters.");
        }

        // Sort data once after fetching
        const sortedData = data.sort((a, b) => monthOrder[a.month] - monthOrder[b.month]);
        setBudgetData(sortedData);

      } catch (e) {
        console.error("Failed to fetch budget data:", e);
        setError('No records are available for the selected filters.');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [selectedYear?.value, selectedState?.value, selectedDistrict?.value]);

  // --- Memoized Data for Charts ---
  const monthlyExpenditureData = useMemo(() => {
    if (!budgetData || budgetData.length === 0) return [];
    return budgetData.map(item => ({
      month: item.month,
      Wages: parseFloat(item.wages) || 0,
      Material: parseFloat(item.material_and_skilled_wages) || 0,
      Admin: parseFloat(item.total_adm_expenditure) || 0,
    }));
  }, [budgetData]);

  const wageRateData = useMemo(() => {
    if (!budgetData || budgetData.length === 0) return [];
    return budgetData.map(item => ({
      month: item.month,
      'Average Wage': parseFloat(item.average_wage_rate_per_day_per_person) || 0,
    }));
  }, [budgetData]);

  // ✅ Fixed: Expenditure % Data for Chart 4
  const expenditurePercentData = useMemo(() => {
    if (!budgetData || budgetData.length === 0) return [];
    return budgetData.map(item => ({
      month: item.month,
      agriPercent: parseFloat(item.percent_of_expenditure_on_agriculture_allied_works) || 0,
      nrmPercent: parseFloat(item.percent_of_nrm_expenditure) || 0,
    }));
  }, [budgetData]);

  // --- Filter Options ---
  const yearOptions = formatOptions(financialYears);
  const stateOptions = formatOptions(states);
  const districtOptions = selectedState ? formatOptions(districtsByState[selectedState.value]) : [];

  const handleStateChange = (selectedOption) => {
    setSelectedState(selectedOption);
    if (selectedOption) {
      const newDistricts = districtsByState[selectedOption.value];
      setSelectedDistrict({ value: newDistricts[0], label: newDistricts[0] });
    } else {
      setSelectedDistrict(null);
    }
  };

  // --- UI Renderer ---
  const renderContent = () => {
    if (loading) {
      return <div className="message-container">Loading data...</div>;
    }
    if (error) {
      return (
        <div className="message-container error-container">
          <FaBoxOpen className="error-icon" />
          <p className="error-message">{error}</p>
        </div>
      );
    }
    if (budgetData.length === 0) {
      return (
        <div className="message-container error-container">
          <FaBoxOpen className="error-icon" />
          <p className="error-message">No data to display for the selected filters.</p>
        </div>
      );
    }

    return (
      <div className="charts-grid">
        {/* Chart 1: Monthly Expenditure */}
        <div className="card chart-card">
          <h3>Monthly Expenditure Breakdown (in ₹ Lakhs)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyExpenditureData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Expenditure (₹ Lakhs)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `${value.toFixed(2)} Lakhs`} />
              <Legend />
              <Bar dataKey="Wages" stackId="a" fill="#27ae60" />
              <Bar dataKey="Material" stackId="a" fill="#3498db" />
              <Bar dataKey="Admin" stackId="a" fill="#e67e22" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Average Wage Rate */}
        <div className="card chart-card">
          <h3>Average Daily Wage Rate (₹)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={wageRateData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Wage Rate (₹)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `₹ ${value.toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="Average Wage" stroke="#ff7300" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ✅ Chart 4: Expenditure Percent */}
        <div className="card chart-card">
          <h3>Expenditure on Work Types (%)</h3>
          <p className="chart-subtitle">Percentage of total YTD spend on key categories.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenditurePercentData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis unit="%" />
              <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              <Legend />
              <Bar dataKey="agriPercent" name="Agriculture" fill="#2ecc71" barSize={20} />
              <Bar dataKey="nrmPercent" name="Natural Resources" fill="#1abc9c" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // --- JSX Return ---
  return (
    <div className="budget-page">
      <header className="dashboard-header">
        <div>
          <h1>Financial Budget Analysis</h1>
          <p>
            Showing monthly expenditure for {selectedDistrict?.label}, {selectedState?.label} | FY {selectedYear?.label}
          </p>
        </div>
        <div className="filters">
          <Select
            className="filter-select-container"
            classNamePrefix="filter-select"
            options={yearOptions}
            value={selectedYear}
            onChange={setSelectedYear}
          />
          <Select
            className="filter-select-container"
            classNamePrefix="filter-select"
            options={stateOptions}
            value={selectedState}
            onChange={handleStateChange}
          />
          <Select
            className="filter-select-container"
            classNamePrefix="filter-select"
            options={districtOptions}
            value={selectedDistrict}
            onChange={setSelectedDistrict}
            isDisabled={!selectedState}
          />
        </div>
      </header>
      <main className="budget-content">{renderContent()}</main>
    </div>
  );
};

export default FinancialBudgetPage;
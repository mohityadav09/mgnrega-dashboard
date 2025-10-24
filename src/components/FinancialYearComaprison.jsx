import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from "recharts";
import { FaBoxOpen,FaSpinner } from "react-icons/fa";
import "./DistrictComparisonPage.css"; // Reusing the same CSS
import "./financialBudgetFilter.css"; // Reusing the same CSS

// --- Static Data ---
const financialYears = ["2024-2025", "2023-2024", "2022-2023"];
const states = ["RAJASTHAN"];
const districtsByState = {
    RAJASTHAN: [
        "ALWAR", "AJMER", "BANSWARA", "BARAN", "BARMER", "BHARATPUR", "BHILWARA",
        "BIKANER", "BUNDI", "CHITTORGARH", "CHURU", "DAUSA", "DHOLPUR", "DUNGARPUR",
        "HANUMANGARH", "JAIPUR", "JAISALMER", "JALORE", "JHALAWAR", "JHUNJHUNU",
        "JODHPUR", "KARAULI", "KOTA", "NAGAUR", "PALI", "PRATAPGARH", "RAJSAMAND",
        "SAWAI MADHOPUR", "SIKAR", "SIROHI", "SRI GANGANAGAR", "TONK", "UDAIPUR",
    ],
};

const formatOptions = (items) => items.map((item) => ({ value: item, label: item }));

// --- Standard month order ---
const orderedMonths = [
    "April", "May", "June", "July", "Aug", "Sep",
    "Oct", "Nov", "Dec", "Jan", "Feb", "March",
];
const monthOrder = Object.fromEntries(orderedMonths.map((m, i) => [m, i + 1]));

// --- Helper function to normalize month names ---
const normalizeMonth = (name = "") => {
    const normalized = name.trim().toLowerCase();
    if (normalized.startsWith("sept")) return "Sep";
    const match = orderedMonths.find((m) => m.toLowerCase().startsWith(normalized));
    return match || name;
};

// --- Helper function to convert cumulative expenditure to monthly ---
const processDistrictData = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const sorted = data
        .map((item) => ({
            month: normalizeMonth(item.month),
            wages: parseFloat(item.wages) || 0,
            material: parseFloat(item.material_and_skilled_wages) || 0,
            admin: parseFloat(item.total_adm_expenditure) || 0,
        }))
        .sort((a, b) => (monthOrder[a.month] || 99) - (monthOrder[b.month] || 99));

    return sorted.map((item, i, arr) => {
        if (i === 0) {
            return { month: item.month, Wages: item.wages, Material: item.material, Admin: item.admin };
        }
        const prev = arr[i - 1];
        return {
            month: item.month,
            Wages: Math.max(0, item.wages - prev.wages),
            Material: Math.max(0, item.material - prev.material),
            Admin: Math.max(0, item.admin - prev.admin),
        };
    });
};

// --- Helper function to process non-cumulative average wage data ---
const processWageData = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data
        .map((item) => ({
            month: normalizeMonth(item.month),
            avgWage: parseFloat(item.average_wage_rate_per_day_per_person) || 0,
        }))
        .sort((a, b) => (monthOrder[a.month] || 99) - (monthOrder[b.month] || 99));
};

// --- Main Component ---
const YearComparisonPage = () => {
    // --- Select Options ---
    const yearOptions = useMemo(() => formatOptions(financialYears), []);
    const stateOptions = useMemo(() => formatOptions(states), []);
    const districtOptions = useMemo(() => formatOptions(districtsByState.RAJASTHAN), []);

    // --- State Management for Filters and Data ---
    const [selectedState, setSelectedState] = useState(stateOptions[0]);
    const [selectedDistrict, setSelectedDistrict] = useState(districtOptions[0]);
    const [selectedYear1, setSelectedYear1] = useState(yearOptions[0]);
    const [selectedYear2, setSelectedYear2] = useState(yearOptions[1]);
    const [comparisonData, setComparisonData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Derived options for the second year dropdown to prevent selecting the same year twice ---
    const year2Options = useMemo(
        () => yearOptions.filter((opt) => opt.value !== selectedYear1?.value),
        [selectedYear1, yearOptions]
    );

    // --- Effect to auto-update the second year if the first year is changed to match it ---
    useEffect(() => {
        if (selectedYear1?.value === selectedYear2?.value) {
            const nextOption = yearOptions.find((opt) => opt.value !== selectedYear1.value);
            setSelectedYear2(nextOption || null);
        }
    }, [selectedYear1, selectedYear2, yearOptions]);

    // --- Data Fetching Effect ---
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchData = async () => {
            if (!selectedState || !selectedDistrict || !selectedYear1 || !selectedYear2) return;
            setLoading(true);
            setError(null);

            try {
                const url = new URL("http://localhost:5000/api/compare-along-financial-years");
                url.searchParams.append("state_name", selectedState.value);
                url.searchParams.append("district_name", selectedDistrict.value);
                url.searchParams.append("financial_year_first", selectedYear1.value);
                url.searchParams.append("financial_year_second", selectedYear2.value);

                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

                const data = await res.json();
                if (!data || data.length === 0) throw new Error("No data found for the selected filters.");

                setComparisonData(data);
            } catch (err) {
                if (err.name !== "AbortError") setError(err.message);
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [selectedState, selectedDistrict, selectedYear1, selectedYear2]);

    // --- Prepare data for Bar Chart ---
    const barChartData = useMemo(() => {
        if (!comparisonData.length) return [];
        const fy1 = selectedYear1.label;
        const fy2 = selectedYear2.label;

        // Filter raw data by financial_year and process it
        const fy1Processed = processDistrictData(comparisonData.filter((x) => x.fin_year === fy1));
        const fy2Processed = processDistrictData(comparisonData.filter((x) => x.fin_year === fy2));

        const merged = {};
        orderedMonths.forEach((m) => { merged[m] = { month: m }; });

        // Merge data for the first financial year
        fy1Processed.forEach((item) => {
            if (merged[item.month]) {
                merged[item.month][`${fy1}_Wages`] = item.Wages;
                merged[item.month][`${fy1}_Material`] = item.Material;
                merged[item.month][`${fy1}_Admin`] = item.Admin;
            }
        });

        // Merge data for the second financial year
        fy2Processed.forEach((item) => {
            if (merged[item.month]) {
                merged[item.month][`${fy2}_Wages`] = item.Wages;
                merged[item.month][`${fy2}_Material`] = item.Material;
                merged[item.month][`${fy2}_Admin`] = item.Admin;
            }
        });
        return Object.values(merged);
    }, [comparisonData, selectedYear1, selectedYear2]);

    // --- Prepare data for Line Chart ---
    // --- Prepare data for Line Chart ---
    const lineChartData = useMemo(() => {
        if (!comparisonData.length) return [];
        const fy1 = selectedYear1.label;
        const fy2 = selectedYear2.label;

        const fy1WageData = processWageData(comparisonData.filter((x) => x.fin_year === fy1));
        const fy2WageData = processWageData(comparisonData.filter((x) => x.fin_year === fy2));

        const merged = {};
        orderedMonths.forEach((m) => { merged[m] = { month: m }; });

        fy1WageData.forEach((item) => {
            if (merged[item.month]) {
                // Use the correct key 'avgWage' from the processed data
                merged[item.month][`${fy1}_AvgWage`] = item.avgWage;
            }
        });
        fy2WageData.forEach((item) => {
            if (merged[item.month]) {
                // Use the correct key 'avgWage' from the processed data
                merged[item.month][`${fy2}_AvgWage`] = item.avgWage;
            }
        });
        return Object.values(merged);
    }, [comparisonData, selectedYear1, selectedYear2]);

    // --- UI Rendering Logic ---
    const renderContent = () => {
        if (loading) {
               return (
                              <div className="message-container">
                                  <FaSpinner className="spinner-icon" />
                                  <p>Loading data...</p>
                              </div>
                          );
            };
        if (error) return (
            <div className="message-container error-container">
                <FaBoxOpen className="error-icon" /> <p>{error}</p>
            </div>
        );
        if (!barChartData.length) return <div className="message-container">No data to display.</div>;

        const fy1 = selectedYear1.label;
        const fy2 = selectedYear2.label;

        return (
            <>
                {/* --- Bar Chart: Monthly Expenditure --- */}
                <div className="card chart-card">
                    <h3>Monthly Expenditure Comparison ({fy1} vs {fy2})</h3>
                    <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" />
                            <YAxis
                                tickFormatter={(v) => `₹${v}`}
                                label={{ value: "Expenditure (₹ Lakhs)", angle: -90, position: "insideLeft", dy: 50 }}
                                allowDecimals={false}
                                domain={[0, "auto"]}
                            />
                            <Tooltip formatter={(v) => `₹${v?.toFixed?.(2)} Lakhs`} />
                            <Legend />
                            {/* Financial Year 1 Bars */}
                            <Bar dataKey={`${fy1}_Wages`} stackId="fy1" name={`Wages (${fy1})`} fill="#1f77b4" />
                            <Bar dataKey={`${fy1}_Material`} stackId="fy1" name={`Material (${fy1})`} fill="#ff7f0e" />
                            <Bar dataKey={`${fy1}_Admin`} stackId="fy1" name={`Admin (${fy1})`} fill="#2ca02c" />
                            {/* Financial Year 2 Bars */}
                            <Bar dataKey={`${fy2}_Wages`} stackId="fy2" name={`Wages (${fy2})`} fill="#d62728" />
                            <Bar dataKey={`${fy2}_Material`} stackId="fy2" name={`Material (${fy2})`} fill="#9467bd" />
                            <Bar dataKey={`${fy2}_Admin`} stackId="fy2" name={`Admin (${fy2})`} fill="#8c564b" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* --- Line Chart: Average Daily Wage --- */}
                <div className="card chart-card" style={{ marginTop: '2rem' }}>
                    <h3>Average Daily Wage Comparison ({fy1} vs {fy2})</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis
                                tickFormatter={(v) => `₹${v}`}
                                label={{ value: "Average Wage (₹)", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip formatter={(v) => `₹${v?.toFixed?.(2)}`} />
                            <Legend />
                            <Line type="monotone" dataKey={`${fy1}_AvgWage`} name={`Avg. Wage (${fy1})`} stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey={`${fy2}_AvgWage`} name={`Avg. Wage (${fy2})`} stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </>
        );
    };

    return (
        <div className="comparison-page">
            <div className="content-wrapper">
                <header className="dashboard-header">
                    <h1>Financial Year Comparison</h1>
                    <p>Compare a district's monthly expenditure and average wages across two financial years.</p>
                </header>

                <div className="card filter-card">
                    <div className="filters-grid">
                        <div className="filter-select-container">
                            <Select
                                options={stateOptions}
                                value={selectedState}
                                onChange={setSelectedState}
                                isDisabled
                                classNamePrefix="filter-select"
                            />
                        </div>
                        <div className="filter-select-container">
                            <Select
                                options={districtOptions}
                                value={selectedDistrict}
                                onChange={setSelectedDistrict}
                                classNamePrefix="filter-select"
                            />
                        </div>
                        <div className="filter-select-container">
                            <Select
                                options={yearOptions}
                                value={selectedYear1}
                                onChange={setSelectedYear1}
                                classNamePrefix="filter-select"
                            />
                        </div>
                        <div className="filter-select-container">
                            <Select
                                options={year2Options}
                                value={selectedYear2}
                                onChange={setSelectedYear2}
                                classNamePrefix="filter-select"
                            />
                        </div>
                    </div>
                </div>

                <main className="comparison-content">{renderContent()}</main>
            </div>
        </div>
    );
};

export default YearComparisonPage;
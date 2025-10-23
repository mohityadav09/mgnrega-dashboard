import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { FaBoxOpen } from "react-icons/fa";
import "./DistrictComparisonPage.css";
import "./financialBudgetFilter.css";

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

// --- Standard month order (uniform names) ---
const orderedMonths = [
    "April", "May", "June", "July", "Aug", "Sep",
    "Oct", "Nov", "Dec", "Jan", "Feb", "March",
];

const monthOrder = Object.fromEntries(orderedMonths.map((m, i) => [m, i + 1]));

// --- Normalize month names ---
const normalizeMonth = (name = "") => {
    const normalized = name.trim().toLowerCase();
    // Handle 'Sept' abbreviation
    if (normalized.startsWith("sept")) return "Sep";
    const match = orderedMonths.find((m) => m.toLowerCase().startsWith(normalized));
    return match || name;
};

// --- Convert cumulative to monthly ---
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

// --- Main Component ---
const DistrictComparisonPage = () => {
    const yearOptions = useMemo(() => formatOptions(financialYears), []);
    const stateOptions = useMemo(() => formatOptions(states), []);
    const districtOptions = useMemo(() => formatOptions(districtsByState.RAJASTHAN), []);

    const [selectedYear, setSelectedYear] = useState(yearOptions[0]);
    const [selectedState, setSelectedState] = useState(stateOptions[0]);
    const [selectedDistrict1, setSelectedDistrict1] = useState(districtOptions[0]);
    const [selectedDistrict2, setSelectedDistrict2] = useState(districtOptions[1]);
    const [comparisonData, setComparisonData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const district2Options = useMemo(
        () => districtOptions.filter((opt) => opt.value !== selectedDistrict1?.value),
        [selectedDistrict1, districtOptions]
    );

    useEffect(() => {
        if (selectedDistrict1?.value === selectedDistrict2?.value) {
            const nextOption = districtOptions.find((opt) => opt.value !== selectedDistrict1.value);
            setSelectedDistrict2(nextOption || null);
        }
    }, [selectedDistrict1, selectedDistrict2, districtOptions]);

    // --- Fetch Data ---
    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const fetchData = async () => {
            if (!selectedYear || !selectedState || !selectedDistrict1 || !selectedDistrict2) return;
            setLoading(true);
            setError(null);

            try {
                const url = new URL("http://localhost:5000/api/compare-districts");
                url.searchParams.append("financial_year", selectedYear.value);
                url.searchParams.append("state_name", selectedState.value);
                url.searchParams.append("district_name_first", selectedDistrict1.value);
                url.searchParams.append("district_name_second", selectedDistrict2.value);

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
    }, [selectedYear, selectedState, selectedDistrict1, selectedDistrict2]);

    // --- Merge and Fill Missing Months ---
    const chartData = useMemo(() => {
        if (!comparisonData.length) return [];

        const d1 = selectedDistrict1.label;
        const d2 = selectedDistrict2.label;

        const d1Processed = processDistrictData(comparisonData.filter((x) => x.district_name === d1));
        const d2Processed = processDistrictData(comparisonData.filter((x) => x.district_name === d2));

        const merged = {};

        orderedMonths.forEach((m) => {
            merged[m] = { month: m };
        });

        d1Processed.forEach((item) => {
            if (merged[item.month]) {
                merged[item.month][`${d1}_Wages`] = item.Wages;
                merged[item.month][`${d1}_Material`] = item.Material;
                merged[item.month][`${d1}_Admin`] = item.Admin;
            }
        });

        d2Processed.forEach((item) => {
            if (merged[item.month]) {
                merged[item.month][`${d2}_Wages`] = item.Wages;
                merged[item.month][`${d2}_Material`] = item.Material;
                merged[item.month][`${d2}_Admin`] = item.Admin;
            }
        });

        return Object.values(merged);
    }, [comparisonData, selectedDistrict1, selectedDistrict2]);

    // --- Render UI ---
    const renderContent = () => {
        if (loading) return <div className="message-container">Loading...</div>;
        if (error)
            return (
                <div className="message-container error-container">
                    <FaBoxOpen className="error-icon" />
                    <p>{error}</p>
                </div>
            );
        if (!chartData.length) return <div className="message-container">No data.</div>;

        const d1 = selectedDistrict1.label;
        const d2 = selectedDistrict2.label;

        return (
            <div className="card chart-card">
                <h3>Monthly Expenditure Comparison ({d1} vs {d2})</h3>
                <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis
                            tickFormatter={(v) => `₹${v}`}
                            label={{
                                value: "Expenditure (₹ Lakhs)",
                                angle: -90,
                                position: "insideLeft",
                                dy: 50,
                            }}
                            allowDecimals={false}
                            domain={[0, "auto"]}
                        />
                        <Tooltip formatter={(v) => `₹${v?.toFixed?.(2)} Lakhs`} />
                        <Legend />

                        {/* District 1 - three distinct colors */}
                        <Bar dataKey={`${d1}_Wages`} stackId="d1" name={`Wages (${d1})`} fill="#1f77b4" />    // Blue
                        <Bar dataKey={`${d1}_Material`} stackId="d1" name={`Material (${d1})`} fill="#ff7f0e" /> // Orange
                        <Bar dataKey={`${d1}_Admin`} stackId="d1" name={`Admin (${d1})`} fill="#2ca02c" />      // Green

                        {/* District 2 - three distinct colors */}
                        <Bar dataKey={`${d2}_Wages`} stackId="d2" name={`Wages (${d2})`} fill="#d62728" />      // Red
                        <Bar dataKey={`${d2}_Material`} stackId="d2" name={`Material (${d2})`} fill="#9467bd" /> // Purple
                        <Bar dataKey={`${d2}_Admin`} stackId="d2" name={`Admin (${d2})`} fill="#8c564b" />      // Brown

                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="comparison-page">
            {/* --- ADDED THIS WRAPPER --- */}
            <div className="content-wrapper">
                <header className="dashboard-header">
                    <h1>District-wise Comparison</h1>
                    <p>Compare two districts' monthly expenditure side-by-side.</p>
                </header>

                <div className="card filter-card">
                    <div className="filters-grid">
                        <div className="filter-select-container">
                            <Select
                                options={yearOptions}
                                value={selectedYear}
                                onChange={setSelectedYear}
                                classNamePrefix="filter-select"
                            />
                        </div>
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
                                value={selectedDistrict1}
                                onChange={setSelectedDistrict1}
                                classNamePrefix="filter-select"
                            />
                        </div>
                        <div className="filter-select-container">
                            <Select
                                options={district2Options}
                                value={selectedDistrict2}
                                onChange={setSelectedDistrict2}
                                classNamePrefix="filter-select"
                            />
                        </div>
                    </div>
                </div>

                <main className="comparison-content">{renderContent()}</main>

                {/* --- ADDED THIS CLOSING DIV --- */}
            </div>
        </div>
    );
};

export default DistrictComparisonPage;


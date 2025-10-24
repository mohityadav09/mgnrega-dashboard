import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from "recharts";
import { FaSpinner, FaBoxOpen } from "react-icons/fa";
import "./ParticipationStats.css"; // We'll create this CSS file

// --- Static Data ---
// Added data from your new example
const financialYears = ["2024-2025", "2023-2024", "2022-2023", "2020-2021"];
const states = ["RAJASTHAN", "ASSAM"];
const districtsByState = {
    RAJASTHAN: [
        "ALWAR", "AJMER", "BANSWARA", "BARAN", "BARMER", "BHARATPUR", "BHILWARA",
        "BIKANER", "BUNDI", "CHITTORGARH", "CHURU", "DAUSA", "DHOLPUR", "DUNGARPUR",
        "HANUMANGARH", "JAIPUR", "JAISALMER", "JALORE", "JHALAWAR", "JHUNJHUNU",
        "JODHPUR", "KARAULI", "KOTA", "NAGAUR", "PALI", "PRATAPGARH", "RAJSAMAND",
        "SAWAI MADHOPUR", "SIKAR", "SIROHI", "SRI GANGANAGAR", "TONK", "UDAIPUR",
    ],
    ASSAM: [
        "Morigaon", "Kamrup", "Dibrugarh", "Jorhat", "Nagaon", "Cachar", "Barpeta"
    ]
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
    // Find the full month name from our ordered list
    const match = orderedMonths.find((m) => m.toLowerCase().startsWith(normalized));
    return match || name;
};

/**
 * Processes cumulative participation data into monthly (non-cumulative) data.
 * Assumes the API returns data that is cumulative month-over-month.
 */
const processParticipationData = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const sorted = data
        .map(item => ({
            month: normalizeMonth(item.month),
            households: parseFloat(item.total_households_worked) || 0,
            individuals: parseFloat(item.total_individuals_worked) || 0,
            women_pd: parseFloat(item.women_persondays) || 0,
            sc_pd: parseFloat(item.sc_persondays) || 0,
            st_pd: parseFloat(item.st_persondays) || 0,
            disabled: parseFloat(item.differently_abled_persons_worked) || 0,
        }))
        .sort((a, b) => (monthOrder[a.month] || 99) - (monthOrder[b.month] || 99));

    // Calculate monthly differences from the cumulative totals
    return sorted.map((item, i, arr) => {
        if (i === 0) {
            // For the first month, assume the value is just for that month
            return item;
        }
        const prev = arr[i - 1];
        return {
            month: item.month,
            households: Math.max(0, item.households - prev.households),
            individuals: Math.max(0, item.individuals - prev.individuals),
            women_pd: Math.max(0, item.women_pd - prev.women_pd),
            sc_pd: Math.max(0, item.sc_pd - prev.sc_pd),
            st_pd: Math.max(0, item.st_pd - prev.st_pd),
            disabled: Math.max(0, item.disabled - prev.disabled),
        };
    }).filter(item => monthOrder[item.month]); // Ensure only valid, ordered months are included
};

// --- Main Component ---
const ParticipationStatsPage = () => {
    // --- Select Options ---
    const yearOptions = useMemo(() => formatOptions(financialYears), []);
    const stateOptions = useMemo(() => formatOptions(states), []);

    // --- State Management for Filters and Data ---
    const [selectedYear, setSelectedYear] = useState(yearOptions[0]);
    const [selectedState, setSelectedState] = useState(stateOptions[0]);
    const [selectedDistrict, setSelectedDistrict] = useState(
        formatOptions(districtsByState[stateOptions[0].value])[0]
    );

    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Derived district options based on selected state ---
    const districtOptions = useMemo(() => {
        if (!selectedState) return [];
        return formatOptions(districtsByState[selectedState.value] || []);
    }, [selectedState]);

    // --- Effect to reset district when state changes ---
    useEffect(() => {
        if (selectedState && districtsByState[selectedState.value]) {
            const firstDistrict = formatOptions(districtsByState[selectedState.value])[0];
            setSelectedDistrict(firstDistrict);
        }
    }, [selectedState]);

    // --- Data Fetching Effect ---
    useEffect(() => {
        if (!selectedYear || !selectedState || !selectedDistrict) return;

        const controller = new AbortController();
        const { signal } = controller;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setMonthlyData([]);

            try {
                const url = new URL('http://localhost:5000/api/budget');
                url.searchParams.append('financial_year', selectedYear.value);
                url.searchParams.append('state_name', selectedState.value);
                url.searchParams.append('district_name', selectedDistrict.value);

                const res = await fetch(url.toString(), { signal });
                if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);

                const data = await res.json();
                if (!data || data.length === 0) {
                    throw new Error("No data found for the selected filters.");
                }

                // Process the data to get monthly (non-cumulative) figures
                const processedData = processParticipationData(data);
                setMonthlyData(processedData);

            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Fetch error:", err);
                    setError(err.message);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => controller.abort(); // Cleanup on unmount or filter change
    }, [selectedYear, selectedState, selectedDistrict]);

    // --- UI Rendering Logic ---
    const renderContent = () => {
        if (loading) {
            return (
                <div className="message-container">
                    <FaSpinner className="spinner-icon" />
                    <p>Loading participation data...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="message-container error-container">
                    <FaBoxOpen className="error-icon" />
                    <p>{error}</p>
                </div>
            );
        }
        if (monthlyData.length === 0) {
            return (
                <div className="message-container">
                    <p>No data to display. Please check your filters.</p>
                </div>
            );
        }

        return (
            <div className="charts-grid">
                {/* --- Chart 1: Monthly Individuals vs Households Worked --- */}
                <div className="card chart-card">
                    <h3>Monthly Participation (Individuals vs. Households)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="individuals" name="Individuals Worked" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="households" name="Households Worked" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* --- Chart 2: Demographic Persondays (Stacked Bar) --- */}
                <div className="card chart-card">
                    <h3>Monthly Persondays by Demographic</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: "Persondays", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="women_pd" stackId="a" name="Women Persondays" fill="#ff7f0e" />
                            <Bar dataKey="sc_pd" stackId="a" name="SC Persondays" fill="#1f77b4" />
                            <Bar dataKey="st_pd" stackId="a" name="ST Persondays" fill="#2ca02c" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* --- Chart 3: Differently Abled Persons Worked --- */}
                <div className="card chart-card">
                    <h3>Monthly Differently-Abled Persons Worked</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: "Persons", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="disabled" name="Differently-Abled Persons" fill="#d62728" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="participation-page">
            <header className="dashboard-header">
                <h1>Monthly Participation Statistics</h1>
                <p>Analyze participation trends for {selectedDistrict?.label || '...'} in {selectedYear?.label || '...'}</p>
            </header>

            {/* --- Filters Card --- */}
            <div className="card filter-card">
                <div className="filters-grid">
                    <div className="filter-select-container">
                        <label>Financial Year</label>
                        <Select
                            options={yearOptions}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            classNamePrefix="filter-select"
                        />
                    </div>
                    <div className="filter-select-container">
                        <label>State</label>
                        <Select
                            options={stateOptions}
                            value={selectedState}
                            onChange={setSelectedState}
                            classNamePrefix="filter-select"
                        />
                    </div>
                    <div className="filter-select-container">
                        <label>District</label>
                        <Select
                            options={districtOptions}
                            value={selectedDistrict}
                            onChange={setSelectedDistrict}
                            classNamePrefix="filter-select"
                            isDisabled={!selectedState}
                        />
                    </div>
                </div>
            </div>

            {/* --- Charts Content --- */}
            <main className="participation-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default ParticipationStatsPage;

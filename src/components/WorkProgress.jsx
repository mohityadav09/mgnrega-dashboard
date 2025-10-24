import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from "recharts";
import { FaSpinner, FaBoxOpen } from "react-icons/fa";
import "./WorkProgressPage.css"; 

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
    const match = orderedMonths.find((m) => m.toLowerCase().startsWith(normalized));
    return match || name;
};

/**
 * Processes cumulative work data to get both cumulative and monthly figures.
 */
const processWorkData = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const sorted = data
        .map(item => ({
            month: normalizeMonth(item.month),
            totalTakenUp: parseInt(item.total_no_of_works_takenup, 10) || 0,
            ongoing: parseInt(item.number_of_ongoing_works, 10) || 0,
            completed: parseInt(item.number_of_completed_works, 10) || 0,
        }))
        .sort((a, b) => (monthOrder[a.month] || 99) - (monthOrder[b.month] || 99));

    // Calculate monthly differences from the cumulative totals
    return sorted.map((item, i, arr) => {
        if (i === 0) {
            return {
                ...item,
                newWorksStarted: item.totalTakenUp,
                newWorksCompleted: item.completed,
            };
        }
        const prev = arr[i - 1];
        return {
            ...item,
            newWorksStarted: Math.max(0, item.totalTakenUp - prev.totalTakenUp),
            newWorksCompleted: Math.max(0, item.completed - prev.completed),
        };
    }).filter(item => monthOrder[item.month]);
};


// --- Main Component ---
const WorkProgressPage = () => {
    // --- State Management for Filters and Data ---
    const [selectedYear, setSelectedYear] = useState(formatOptions(financialYears)[0]);
    const [selectedState, setSelectedState] = useState(formatOptions(states)[0]);
    const [selectedDistrict, setSelectedDistrict] = useState(
        formatOptions(districtsByState[states[0]])[0]
    );

    const [workData, setWorkData] = useState([]);
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
            setWorkData([]);

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

                const processedData = processWorkData(data);
                setWorkData(processedData);

            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => controller.abort();
    }, [selectedYear, selectedState, selectedDistrict]);

    // --- UI Rendering Logic ---
    const renderContent = () => {
        if (loading) {
            return (
                <div className="message-container">
                    <FaSpinner className="spinner-icon" />
                    <p>Loading data...</p>
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
        if (workData.length === 0) {
            return <div className="message-container"><p>No data to display.</p></div>;
        }

        return (
            <div className="charts-grid">
                {/* --- Chart 1: Cumulative Work Status --- */}
                <div className="card chart-card">
                    <h3>Cumulative Work Status</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={workData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: "Number of Works", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="totalTakenUp" name="Total Taken Up" stroke="#2563eb" fill="#bfdbfe" />
                            <Area type="monotone" dataKey="ongoing" name="Ongoing" stroke="#f59e0b" fill="#fef3c7" />
                            <Area type="monotone" dataKey="completed" name="Completed" stroke="#16a34a" fill="#dcfce7" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* --- Chart 2: Monthly Work Progress --- */}
                <div className="card chart-card">
                    <h3>Monthly Work Progress (New & Completed)</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={workData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: "Number of Works", angle: -90, position: "insideLeft" }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="newWorksStarted" name="New Works Started" fill="#3b82f6" />
                            <Bar dataKey="newWorksCompleted" name="Works Completed" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="work-progress-page">
            <header className="dashboard-header">
                <h1>Monthly Work Progress</h1>
                <p>Analyze work completion trends for {selectedDistrict?.label || '...'} in {selectedYear?.label || '...'}</p>
            </header>

            <div className="card filter-card">
                <div className="filters-grid">
                    <div className="filter-select-container">
                        <label>Financial Year</label>
                        <Select
                            options={formatOptions(financialYears)}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            classNamePrefix="filter-select"
                        />
                    </div>
                    <div className="filter-select-container">
                        <label>State</label>
                        <Select
                            options={formatOptions(states)}
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

            <main className="work-progress-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default WorkProgressPage;
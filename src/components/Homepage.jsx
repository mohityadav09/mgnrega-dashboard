import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell, Sector
} from 'recharts';
// UPDATE: Imported new icons for additional KPI cards
import { 
    FaUsers, FaCalendarAlt, FaRupeeSign, FaCheckCircle, FaBoxOpen, 
    FaUserFriends, FaWalking, FaTrophy, FaWallet, FaClipboardList ,
    FaSpinner
} from 'react-icons/fa';
import './Homepage.css';
import './Filters.css';

// --- Helper Functions ---

const formatNumber = (num, isCurrency = false) => {
    if (num === null || num === undefined || isNaN(num)) return isCurrency ? '₹ 0' : '0';
    const prefix = isCurrency ? '₹ ' : '';
    if (num >= 10000000) {
        return `${prefix}${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
        return `${prefix}${(num / 100000).toFixed(2)} Lakh`;
    }
    return `${prefix}${num.toLocaleString('en-IN')}`;
};

// --- Initial Filter Data ---
const financialYears = ["2024-2025", "2023-2024", "2022-2023"];
const months = ["April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "March"];
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

const formatOptions = (items) => items.map(item => ({ value: item, label: item }));

// --- Main Homepage Component ---
const Homepage = () => {
    const [selectedYear, setSelectedYear] = useState(formatOptions(financialYears)[0]);
    const [selectedState, setSelectedState] = useState(formatOptions(states)[0]);
    const [selectedDistrict, setSelectedDistrict] = useState(formatOptions(districtsByState.RAJASTHAN)[0]);
    const [selectedMonth, setSelectedMonth] = useState(formatOptions(months)[0]);
    
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedYear || !selectedState || !selectedDistrict || !selectedMonth) {
                return;
            }

            setLoading(true);
            setError(null);
            setDashboardData(null); 
            
            try {
                const url = new URL('http://localhost:5000/api/home');
                url.searchParams.append('financial_year', selectedYear.value);
                url.searchParams.append('state_name', selectedState.value);
                url.searchParams.append('district_name', selectedDistrict.value);
                url.searchParams.append('month', selectedMonth.value);
            
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data = await response.json();

                if (Object.keys(data).length === 0) {
                    throw new Error("No data found for this selection.");
                }

                setDashboardData(data);
                
            } catch (e) {
                console.error("Failed to fetch dashboard data:", e);
                setError('No records are available for the selected filters.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedYear, selectedState, selectedDistrict, selectedMonth]);

    // UPDATE: Expanded the kpiData hook to include more cards
    const kpiData = useMemo(() => {
        if (!dashboardData) return [];
        const totalExpInRupees = parseFloat(dashboardData.total_exp) * 100000;

        return [
            { title: 'Households Worked', value: formatNumber(dashboardData.total_households_worked), icon: <FaUsers /> },
            { title: 'Individuals Worked', value: formatNumber(dashboardData.total_individuals_worked), icon: <FaUserFriends /> },
            { title: 'Total Active Workers', value: formatNumber(dashboardData.total_no_of_active_workers), icon: <FaWalking /> },
            { title: 'Avg. Employment / HH', value: `${dashboardData.average_days_of_employment_provided_per_household || 0} Days`, icon: <FaCalendarAlt /> },
            { title: 'HHs Completed 100 Days', value: formatNumber(dashboardData.total_no_of_hhs_completed_100_days_of_wage_employment), icon: <FaTrophy /> },
            { title: 'Avg. Daily Wage', value: formatNumber(parseFloat(dashboardData.average_wage_rate_per_day_per_person).toFixed(2), true), icon: <FaWallet /> },
            { title: 'Total Expenditure', value: formatNumber(totalExpInRupees, true), icon: <FaRupeeSign /> },
            { title: 'Total Works Initiated', value: formatNumber(dashboardData.total_no_of_works_takenup), icon: <FaClipboardList /> },
            // You can uncomment the line below to add On-Time Payments back if the data is available
            // { title: 'On-Time Payments', value: `${dashboardData.percentage_payments_generated_within_15_days || 'N/A'}%`, icon: <FaCheckCircle /> }
        ];
    }, [dashboardData]);

    const workStatusData = useMemo(() => {
        if (!dashboardData) return [];
        return [
            { name: 'Ongoing', value: dashboardData.number_of_ongoing_works || 0, color: '#f39c12' },
            { name: 'Completed', value: dashboardData.number_of_completed_works || 0, color: '#27ae60' }
        ];
    }, [dashboardData]);

    const demographicsData = useMemo(() => {
        if (!dashboardData) return [];
        
        const total = parseFloat(dashboardData.persondays_of_central_liability_so_far);
        if (isNaN(total) || total === 0) return [];

        const women = parseFloat(dashboardData.women_persondays) || 0;
        const sc = parseFloat(dashboardData.sc_persondays) || 0;
        const st = parseFloat(dashboardData.st_persondays) || 0;
        
        const womenPct = (women / total * 100);
        const scPct = (sc / total * 100);
        const stPct = (st / total * 100);
        const othersPct = 100 - (womenPct + scPct + stPct);

        return [{
            name: 'Demographics',
            Women: womenPct.toFixed(1),
            SC: scPct.toFixed(1),
            ST: stPct.toFixed(1),
            Others: othersPct > 0 ? othersPct.toFixed(1) : '0.0',
        }];
    }, [dashboardData]);
    
    const expenditureData = useMemo(() => {
        if (!dashboardData) return [];
        return [
            { name: 'Wages', value: parseFloat(dashboardData.wages) || 0 },
            { name: 'Material & Skilled', value: parseFloat(dashboardData.material_and_skilled_wages) || 0 },
            { name: 'Admin', value: parseFloat(dashboardData.total_adm_expenditure) || 0 },
        ];
    }, [dashboardData]);
    const EXPENDITURE_COLORS = ['#27ae60', '#3498db', '#e67e22'];

    const workCategoryData = useMemo(() => {
        if (!dashboardData) return [];
        return [
            { category: 'NRM (Natural Resource Management)', value: `${dashboardData.percent_of_nrm_expenditure || 0}%` },
            { category: 'Agriculture & Allied Works', value: `${dashboardData.percent_of_expenditure_on_agriculture_allied_works || 0}%` },
            { category: 'Category B Works', value: `${dashboardData.percent_of_category_b_works || 0}%` },
        ];
    }, [dashboardData]);


    const yearOptions = formatOptions(financialYears);
    const monthOptions = formatOptions(months);
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
                    <p className="error-message">{error}</p>
                </div>
            );
        }

        if (!dashboardData) {
             return (
                <div className="message-container error-container">
                    <FaBoxOpen className="error-icon" />
                    <p className="error-message">No records found. Please try different filters.</p>
                </div>
            );
        }

        return (
            <>
                {/* KPI Cards */}
                <section className="kpi-grid">
                    {kpiData.map((kpi, index) => (
                        <div key={index} className="card kpi-card">
                            <div className="kpi-icon">{kpi.icon}</div>
                            <div className="kpi-value">{kpi.value}</div>
                            <div className="kpi-title">{kpi.title}</div>
                        </div>
                    ))}
                </section>

                {/* (The rest of your JSX for charts and tables goes here unchanged) */}
                <section className="breakdown-charts-grid">
                    <div className="card">
                        <h3>Work Status</h3>
                        <ResponsiveContainer width="100%" height={300}>
                           <BarChart data={workStatusData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip formatter={(value) => value.toLocaleString('en-IN')}/>
                                <Bar dataKey="value" barSize={30}>
                                   {workStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                   ))}
                                </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <h3>How Funds Are Utilized (in ₹ Lakhs)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={expenditureData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" label>
                                    {expenditureData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={EXPENDITURE_COLORS[index % EXPENDITURE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(2)} Lakhs`}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </section>
                 <section className="main-visuals-grid">
                    <div className="card">
                        <h3>Workforce Demographics (% Person-days)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={demographicsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" unit="%" domain={[0, 100]} />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Women" stackId="a" fill="#27ae60" />
                                <Bar dataKey="SC" stackId="a" fill="#1abc9c" />
                                <Bar dataKey="ST" stackId="a" fill="#f39c12" />
                                <Bar dataKey="Others" stackId="a" fill="#bdc3c7" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <h3>Work Category Expenditure</h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Work Category</th>
                                        <th>% of Total Expenditure</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workCategoryData.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row.category}</td>
                                            <td>{row.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </>
        );
    };

    return (
        <div className="homepage">
            <header className="dashboard-header">
                <div>
                    <h1>MGNREGA Performance Dashboard</h1>
                    <p>
                        {selectedDistrict?.label}, {selectedState?.label} | FY {selectedYear?.label} {selectedMonth?.value !== 'All' ? `| ${selectedMonth.label}` : ''}
                    </p>
                </div>
                
                <div className="filters">
                    <Select
                        className="filter-select-container" classNamePrefix="filter-select"
                        options={yearOptions} value={selectedYear} onChange={setSelectedYear}
                    />
                    <Select
                        className="filter-select-container" classNamePrefix="filter-select"
                        options={monthOptions} value={selectedMonth} onChange={setSelectedMonth}
                    />
                    <Select
                        className="filter-select-container" classNamePrefix="filter-select"
                        options={stateOptions} value={selectedState} onChange={handleStateChange}
                    />
                    <Select
                        className="filter-select-container" classNamePrefix="filter-select"
                        options={districtOptions} value={selectedDistrict} onChange={setSelectedDistrict}
                        isDisabled={!selectedState}
                    />
                </div>
            </header>
            
            {renderContent()}

        </div>
    );
};

export default Homepage;
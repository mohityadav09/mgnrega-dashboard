import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './components/Navbar.css';
import Homepage from './components/Homepage';
import FinancialBudgetPage from './components/FinancialBudget';
import DistrictComparisonPage from './components/DistrictComparisonPage';
import YearComparisonPage from './components/FinancialYearComaprison';
import ParticipationStatsPage from './components/ParticipationStats'
import WorkProgressPage from './components/WorkProgress';
 

function App() {
  return (
    <BrowserRouter>
      <div className="dashboard-layout">
        {/* Sidebar always visible */}
        <Sidebar />

        {/* Page content changes based on route */}
        <main className="content-area">
          <Routes>
            {/* Homepage route */}
            <Route path="/" element={<Homepage />} />

            {/* Correct route for Financial Budget Page */}
            <Route path="/single-view" element={<FinancialBudgetPage />} />

            <Route path="/compare-districts" element={<DistrictComparisonPage />} />

            <Route path="/compare-financial-years" element={< YearComparisonPage/>} />
            <Route path="/participation" element={< ParticipationStatsPage/>} />
            <Route path="/work-status" element={< WorkProgressPage/>} />

           

            {/* Optional: Not Found page */}
            {/* <Route path="*" element={<div>404 - Page Not Found</div>} /> */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

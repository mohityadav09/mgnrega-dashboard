import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './components/Navbar.css';
import Homepage from './components/Homepage';
import FinancialBudgetPage from './components/FinancialBudget';
import DistrictComparisonPage from './components/DistrictComparisonPage';
 

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

            {/* Optional: Not Found page */}
            {/* <Route path="*" element={<div>404 - Page Not Found</div>} /> */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

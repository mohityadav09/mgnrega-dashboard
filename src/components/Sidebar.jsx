// src/components/Sidebar.js

import React from 'react';
import { Link } from 'react-router-dom';  // ✅ Import Link for client-side routing
import { 
  FaTachometerAlt, FaMoneyBillWave, FaUsers, 
  FaBuilding, FaFlag, FaQuestionCircle, FaChartBar 
} from 'react-icons/fa';
import './Navbar.css';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      {/* --- Header Section --- */}
      <div className="sidebar-header">
        <FaChartBar className="logo-icon" />
        <h1 className="sidebar-title">MGNREGA Dashboard</h1>
      </div>

      {/* --- Main Menu --- */}
      <ul className="sidebar-menu">

        {/* Overview */}
        <li>
          <Link to="/" className="sidebar-link">
            <FaTachometerAlt />
            <span>Overview</span>
          </Link>
        </li>

        {/* Financials Section */}
        <details className="collapsible-section">
          <summary className="sidebar-link">
            <FaMoneyBillWave />
            <span>Financials</span>
          </summary>
          <ul className="submenu">
            <li>
              <Link to="/single-view">Single View Analysis</Link>
            </li>
            <li>
              <Link to="/compare-districts">Compare along districts</Link>
            </li>
            <li>
              <Link to="/compare-financial-years">Compare along financial years</Link>
            </li>
          </ul>
        </details>

        {/* Workforce Section */}
        <details className="collapsible-section">
          <summary className="sidebar-link">
            <FaUsers />
            <span>Workforce</span>
          </summary>
          <ul className="submenu">
            <li>
              <Link to="/participation">Participation Stats & Demographics</Link>
            </li>
            
          </ul>
        </details>

         {/* Project Insights Section */}
        <details className="collapsible-section">
          <summary className="sidebar-link">
            <FaBuilding />
            <span>Project Insights</span>
          </summary>
          <ul className="submenu">
            <li>
              <Link to="/work-status">Work Status</Link>
            </li>
            {/* <li>
              <Link to="/asset-types">Asset Types</Link>
            </li> */}
          </ul>
        </details> 

        {/* Analysis Section */}
        {/* <details className="collapsible-section">
          <summary className="sidebar-link">
            <FaFlag />
            <span>Analysis</span>
          </summary>
          <ul className="submenu">
            <li>
              <Link to="/comparison">State/District Comparison</Link>
            </li>
            <li>
              <Link to="/red-flags">Problem Areas</Link>
            </li>
          </ul>
        </details> */} 
      </ul>

      {/* --- Footer Section --- */}
      <div className="sidebar-footer">
        <Link to="/about" className="sidebar-link">
          <FaQuestionCircle />
          <span>About This Data</span>
        </Link>
      </div>
    </nav>
  );
};

export default Sidebar;
